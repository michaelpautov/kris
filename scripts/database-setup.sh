#!/bin/bash

# Database Setup Script for ClientCheck
# This script handles database initialization, migrations, and seeding

set -e

echo "🗄️  ClientCheck Database Setup"
echo "================================"

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please create a .env file with your database connection string"
    exit 1
fi

# Parse command line arguments
RESET_DB=false
SEED_DATA=false
RUN_TESTS=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --reset)
            RESET_DB=true
            shift
            ;;
        --seed)
            SEED_DATA=true
            shift
            ;;
        --test)
            RUN_TESTS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --reset    Reset database (drops and recreates)"
            echo "  --seed     Seed database with sample data"
            echo "  --test     Run database tests after setup"
            echo "  --verbose  Enable verbose output"
            echo "  --help     Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to run command with optional verbose output
run_cmd() {
    if [ "$VERBOSE" = true ]; then
        echo "💻 Running: $1"
        eval "$1"
    else
        eval "$1" > /dev/null 2>&1
    fi
}

# Function to check if database is accessible
check_database() {
    log "🔍 Checking database connectivity..."

    if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        echo "❌ ERROR: Cannot connect to database"
        echo "Please check your DATABASE_URL and ensure the database server is running"
        exit 1
    fi

    log "✅ Database connection successful"
}

# Function to reset database
reset_database() {
    log "🔄 Resetting database..."

    echo "⚠️  WARNING: This will delete all data in the database!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Database reset cancelled"
        return
    fi

    # Reset the database
    run_cmd "npx prisma migrate reset --force"
    log "✅ Database reset completed"
}

# Function to run migrations
run_migrations() {
    log "🚀 Running database migrations..."

    # Generate Prisma client
    run_cmd "npx prisma generate"

    # Run migrations
    run_cmd "npx prisma migrate deploy"

    log "✅ Migrations completed successfully"
}

# Function to seed database
seed_database() {
    log "🌱 Seeding database with sample data..."

    if [ -f "prisma/seed.ts" ]; then
        run_cmd "npx tsx prisma/seed.ts"
        log "✅ Database seeding completed"
    else
        log "⚠️  No seed file found at prisma/seed.ts"
    fi
}

# Function to run tests
run_database_tests() {
    log "🧪 Running database tests..."

    # Set test environment
    export NODE_ENV=test

    # Run database-specific tests
    run_cmd "npm test tests/database/"

    log "✅ Database tests completed"
}

# Function to validate schema
validate_schema() {
    log "🔍 Validating database schema..."

    # Check schema format
    run_cmd "npx prisma validate"

    # Check if database is in sync with schema
    run_cmd "npx prisma migrate status"

    log "✅ Schema validation completed"
}

# Function to create backup
create_backup() {
    log "💾 Creating database backup..."

    BACKUP_DIR="backups"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date '+%Y%m%d_%H%M%S').sql"

    mkdir -p "$BACKUP_DIR"

    # Extract database name from URL for PostgreSQL
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    if command -v pg_dump &> /dev/null; then
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
        log "✅ Backup created: $BACKUP_FILE"
    else
        log "⚠️  pg_dump not found, skipping backup"
    fi
}

# Function to show database info
show_database_info() {
    log "📊 Database Information:"
    echo ""

    # Show Prisma info
    npx prisma --version
    echo ""

    # Show migration status
    echo "Migration Status:"
    npx prisma migrate status || true
    echo ""

    # Show table counts (if possible)
    echo "Table Information:"
    npx prisma db execute --stdin <<< "
        SELECT
            table_name,
            (xpath('/row/c/text()', xml_count))[1]::text::int as row_count
        FROM (
            SELECT
                table_name,
                query_to_xml(format('SELECT count(*) as c FROM %I.%I', table_schema, table_name), false, true, '') as xml_count
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ) t;
    " 2>/dev/null || echo "Could not retrieve table information"
}

# Main execution flow
main() {
    log "Starting database setup process..."

    # Always check database connectivity first
    check_database

    # Create backup before any destructive operations
    if [ "$RESET_DB" = true ]; then
        create_backup
        reset_database
    fi

    # Validate schema
    validate_schema

    # Run migrations
    run_migrations

    # Seed data if requested
    if [ "$SEED_DATA" = true ]; then
        seed_database
    fi

    # Run tests if requested
    if [ "$RUN_TESTS" = true ]; then
        run_database_tests
    fi

    # Show final status
    show_database_info

    log "🎉 Database setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start your application: npm run dev"
    echo "2. Access Prisma Studio: npx prisma studio"
    echo "3. Run tests: npm test"
}

# Run main function
main "$@"
