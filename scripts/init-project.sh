#!/bin/bash

# ClientCheck Project Initialization Script

set -e

echo "🚀 Initializing ClientCheck project..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed or not in PATH."
    echo "Please install PostgreSQL 13+ and ensure it's running."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your actual configuration values"
fi

# Copy test environment file if it doesn't exist
if [ ! -f .env.test ]; then
    echo "📋 Test environment file already exists"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check database connection
echo "🔌 Testing database connection..."
if npx prisma db push --accept-data-loss > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "Please check your DATABASE_URL in .env file"
    echo "Make sure PostgreSQL is running and accessible"
    exit 1
fi

# Run initial migration
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name "initial_setup"

# Generate Prisma client again after migration
echo "🔧 Regenerating Prisma client after migration..."
npx prisma generate

echo ""
echo "✅ Project initialization complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your actual configuration"
echo "2. Run 'npm test' to verify everything is working"
echo "3. Run 'npm run dev' to start development server"
echo "4. Run 'npx prisma studio' to open database browser"
echo ""
