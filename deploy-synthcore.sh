#!/bin/bash

# Quick Deploy Script for Synthcore VPS
# This replaces n8n with the new Node.js AI Agent

echo "🚀 Deploying WhatsApp AI Agent to Synthcore VPS..."

# Check if running on VPS
if [ ! -f /etc/nginx/nginx.conf ]; then
    echo "❌ This script must be run on your VPS (api.synthcore.in)"
    exit 1
fi

# Navigate to project directory
cd /root/whatsapp-ai || {
    echo "❌ Directory /root/whatsapp-ai not found!"
    echo "Please upload your code first using:"
    echo "  scp -r * root@api.synthcore.in:/root/whatsapp-ai/"
    exit 1
}

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop existing process if running
pm2 delete whatsapp-ai 2>/dev/null || true

# Start the application on port 3001
echo "🚀 Starting AI Agent on port 3001..."
PORT=3001 pm2 start server.js --name whatsapp-ai

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Status: pm2 status"
echo "📝 Logs: pm2 logs whatsapp-ai"
echo "🌐 Test: curl http://localhost:3001/api/status"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Update Nginx config to add /webhook/ai route"
echo "   2. Update WhatsApp server webhook URL to: https://api.synthcore.in/webhook/ai"
echo "   3. Update SYNTHCORE_API_KEY in .env file"
echo "   4. Restart: pm2 restart whatsapp-ai"
echo ""
echo "📖 Full guide: cat DEPLOYMENT_SYNTHCORE.md"
