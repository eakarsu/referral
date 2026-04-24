#!/bin/bash

# Referral Mastery - Start Script
# This script sets up and starts the full application

set -e

echo "🚀 Referral Mastery - Starting Application..."
echo "================================================"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env file not found! Please create one."
  exit 1
fi

SERVER_PORT=${SERVER_PORT:-3001}
CLIENT_PORT=${CLIENT_PORT:-5173}

# Kill any processes on used ports
echo ""
echo "🧹 Cleaning up used ports..."
kill_port() {
  local port=$1
  local pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "   Killing process on port $port (PID: $pid)"
    kill -9 $pid 2>/dev/null || true
  fi
}

kill_port $SERVER_PORT
kill_port $CLIENT_PORT
sleep 1

# Check PostgreSQL
echo ""
echo "🐘 Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo "❌ PostgreSQL is not installed. Please install it first."
  exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
  echo "⚠️  PostgreSQL is not running. Attempting to start..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo "❌ Could not start PostgreSQL. Please start it manually."
    exit 1
  }
  sleep 2
fi
echo "✅ PostgreSQL is running"

# Create database if not exists
echo ""
echo "📦 Setting up database..."
DB_NAME=${DB_NAME:-referral_mastery}
DB_USER=${DB_USER:-$(whoami)}

# Try creating the database (ignore errors if it already exists)
createdb $DB_NAME 2>/dev/null || true
echo "✅ Database '$DB_NAME' ready"

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
cd server
npm install --silent
echo "✅ Server dependencies installed"

# Seed database
echo ""
echo "🌱 Seeding database..."
node seed.js
echo "✅ Database seeded"

cd ..

# Install client dependencies
echo ""
echo "📦 Installing client dependencies..."
cd client
npm install --silent
echo "✅ Client dependencies installed"

cd ..

# Start both servers with hot reload
echo ""
echo "================================================"
echo "🎉 Starting application with hot reload..."
echo "   Server: http://localhost:$SERVER_PORT (nodemon)"
echo "   Client: http://localhost:$CLIENT_PORT (vite)"
echo "================================================"
echo ""

# Start server with nodemon (watches for changes)
cd server
npx nodemon index.js &
SERVER_PID=$!
cd ..

# Start client with vite (watches for changes)
cd client
npx vite --host &
CLIENT_PID=$!
cd ..

# Trap to clean up background processes
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $SERVER_PID 2>/dev/null || true
  kill $CLIENT_PID 2>/dev/null || true
  kill_port $SERVER_PORT
  kill_port $CLIENT_PORT
  echo "👋 Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "✅ Application is running!"
echo "   Open: http://localhost:$CLIENT_PORT"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

# Wait for background processes
wait
