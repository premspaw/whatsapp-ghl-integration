#!/bin/bash

# ==========================================
# Loyalty App VPS Deployment Script
# ==========================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Loyalty App Deployment...${NC}"

# 1. Pull latest code
echo -e "\n${YELLOW}Step 1: Pulling latest code from GitHub...${NC}"
git pull
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed.${NC}"
    exit 1
fi

# 2. Setup Loyalty App
echo -e "\n${YELLOW}Step 2: Building loyalty-app...${NC}"
cd loyalty-app

# Install dependencies
npm install --production

# Create/Update .env.production if it doesn't exist
if [ ! -f ".env.production" ]; then
    echo "Creating default .env.production..."
    echo "NEXT_PUBLIC_API_URL=https://api.synthcore.in" > .env.production
    echo "NEXT_PUBLIC_N8N_WEBHOOK=https://synthcoreai.app.n8n.cloud/webhook/skin-analysis" >> .env.production
fi

# Build Next.js
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed.${NC}"
    exit 1
fi

# 3. Restart PM2
echo -e "\n${YELLOW}Step 3: Restarting via PM2...${NC}"
cd ..
pm2 start ecosystem.config.js --only loyalty-frontend
pm2 save

echo -e "\n${GREEN}🎉 Loyalty Deployment Complete!${NC}"
echo -e "Frontend should be running on port 3001."
