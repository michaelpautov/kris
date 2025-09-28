#!/bin/bash

# Setup test database for PostgreSQL
echo "Setting up test database..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "Error: PostgreSQL is not running on localhost:5432"
    echo "Please start PostgreSQL first"
    exit 1
fi

# Create test database and user if they don't exist
echo "Creating test database and user..."

# Connect as superuser to create database and user
psql -h localhost -p 5432 -U postgres -c "CREATE USER testuser WITH PASSWORD 'testpass';" 2>/dev/null || echo "User testuser already exists"
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE kris_test OWNER testuser;" 2>/dev/null || echo "Database kris_test already exists"
psql -h localhost -p 5432 -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE kris_test TO testuser;" 2>/dev/null

echo "Test database setup complete!"
echo "Test database URL: postgresql://testuser:testpass@localhost:5432/kris_test?schema=public"
