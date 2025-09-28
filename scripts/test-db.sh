#!/bin/bash

# Start test PostgreSQL database in Docker

echo "Starting test PostgreSQL database..."

# Stop existing container if running
docker stop clientcheck-test-db 2>/dev/null || true
docker rm clientcheck-test-db 2>/dev/null || true

# Start new container
docker run --name clientcheck-test-db \
  -e POSTGRES_USER=username \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=clientcheck_test \
  -p 5432:5432 \
  -d postgres:15

echo "Waiting for database to be ready..."
sleep 5

# Run database migrations
echo "Running database migrations..."
export DATABASE_URL="postgresql://username:password@localhost:5432/clientcheck_test?schema=public"
npx prisma migrate deploy

echo "Test database is ready!"
echo "Run tests with: npm test"
echo "Stop database with: docker stop clientcheck-test-db"
