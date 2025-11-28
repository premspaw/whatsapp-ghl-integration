# VPS Deployment Commands

## Step 1: Find Your Project Directory
Run these commands on your VPS to locate your project:

```bash
# Check current directory
pwd

# List all directories in root
ls -la /

# Check common project locations
ls -la /root/
ls -la /home/
ls -la /var/www/
ls -la /opt/

# Search for the project by name
find / -name "*whatsapp*" -type d 2>/dev/null
find / -name "*ghl*" -type d 2>/dev/null
find / -name "package.json" -path "*/whatsapp*" 2>/dev/null
```

## Step 2: Once You Find the Project Directory
Replace `YOUR_PROJECT_PATH` with the actual path you found:

```bash
# Navigate to your project
cd YOUR_PROJECT_PATH

# Pull latest changes from GitHub
git pull origin main

# Install/update dependencies
npm install

# Restart the application with PM2
pm2 restart ghl-whatsapp

# Check status
pm2 status
pm2 logs ghl-whatsapp --lines 20
```

## Step 3: Alternative - Clone Fresh (if needed)
If you can't find the existing project:

```bash
# Clone the repository fresh
git clone https://github.com/premspaw/whatsapp-ghl-integration.git
cd whatsapp-ghl-integration

# Copy your .env file from the old location (if exists)
# cp /path/to/old/.env .env

# Install dependencies
npm install

# Start with PM2
pm2 start ecosystem.config.js
```

## Step 4: Verify Deployment
```bash
# Check if the server is running
curl http://localhost:3000/api/whatsapp/health

# Check the WhatsApp tab
curl http://localhost:3000/ghl-whatsapp-tab.html
```