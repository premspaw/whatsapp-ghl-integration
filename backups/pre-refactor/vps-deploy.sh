#!/bin/bash

echo "🚀 Deploying latest code to VPS..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Stop the application first
print_status "Stopping application..."
pm2 stop ghl-whatsapp 2>/dev/null || echo "Application not running"

# Pull latest changes
print_status "Pulling latest changes from Git..."
git fetch origin
git reset --hard origin/main

if [ $? -eq 0 ]; then
    print_success "Successfully pulled latest code"
else
    print_error "Failed to pull from Git"
    exit 1
fi

# Install/update dependencies
print_status "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_warning "Some dependencies may have failed to install"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p uploads/knowledge
mkdir -p data

# Set proper permissions
print_status "Setting file permissions..."
chmod +x *.sh
chmod 644 data/*.json 2>/dev/null || true

# Start the application
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

if [ $? -eq 0 ]; then
    print_success "Application started successfully"
else
    print_error "Failed to start application"
    exit 1
fi

# Show application status
print_status "Application status:"
pm2 status ghl-whatsapp

# Show recent logs
print_status "Recent logs (last 10 lines):"
pm2 logs ghl-whatsapp --lines 10 --nostream

echo ""
print_success "🎉 Deployment completed successfully!"
echo ""
print_status "Useful commands:"
echo "  pm2 logs ghl-whatsapp          # View logs"
echo "  pm2 restart ghl-whatsapp       # Restart app"
echo "  pm2 status                     # Check status"
echo "  pm2 monit                      # Monitor resources"