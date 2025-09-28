import { PrismaClient } from '@prisma/client'

export interface QueryPerformanceMetrics {
  query: string
  executionTime: number
  timestamp: Date
  rowsAffected?: number
  error?: string
}

export interface DatabaseStats {
  tableStats: Array<{
    tableName: string
    rowCount: number
    sizeBytes: number
    indexSize: number
  }>
  slowQueries: QueryPerformanceMetrics[]
  connectionPool: {
    active: number
    idle: number
    total: number
  }
  cacheHitRatio: number
}

export class PerformanceMonitor {
  private queryMetrics: QueryPerformanceMetrics[] = []
  private readonly MAX_METRICS = 1000
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second

  /**
   * Track query performance
   */
  trackQuery(query: string, executionTime: number, rowsAffected?: number, error?: string): void {
    const metric: QueryPerformanceMetrics = {
      query: this.sanitizeQuery(query),
      executionTime,
      timestamp: new Date(),
      rowsAffected,
      error
    }

    this.queryMetrics.push(metric)

    // Keep only the most recent metrics
    if (this.queryMetrics.length > this.MAX_METRICS) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS)
    }

    // Log slow queries
    if (executionTime > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow query detected (${executionTime}ms):`, query)
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalQueries: number
    averageExecutionTime: number
    slowQueries: QueryPerformanceMetrics[]
    errorRate: number
    queriesPerMinute: number
  } {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000

    const recentMetrics = this.queryMetrics.filter(
      m => m.timestamp.getTime() > oneMinuteAgo
    )

    const slowQueries = this.queryMetrics.filter(
      m => m.executionTime > this.SLOW_QUERY_THRESHOLD
    )

    const queriesWithErrors = this.queryMetrics.filter(m => m.error)

    const totalExecutionTime = this.queryMetrics.reduce(
      (sum, m) => sum + m.executionTime, 0
    )

    return {
      totalQueries: this.queryMetrics.length,
      averageExecutionTime: this.queryMetrics.length > 0
        ? totalExecutionTime / this.queryMetrics.length
        : 0,
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
      errorRate: this.queryMetrics.length > 0
        ? (queriesWithErrors.length / this.queryMetrics.length) * 100
        : 0,
      queriesPerMinute: recentMetrics.length
    }
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.queryMetrics = []
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/VALUES\s*\([^)]*\)/gi, 'VALUES (...)')
      .replace(/=\s*'[^']*'/gi, "= '***'")
      .replace(/=\s*"[^"]*"/gi, '= "***"')
      .substring(0, 500) // Limit length
  }
}

export class DatabaseOptimizer {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const [tableStats, slowQueries] = await Promise.all([
      this.getTableStats(),
      this.getSlowQueries()
    ])

    return {
      tableStats,
      slowQueries,
      connectionPool: {
        active: 0, // Would need to implement connection pool monitoring
        idle: 0,
        total: 0
      },
      cacheHitRatio: 0 // Would need to implement cache monitoring
    }
  }

  /**
   * Get table statistics
   */
  private async getTableStats(): Promise<Array<{
    tableName: string
    rowCount: number
    sizeBytes: number
    indexSize: number
  }>> {
    try {
      // This is PostgreSQL specific - would need adjustment for other databases
      const result = await this.prisma.$queryRaw<Array<{
        table_name: string
        row_count: number
        table_size: number
        index_size: number
      }>>`
        SELECT
          schemaname||'.'||tablename as table_name,
          n_tup_ins + n_tup_upd + n_tup_del as row_count,
          pg_total_relation_size(schemaname||'.'||tablename) as table_size,
          pg_indexes_size(schemaname||'.'||tablename) as index_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY table_size DESC
      `

      return result.map(row => ({
        tableName: row.table_name,
        rowCount: Number(row.row_count),
        sizeBytes: Number(row.table_size),
        indexSize: Number(row.index_size)
      }))
    } catch (error) {
      console.error('Failed to get table stats:', error)
      return []
    }
  }

  /**
   * Get slow queries from pg_stat_statements (if available)
   */
  private async getSlowQueries(): Promise<QueryPerformanceMetrics[]> {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        query: string
        mean_exec_time: number
        calls: number
      }>>`
        SELECT
          query,
          mean_exec_time,
          calls
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `

      return result.map(row => ({
        query: row.query,
        executionTime: Number(row.mean_exec_time),
        timestamp: new Date(),
        rowsAffected: Number(row.calls)
      }))
    } catch (error) {
      // pg_stat_statements extension might not be installed
      return []
    }
  }

  /**
   * Analyze and suggest optimizations
   */
  async analyzePerformance(): Promise<{
    suggestions: string[]
    criticalIssues: string[]
    indexRecommendations: string[]
  }> {
    const stats = await this.getDatabaseStats()
    const suggestions: string[] = []
    const criticalIssues: string[] = []
    const indexRecommendations: string[] = []

    // Analyze table sizes
    for (const table of stats.tableStats) {
      if (table.sizeBytes > 100 * 1024 * 1024) { // > 100MB
        suggestions.push(`Consider partitioning large table: ${table.tableName}`)
      }

      if (table.indexSize > table.sizeBytes * 2) {
        suggestions.push(`High index overhead on table: ${table.tableName}`)
      }

      if (table.indexSize === 0 && table.rowCount > 1000) {
        indexRecommendations.push(`Consider adding indexes to table: ${table.tableName}`)
      }
    }

    // Analyze slow queries
    if (stats.slowQueries.length > 5) {
      criticalIssues.push('Multiple slow queries detected')
    }

    return {
      suggestions,
      criticalIssues,
      indexRecommendations
    }
  }

  /**
   * Update table statistics
   */
  async updateStatistics(): Promise<void> {
    try {
      // PostgreSQL ANALYZE command
      await this.prisma.$executeRaw`ANALYZE`
    } catch (error) {
      console.error('Failed to update statistics:', error)
    }
  }

  /**
   * Check index usage
   */
  async getIndexUsage(): Promise<Array<{
    tableName: string
    indexName: string
    scans: number
    tuples: number
    usage: number
  }>> {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        table_name: string
        index_name: string
        idx_scan: number
        idx_tup_read: number
        idx_tup_fetch: number
      }>>`
        SELECT
          schemaname||'.'||tablename as table_name,
          indexname as index_name,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
      `

      return result.map(row => ({
        tableName: row.table_name,
        indexName: row.index_name,
        scans: Number(row.idx_scan),
        tuples: Number(row.idx_tup_read),
        usage: Number(row.idx_scan) / Math.max(Number(row.idx_tup_read), 1)
      }))
    } catch (error) {
      console.error('Failed to get index usage:', error)
      return []
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Prisma middleware for automatic query tracking
export function createPerformanceMiddleware() {
  return async (params: any, next: any) => {
    const start = Date.now()

    try {
      const result = await next(params)
      const executionTime = Date.now() - start

      performanceMonitor.trackQuery(
        `${params.model}.${params.action}`,
        executionTime,
        Array.isArray(result) ? result.length : 1
      )

      return result
    } catch (error) {
      const executionTime = Date.now() - start

      performanceMonitor.trackQuery(
        `${params.model}.${params.action}`,
        executionTime,
        0,
        error instanceof Error ? error.message : 'Unknown error'
      )

      throw error
    }
  }
}

// Query optimization utilities
export class QueryOptimizer {
  /**
   * Optimize pagination queries
   */
  static optimizePagination(limit: number, offset: number): { take: number; skip: number } {
    // Limit maximum page size
    const maxLimit = 100
    const optimizedLimit = Math.min(limit, maxLimit)

    // Warn about large offsets
    if (offset > 10000) {
      console.warn('Large offset detected, consider cursor-based pagination')
    }

    return {
      take: optimizedLimit,
      skip: offset
    }
  }

  /**
   * Optimize search queries
   */
  static optimizeSearch(query: string): string {
    // Remove special characters and limit length
    return query
      .replace(/[^\w\s]/g, '')
      .trim()
      .substring(0, 100)
  }

  /**
   * Batch operations for better performance
   */
  static createBatch<T>(items: T[], batchSize = 100): T[][] {
    const batches: T[][] = []

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }

    return batches
  }
}
