#!/bin/bash

# Build script for Our Hours Ouwe Discord Bot
# This script builds the application and creates a Docker container

set -e

echo "🏗️  Building Our Hours Ouwe Discord Bot..."

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t our-hours-ouwe:latest .

echo "✅ Build complete!"
echo ""
echo "🚀 To run the bot:"
echo "   docker-compose up -d"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs -f discord-bot"
echo ""
echo "🛑 To stop the bot:"
echo "   docker-compose down"