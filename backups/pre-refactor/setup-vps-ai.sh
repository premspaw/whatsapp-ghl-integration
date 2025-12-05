#!/bin/bash
# WhatsApp AI Chatbot VPS Setup Script
# This script sets up the environment for the WhatsApp AI chatbot with business knowledge integration

# Exit on error
set -e

echo "====================================================="
echo "WhatsApp AI Chatbot VPS Setup"
echo "====================================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo"
  exit 1
fi

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
echo "Installing dependencies..."
apt install -y curl wget git build-essential libpq-dev postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Install Node.js 16.x
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# Install PM2 globally
echo "Installing PM2 process manager..."
npm install -g pm2

# Create app directory
APP_DIR="/opt/whatsapp-ai-chatbot"
echo "Creating application directory at $APP_DIR..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone the repository (replace with your actual repository)
echo "Cloning application repository..."
git clone https://github.com/yourusername/whatsapp-ai-chatbot.git .

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create uploads directory for knowledge base
echo "Creating uploads directory for knowledge base..."
mkdir -p uploads/knowledge
chmod 755 uploads/knowledge

# Setup environment variables
echo "Setting up environment variables..."
cat > .env << EOL
# Server Configuration
PORT=3000
NODE_ENV=production

# WhatsApp Configuration
WHATSAPP_CLIENT_ID=your_whatsapp_client_id
WHATSAPP_CLIENT_SECRET=your_whatsapp_client_secret

# GHL Configuration
GHL_API_KEY=pit-89789df0-5431-4cc6-9787-8d2423d5d120
GHL_LOCATION_ID=dXh04Cd8ixM9hnk1IS5b
GHL_BASE_URL=https://rest.gohighlevel.com/v1/

# Database Configuration
DATABASE_URL=postgres://username:password@localhost:5432/whatsapp_ai_chatbot

# AI Configuration
OPENAI_API_KEY=your_openai_api_key
EMBEDDINGS_MODEL=text-embedding-ada-002
COMPLETION_MODEL=gpt-4-turbo
MAX_CONVERSATION_HISTORY=10
CONVERSATION_CONTEXT_WINDOW=5

# Monitoring
ENABLE_MONITORING=true
LOG_LEVEL=info
EOL

echo "Please update the .env file with your actual credentials"

# Setup PostgreSQL database
echo "Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE USER whatsapp_ai WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "CREATE DATABASE whatsapp_ai_chatbot OWNER whatsapp_ai;"
sudo -u postgres psql -c "ALTER USER whatsapp_ai WITH SUPERUSER;"

# Enable pgvector extension for embeddings
sudo -u postgres psql -d whatsapp_ai_chatbot -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Setup Nginx
echo "Setting up Nginx..."
cat > /etc/nginx/sites-available/whatsapp-ai-chatbot << EOL
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/whatsapp-ai-chatbot /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Setup SSL with Certbot
echo "Would you like to set up SSL with Let's Encrypt? (y/n)"
read -r setup_ssl

if [ "$setup_ssl" = "y" ]; then
  echo "Enter your domain name:"
  read -r domain_name
  certbot --nginx -d "$domain_name"
fi

# Setup PM2 startup script
echo "Setting up PM2 startup script..."
pm2 startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# Start the application
echo "Starting the application with PM2..."
pm2 start server.js --name whatsapp-ai-chatbot
pm2 save

echo "====================================================="
echo "Installation complete!"
echo "====================================================="
echo "Next steps:"
echo "1. Update the .env file with your actual credentials"
echo "2. Update the Nginx configuration with your domain"
echo "3. Restart the application: pm2 restart whatsapp-ai-chatbot"
echo "====================================================="