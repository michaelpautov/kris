#!/bin/bash

# Run tests with SQLite schema
echo "Running tests with SQLite configuration..."

# Copy test environment
cp .env.test .env

# Generate Prisma client for test schema
echo "Generating test Prisma client..."
npx prisma generate --schema=./prisma/schema.test.prisma

# Push test schema to SQLite database
echo "Setting up test database..."
npx prisma db push --schema=./prisma/schema.test.prisma --force-reset

# Run tests
echo "Running tests..."
npm test

# Cleanup
rm -f test.db test.db-journal

echo "Tests completed!"
