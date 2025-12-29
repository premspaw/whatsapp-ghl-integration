#!/bin/bash

# ==========================================
# WhatsApp-GHL Integration Deployment Script
# ==========================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Deployment Process...${NC}"

# 1. Pull latest code
echo -e "\n${YELLOW}Step 1: Pulling latest code...${NC}"
git pull
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Code updated.${NC}"
else
    echo -e "${RED}❌ Git pull failed. Please check your repository settings.${NC}"
    exit 1
fi

# 2. Install Dependencies
echo -e "\n${YELLOW}Step 2: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed.${NC}"

# 3. Environment Check
echo -e "\n${YELLOW}Step 3: Checking Environment Configuration...${NC}"
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ .env file not found! Please create one based on .env.example${NC}"
    exit 1
fi

# Helper to check/update env var
update_env_var() {
    key=$1
    value=$2
    if grep -q "^$key=" "$ENV_FILE"; then
        # Replace existing
        sed -i "s|^$key=.*|$key=\"$value\"|" "$ENV_FILE"
    else
        # Append new
        echo "$key=\"$value\"" >> "$ENV_FILE"
    fi
}

# Check specific GHL settings
echo "Checking GHL Configuration..."
current_redirect=$(grep "GHL_OAUTH_REDIRECT_URI" $ENV_FILE | cut -d '=' -f2 | tr -d '"')
expected_redirect="https://api.synthcore.in/api/auth/oauth/callback"

if [[ "$current_redirect" != *"$expected_redirect"* ]]; then
    echo -e "${YELLOW}⚠️  GHL_OAUTH_REDIRECT_URI seems to be outdated or incorrect.${NC}"
    echo -e "Current: $current_redirect"
    echo -e "Expected: $expected_redirect"
    read -p "Do you want to update it now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        update_env_var "GHL_OAUTH_REDIRECT_URI" "$expected_redirect"
        echo -e "${GREEN}✅ Updated Redirect URI.${NC}"
    fi
fi

# Ensure Scopes are up to date
echo "Ensuring OAuth Scopes are configured..."
if ! grep -q "GHL_OAUTH_SCOPES" "$ENV_FILE"; then
    echo -e "${YELLOW}⚠️  GHL_OAUTH_SCOPES missing. Adding default scopes...${NC}"
    # Add the long scope string here
    SCOPES="conversations.readonly conversations/message.write contacts.write contacts.readonly conversations/message.readonly conversations/reports.readonly conversations.write conversations/livechat.write locations.readonly invoices/estimate.write oauth.write oauth.readonly locations/tags.readonly locations/tags.write locations/customFields.write locations/customFields.readonly locations/customValues.write locations/customValues.readonly locations/tasks.readonly locations/tasks.write phonenumbers.read conversation-ai.readonly conversation-ai.write voice-ai-agent-goals.write knowledge-bases.write knowledge-bases.readonly voice-ai-agent-goals.readonly agent-studio.readonly agent-studio.write calendars.write calendars/events.write calendars.readonly calendars/groups.readonly calendars/groups.write calendars/resources.readonly calendars/resources.write locations/templates.readonly recurring-tasks.write recurring-tasks.readonly medias.write medias.readonly funnels/redirect.readonly opportunities.readonly opportunities.write charges.write charges.readonly voice-ai-agents.write voice-ai-agents.readonly voice-ai-dashboard.readonly documents_contracts_template/list.readonly documents_contracts_template/sendLink.write marketplace-installer-details.readonly links.write lc-email.readonly businesses.write documents_contracts/list.readonly documents_contracts/sendLink.write"
    echo "GHL_OAUTH_SCOPES=\"$SCOPES\"" >> "$ENV_FILE"
    echo -e "${GREEN}✅ Scopes added.${NC}"
fi

# 4. Restart Application
echo -e "\n${YELLOW}Step 4: Restarting Application (PM2)...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 restart all || pm2 start src/server.js --name "whatsapp-ghl"
    pm2 save
    echo -e "${GREEN}✅ Application restarted.${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found. Starting with node directly...${NC}"
    echo "Run 'npm start' to start the server."
fi

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo -e "Verify functionality at: https://api.synthcore.in/ghl-whatsapp-tab.html"
