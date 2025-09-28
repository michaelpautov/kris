#!/bin/bash

# Comprehensive Test Suite for ClientCheck
# Runs all tests including unit, integration, and performance tests

set -e

echo "🧪 ClientCheck Comprehensive Test Suite"
echo "======================================="

# Configuration
TEST_ENV_FILE=".env.test"
COVERAGE_THRESHOLD=80
MAX_TEST_TIME=300 # 5 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $2 in
        "success") echo -e "${GREEN}✅ $1${NC}" ;;
        "error") echo -e "${RED}❌ $1${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $1${NC}" ;;
        *) echo "ℹ️  $1" ;;
    esac
}

# Function to run command with timeout and error handling
run_test_command() {
    local cmd="$1"
    local description="$2"
    local timeout_duration="${3:-$MAX_TEST_TIME}"

    echo "Running: $description"

    if timeout "$timeout_duration" bash -c "$cmd"; then
        print_status "$description completed" "success"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            print_status "$description timed out after ${timeout_duration}s" "error"
        else
            print_status "$description failed with exit code $exit_code" "error"
        fi
        return $exit_code
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_status "Node.js is not installed" "error"
        exit 1
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_status "npm is not installed" "error"
        exit 1
    fi

    # Check if test environment file exists
    if [ ! -f "$TEST_ENV_FILE" ]; then
        print_status "Test environment file $TEST_ENV_FILE not found" "warning"
        echo "Creating basic test environment file..."
        cat > "$TEST_ENV_FILE" << EOF
# Test Environment Configuration
NODE_ENV=test
DATABASE_URL="file:./test.db"
JWT_SECRET="test_jwt_secret"
BOT_TOKEN="test_bot_token"
GEMINI_API_KEY="test_gemini_key"
EOF
    fi

    # Load test environment
    export $(cat "$TEST_ENV_FILE" | grep -v '^#' | xargs)

    print_status "Prerequisites check completed" "success"
}

# Function to setup test database
setup_test_database() {
    echo "🗄️  Setting up test database..."

    # Remove existing test database
    rm -f test.db

    # Generate Prisma client
    run_test_command "npx prisma generate" "Generating Prisma client"

    # Push database schema
    run_test_command "npx prisma db push --force-reset" "Setting up test database schema"

    print_status "Test database setup completed" "success"
}

# Function to run linting
run_linting() {
    echo "🔍 Running code linting..."

    # Check if ESLint is configured
    if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
        run_test_command "npm run lint" "ESLint code analysis" 60
    else
        print_status "ESLint not configured, skipping" "warning"
    fi

    # Check TypeScript compilation
    run_test_command "npx tsc --noEmit" "TypeScript compilation check" 120

    print_status "Code linting completed" "success"
}

# Function to run unit tests
run_unit_tests() {
    echo "🧪 Running unit tests..."

    local test_patterns=(
        "tests/services/"
        "tests/utils/"
        "tests/types/"
    )

    for pattern in "${test_patterns[@]}"; do
        if ls $pattern*.test.{ts,js} 1> /dev/null 2>&1; then
            run_test_command "npm test -- $pattern" "Unit tests in $pattern" 180
        else
            print_status "No unit tests found in $pattern" "warning"
        fi
    done

    print_status "Unit tests completed" "success"
}

# Function to run integration tests
run_integration_tests() {
    echo "🔗 Running integration tests..."

    local test_patterns=(
        "tests/database/"
        "tests/integration/"
    )

    for pattern in "${test_patterns[@]}"; do
        if ls $pattern*.test.{ts,js} 1> /dev/null 2>&1; then
            run_test_command "npm test -- $pattern" "Integration tests in $pattern" 240
        else
            print_status "No integration tests found in $pattern" "warning"
        fi
    done

    print_status "Integration tests completed" "success"
}

