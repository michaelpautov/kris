#!/bin/bash

# Setup SQLite test database and run tests

echo "Setting up SQLite test database..."

# Remove existing test database
rm -f test.db

# Use test schema
export PRISMA_SCHEMA_FILE="prisma/schema.test.prisma"

# Generate Prisma client for test schema
echo "Generating Prisma client for tests..."
npx prisma generate --schema=prisma/schema.test.prisma

# Push database schema
echo "Creating test database schema..."
npx prisma db push --schema=prisma/schema.test.prisma

echo "Running tests..."
npm test

echo "Cleaning up..."
rm -f test.db

echo "Test run completed!"
