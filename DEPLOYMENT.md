# 🚀 Deployment Guide - WhatsApp AI Bot to VPS

## Prerequisites
- VPS with Ubuntu/Debian (your existing VPS)
- Domain: synthcore.in (already configured)
- SSH access to your VPS
- Node.js 18+ installed on VPS

---

## Step 1: Connect to Your VPS

```bash
ssh root@synthcore.in
# or
ssh your_username@your_vps_ip
```

---

## Step 2: Install Required Software on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager for 24/7 operation)
sudo npm install -g pm2

# Install Git (if not already installed)
sudo apt install -y git
```

---

## Step 3: Upload Your Code to VPS

### Option A: Using Git (Recommended)

```bash
# On your VPS, create a directory
mkdir -p /var/www/whatsapp-ai
cd /var/www/whatsapp-ai

# If you have a GitHub repo, clone it:
# git clone https://github.com/yourusername/whatsapp-ai.git .

# Otherwise, use Option B below
```

### Option B: Using SCP/SFTP (Direct Upload)

**On your local Windows machine (PowerShell):**

```powershell
# Navigate to your project folder
cd C:\Users\lenovo\.gemini\antigravity\playground\tachyon-radiation

# Upload to VPS (replace with your VPS IP/domain and username)
scp -r * root@synthcore.in:/var/www/whatsapp-ai/
```

---

## Step 4: Configure Environment on VPS

```bash
# SSH into your VPS
ssh root@synthcore.in

# Navigate to project directory
cd /var/www/whatsapp-ai

# Install dependencies
npm install

# Create/edit .env file
nano .env
```

**Paste your environment variables:**

```env
PORT=3000

# OpenRouter / Grok
OPENROUTER_API_KEY=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

# Pinecone
PINECONE_API_KEY=pcsk_21QzxN_JCXXsbyvq7GUUYwN7YNPKieqyF3eLz2DP7PZd3uMYRHfYUzAvQ5up7hgyZwetXW
PINECONE_INDEX_HOST=prod-1-data.ke.pinecone.io

# GoHighLevel
GHL_API_KEY=pit-89789df0-5431-4cc6-9787-8d2423d5d120
GHL_LOCATION_ID=dXh04Cd8ixM9hnk1IS5b
GHL_MCP_ENDPOINT=https://services.leadconnectorhq.com/mcp/

# Synthcore WhatsApp
SYNTHCORE_API_KEY=your_actual_api_key_here
SYNTHCORE_WHATSAPP_URL=https://api.synthcore.in/api/whatsapp/send

# Supabase
SUPABASE_URL=https://fwvgyjnpxqxhrcbwsjnt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dmd5am5weHF4aHJjYndzam50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzMjE4MSwiZXhwIjoyMDc5ODA4MTgxfQ.SP0q5C_y4tCbENBW3Pi7r2qri3yx_0Q9AEtoUQ1Y6U4
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Start Application with PM2 (24/7 Operation)

```bash
# Start the app with PM2
pm2 start server.js --name whatsapp-ai

# Save PM2 configuration (so it restarts on server reboot)
pm2 save

# Enable PM2 to start on system boot
pm2 startup

# Check status
pm2 status

# View logs
pm2 logs whatsapp-ai
```

---

## Step 6: Configure Nginx Reverse Proxy

Your VPS likely already has Nginx running for your WhatsApp server. Add a new location for this bot:

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/default
```

**Add this location block inside the `server` block:**

```nginx
server {
    listen 80;
    server_name synthcore.in www.synthcore.in;

    # Existing WhatsApp API location (keep as is)
    location /api/whatsapp/ {
        # Your existing config
    }

    # NEW: AI Bot Webhook
    location /webhook/whatsapp {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # NEW: Dashboard UI
    location /dashboard {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Test and reload Nginx:**

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 7: Configure Your WhatsApp Provider

Update your WhatsApp webhook URL to point to your VPS:

**Webhook URL:**
```
https://synthcore.in/webhook/whatsapp
```

---

## Step 8: Test the Deployment

```bash
# From your VPS, test locally
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918123133382", "fromName": "Test", "text": "Hello"}'

# Check logs
pm2 logs whatsapp-ai

# Check if it's running
pm2 status
```

---

## 🎯 Useful PM2 Commands

```bash
# View logs in real-time
pm2 logs whatsapp-ai

# Restart the app
pm2 restart whatsapp-ai

# Stop the app
pm2 stop whatsapp-ai

# Delete from PM2
pm2 delete whatsapp-ai

# Monitor CPU/Memory
pm2 monit

# View detailed info
pm2 info whatsapp-ai
```

---

## 🔒 Security Recommendations

1. **Enable Firewall:**
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

2. **Install SSL Certificate (HTTPS):**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d synthcore.in -d www.synthcore.in
```

3. **Secure .env file:**
```bash
chmod 600 /var/www/whatsapp-ai/.env
```

---

## 📊 Access Your Dashboard

Once deployed, access your dashboard at:
```
https://synthcore.in/dashboard
```

Or if you prefer a subdomain:
```
https://ai.synthcore.in
```

---

## 🔄 Updating Your Code

When you make changes locally:

```bash
# On your local machine
scp -r * root@synthcore.in:/var/www/whatsapp-ai/

# On your VPS
cd /var/www/whatsapp-ai
npm install  # if package.json changed
pm2 restart whatsapp-ai
```

---

## ✅ Verification Checklist

- [ ] Node.js installed on VPS
- [ ] PM2 installed and configured
- [ ] Code uploaded to VPS
- [ ] .env file configured
- [ ] Application running with PM2
- [ ] PM2 configured to start on boot
- [ ] Nginx reverse proxy configured
- [ ] Webhook URL updated in WhatsApp provider
- [ ] SSL certificate installed (HTTPS)
- [ ] Firewall configured

---

## 🆘 Troubleshooting

**App not starting?**
```bash
pm2 logs whatsapp-ai --lines 100
```

**Port already in use?**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

**Nginx errors?**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**Check if app is running:**
```bash
pm2 status
curl http://localhost:3000/api/status
```

---

## 🎉 Done!

Your WhatsApp AI bot is now running 24/7 on your VPS, even when your local computer is off!
