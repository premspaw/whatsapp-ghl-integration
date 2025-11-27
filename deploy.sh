#!/bin/bash

# Quick Deploy Script for WhatsApp AI Bot
# Run this on your VPS after uploading the code

echo "🚀 Starting WhatsApp AI Bot Deployment..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or use sudo"
    exit 1
fi

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Navigate to project directory
cd /var/www/whatsapp-ai || exit 1

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Stop existing PM2 process if running
pm2 delete whatsapp-ai 2>/dev/null || true

# Start the application
echo "🚀 Starting application with PM2..."
pm2 start server.js --name whatsapp-ai

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs whatsapp-ai"
echo "🌐 Dashboard: https://synthcore.in/dashboard"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Configure Nginx reverse proxy"
echo "   2. Update WhatsApp webhook URL"
echo "   3. Install SSL certificate (certbot)"
