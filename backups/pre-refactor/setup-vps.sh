#!/bin/bash

# ============================================
# VPS Setup Script for WhatsApp-GHL Integration
# ============================================

set -e  # Exit on error

echo "🚀 Starting VPS Setup for WhatsApp-GHL Integration..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root"
    echo "Use: sudo bash setup-vps.sh"
    exit 1
fi

print_info "Step 1: Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

print_info "Step 2: Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
print_success "Node.js installed: $(node --version)"

print_info "Step 3: Installing Git..."
apt install git -y
print_success "Git installed: $(git --version)"

print_info "Step 4: Installing PM2 (Process Manager)..."
npm install -g pm2
print_success "PM2 installed: $(pm2 --version)"

print_info "Step 5: Setting up firewall..."
if ! command -v ufw &> /dev/null; then
    apt install ufw -y
fi
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable
print_success "Firewall configured"

print_info "Step 6: Creating application directory..."
mkdir -p /opt/whatsapp-ghl
cd /opt/whatsapp-ghl

# Ask for Git repository URL
echo ""
read -p "Enter your Git repository URL (or press Enter to skip): " REPO_URL

if [ ! -z "$REPO_URL" ]; then
    print_info "Cloning repository..."
    git clone $REPO_URL .
    print_success "Repository cloned"
else
    print_info "Repository URL not provided. You can clone it later."
    print_info "Directory created at: /opt/whatsapp-ghl"
fi

print_info "Step 7: Installing dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Dependencies installed"
else
    print_info "No package.json found. Skipping..."
fi

print_info "Step 8: Creating .env file..."
cat > .env << EOF
# WhatsApp Configuration
WHATSAPP_SESSION_NAME=Mywhatsapp
USE_MOCK_WHATSAPP=false

# Server Configuration
PORT=3000
NODE_ENV=production

# Filtering
FILTER_GROUP_MESSAGES=true
FILTER_BROADCAST_MESSAGES=true
FILTER_COMPANY_MESSAGES=true

# Add your credentials below
GHL_API_KEY=your_ghl_api_key_here
GHL_LOCATION_ID=your_location_id_here
GHL_BASE_URL=https://services.leadconnectorhq.com

OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=anthropic/claude-3-haiku

RENDER_URL=https://whatsapp-ghl-integration-77cf.onrender.com
EOF
print_success ".env file created at /opt/whatsapp-ghl/.env"

echo ""
print_success "VPS Setup Complete!"
echo ""
print_info "Next Steps:"
echo "1. Edit .env file: nano /opt/whatsapp-ghl/.env"
echo "2. Add your credentials (GHL API key, OpenRouter key, etc.)"
echo "3. Start the server: pm2 start server.js --name whatsapp-ghl"
echo "4. Enable auto-start: pm2 startup && pm2 save"
echo "5. View logs: pm2 logs whatsapp-ghl"
echo ""
print_info "Don't forget to update LOCAL_SERVER_URL in your Render environment!"
print_info "Set it to: http://$(curl -s ifconfig.me):3000"
echo ""

