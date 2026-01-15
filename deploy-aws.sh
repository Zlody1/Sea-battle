#!/bin/bash

# AWS Deployment Script for Sea Battle Game
# This script sets up and runs the application on AWS EC2

echo "🚀 Starting Sea Battle deployment..."

# Set environment variables
export PORT=${PORT:-3001}
export CLIENT_URL=${CLIENT_URL:-"http://localhost:5173"}
export NODE_ENV=${NODE_ENV:-"production"}

# Install dependencies if not present
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the frontend
echo "🔨 Building frontend..."
npm run build

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

# Start the server with PM2
echo "🌐 Starting server with PM2..."
pm2 delete sea-battle-server 2>/dev/null || true
pm2 start backend/server.js --name sea-battle-server

# Serve the built frontend with PM2
echo "🎮 Starting frontend server..."
pm2 delete sea-battle-frontend 2>/dev/null || true
pm2 serve dist 8080 --spa --name sea-battle-frontend

# Save PM2 process list
pm2 save

# Setup PM2 to restart on server reboot
pm2 startup

echo "✅ Deployment complete!"
echo "📊 Server running on port ${PORT}"
echo "🌍 Frontend running on port 8080"
echo ""
echo "Useful commands:"
echo "  pm2 status        - Check application status"
echo "  pm2 logs          - View logs"
echo "  pm2 restart all   - Restart all services"
echo "  pm2 stop all      - Stop all services"