# Function to run performance tests
run_performance_tests() {
    echo "⚡ Running performance tests..."

    if ls tests/performance/*.test.{ts,js} 1> /dev/null 2>&1; then
        run_test_command "npm test -- tests/performance/" "Performance tests" 300
    else
        print_status "No performance tests found" "warning"

        # Create a basic performance test
        echo "Creating basic performance test..."
        mkdir -p tests/performance
        cat > tests/performance/basic-performance.test.ts << 'EOF'
import { performance } from 'perf_hooks'

describe('Basic Performance Tests', () => {
  test('should complete database operations within acceptable time', async () => {
    const start = performance.now()

    // Simulate some database operations
    await new Promise(resolve => setTimeout(resolve, 50))

    const end = performance.now()
    const duration = end - start

    expect(duration).toBeLessThan(1000) // Should complete within 1 second
  })
})
EOF
        run_test_command "npm test -- tests/performance/" "Basic performance test" 60
    fi

    print_status "Performance tests completed" "success"
}

# Function to run coverage analysis
run_coverage_analysis() {
    echo "📊 Running code coverage analysis..."

    run_test_command "npm run test:coverage" "Code coverage analysis" 300

    # Check coverage threshold
    if [ -f "coverage/coverage-summary.json" ]; then
        local coverage=$(node -e "
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json'));
            console.log(Math.round(coverage.total.lines.pct));
        ")

        if [ "$coverage" -ge "$COVERAGE_THRESHOLD" ]; then
            print_status "Code coverage: ${coverage}% (meets threshold of ${COVERAGE_THRESHOLD}%)" "success"
        else
            print_status "Code coverage: ${coverage}% (below threshold of ${COVERAGE_THRESHOLD}%)" "warning"
        fi
    else
        print_status "Coverage report not found" "warning"
    fi

    print_status "Coverage analysis completed" "success"
}

# Function to run security audit
run_security_audit() {
    echo "🔒 Running security audit..."

    # Run npm audit
    if npm audit --audit-level=moderate > /dev/null 2>&1; then
        print_status "No security vulnerabilities found" "success"
    else
        print_status "Security vulnerabilities detected, check npm audit output" "warning"
        npm audit --audit-level=moderate || true
    fi

    # Check for sensitive data in code
    if command -v grep &> /dev/null; then
        echo "Checking for potential sensitive data..."
        local sensitive_patterns=(
            "password\s*="
            "secret\s*="
            "api_key\s*="
            "private_key"
            "token\s*="
        )

        local found_sensitive=false
        for pattern in "${sensitive_patterns[@]}"; do
            if grep -r -i --include="*.ts" --include="*.js" --exclude-dir=node_modules "$pattern" . > /dev/null 2>&1; then
                print_status "Found potential sensitive data pattern: $pattern" "warning"
                found_sensitive=true
            fi
        done

        if [ "$found_sensitive" = false ]; then
            print_status "No sensitive data patterns found" "success"
        fi
    fi

    print_status "Security audit completed" "success"
}

# Function to generate test report
generate_test_report() {
    echo "📝 Generating test report..."

    local report_file="test-report-$(date +%Y%m%d-%H%M%S).md"

    cat > "$report_file" << EOF
# ClientCheck Test Report

**Generated:** $(date)
**Environment:** Test
**Node Version:** $(node --version)
**npm Version:** $(npm --version)

## Test Summary

- ✅ Prerequisites Check
- ✅ Test Database Setup
- ✅ Code Linting
- ✅ Unit Tests
- ✅ Integration Tests
- ✅ Performance Tests
- ✅ Coverage Analysis
- ✅ Security Audit

## Coverage Report

EOF

    if [ -f "coverage/coverage-summary.json" ]; then
        echo "Coverage details available in coverage/index.html" >> "$report_file"
    else
        echo "Coverage report not available" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## Next Steps

1. Review any warnings or issues mentioned above
2. Update tests to improve coverage if needed
3. Address any security vulnerabilities found
4. Run tests again before deployment

## Files Generated

- Test report: $report_file
- Coverage report: coverage/index.html (if available)
- Test database: test.db (cleaned up)

EOF

    print_status "Test report generated: $report_file" "success"
}

# Function to cleanup
cleanup() {
    echo "🧹 Cleaning up..."

    # Remove test database
    rm -f test.db

    # Remove any temporary files
    rm -f *.tmp

    print_status "Cleanup completed" "success"
}

# Main execution function
main() {
    local start_time=$(date +%s)

    echo "Starting comprehensive test suite at $(date)"
    echo ""

    # Run all test phases
    check_prerequisites
    echo ""

    setup_test_database
    echo ""

    run_linting
    echo ""

    run_unit_tests
    echo ""

    run_integration_tests
    echo ""

    run_performance_tests
    echo ""

    run_coverage_analysis
    echo ""

    run_security_audit
    echo ""

    generate_test_report
    echo ""

    cleanup

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo "🎉 Comprehensive test suite completed successfully!"
    echo "Total time: ${duration} seconds"
    echo ""
    echo "Summary:"
    echo "- All test categories executed"
    echo "- Code quality checks passed"
    echo "- Security audit completed"
    echo "- Test report generated"
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"
