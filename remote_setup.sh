#!/bin/bash
set -e

# Stop existing process if running
pm2 stop whatsapp-ai || true
pm2 delete whatsapp-ai || true

# Prepare directory
mkdir -p /root/whatsapp-ai
cd /root

# Unzip
unzip -o whatsapp-ai.zip -d whatsapp-ai
rm whatsapp-ai.zip

# Setup .env
mv whatsapp-ai.env.temp whatsapp-ai/.env

# Install dependencies
cd whatsapp-ai
npm install --production

# Start with PM2
pm2 start server.js --name whatsapp-ai
pm2 save

# Check status
pm2 status
