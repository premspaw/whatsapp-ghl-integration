# 🚀 Deployment Action Plan - Complete Setup Guide

**Date:** January 2025  
**Status:** Ready for Production Deployment

---

## 📊 Current Setup Status

### ✅ What's Already Configured

1. **Render Dashboard** ✅
   - URL: `https://whatsapp-ghl-integration-77cf.onrender.com`
   - Status: Ready to deploy
   - Purpose: Dashboard UI & webhook receiver

2. **GoHighLevel Integration** ✅
   - API Key: Configured
   - Location ID: Configured
   - Webhook Endpoint: `/webhooks/ghl`

3. **AI Service** ✅
   - OpenRouter: Configured
   - Model: Claude-3-Haiku

4. **Code Base** ✅
   - Complete server with all features
   - WhatsApp Web support
   - WhatsApp Business API support
   - Real-time dashboards

---

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│              DEPLOYMENT ARCHITECTURE            │
└─────────────────────────────────────────────────┘

┌──────────────┐        ┌──────────────┐
│  Render.com  │        │   Your VPS   │
│  (Dashboard) │◄──────►│ (WhatsApp Web)│
│              │        │              │
│  - UI        │        │  - QR Login  │
│  - Webhooks  │        │  - Session   │
│  - API       │        │  - Messages  │
└──────────────┘        └──────────────┘
       │                         │
       │                         │
       ▼                         ▼
┌───────────────────────────────────────┐
│     GoHighLevel CRM Integration      │
│  - Contacts                           │
│  - Conversations                      │
│  - AI Replies                         │
└───────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────┐
│     WhatsApp (Dual Mode)              │
│  - WhatsApp Web (QR Scan)             │
│  - WhatsApp Business API               │
└───────────────────────────────────────┘
```

---

## 🚀 STEP 1: Deploy to Render (Dashboard)

### Current Status: ✅ Already Created

Your Render service is already set up:
- Name: `whatsapp-ghl-integration`
- Plan: Free tier
- Start Command: `npm run render`

### What You Need to Do:

1. **Push to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect Render to GitHub**
   - Go to https://render.com
   - Connect to your repository
   - Render will auto-deploy

3. **Set Environment Variables in Render**
   
   Go to Render Dashboard → Your Service → Environment
   
   Add these variables:
   ```env
   NODE_ENV=production
   LOCAL_SERVER_URL=http://your-vps-ip:3000
   GHL_API_KEY=your_ghl_api_key
   GHL_LOCATION_ID=your_location_id
   OPENROUTER_API_KEY=your_openrouter_key
   ```

### Render Will Serve:
- ✅ Dashboard UI (`/`)
- ✅ Template Creator (`/template-creator`)
- ✅ Webhook receiver (`/webhooks/ghl`)
- ✅ API endpoints (`/api/whatsapp/send-template`)

---

## 🚀 STEP 2: Set Up VPS for WhatsApp Web

### Why VPS?
- WhatsApp Web needs a persistent session
- QR code scanning requires real-time connection
- Can't run 24/7 on local machine
- VPS keeps WhatsApp session alive

### Recommended VPS Providers:

1. **Digital Ocean** ($5/month) ⭐ RECOMMENDED
2. **Linode** ($5/month)
3. **Vultr** ($2.50/month)
4. **Hetzner** (€4.51/month)

### VPS Setup Steps:

#### Step 2.1: Create VPS Instance

Choose Ubuntu 22.04 LTS:
- **RAM:** 1GB minimum (2GB recommended)
- **Storage:** 20GB
- **Region:** Closest to your location

#### Step 2.2: Connect to VPS

```bash
ssh root@your-vps-ip
```

#### Step 2.3: Install Node.js

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x
npm --version
```

#### Step 2.4: Clone Your Repository

```bash
# Install Git
apt install git -y

# Clone repository
cd /root
git clone https://github.com/yourusername/whatsapp-ghl-integration.git
cd whatsapp-ghl-integration

# Install dependencies
npm install
```

#### Step 2.5: Configure Environment

Create `.env` file:

```bash
nano .env
```

Add these variables:

```env
# WhatsApp Configuration
WHATSAPP_SESSION_NAME=Mywhatsapp
USE_MOCK_WHATSAPP=false

# GoHighLevel API
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id
GHL_BASE_URL=https://services.leadconnectorhq.com

# AI Service
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=anthropic/claude-3-haiku

# VPS Settings
PORT=3000
NODE_ENV=production
RENDER_URL=https://whatsapp-ghl-integration-77cf.onrender.com

# Filtering
FILTER_GROUP_MESSAGES=true
FILTER_BROADCAST_MESSAGES=true
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

#### Step 2.6: Install PM2 (Process Manager)

```bash
npm install -g pm2

# Start the server
pm2 start server.js --name whatsapp-ghl

# Make it start on boot
pm2 startup
pm2 save

# View logs
pm2 logs whatsapp-ghl
```

#### Step 2.7: Configure Firewall

```bash
# Allow SSH
ufw allow 22/tcp

# Allow Node.js port
ufw allow 3000/tcp

# Enable firewall
ufw enable
```

#### Step 2.8: Install Nginx (Optional - for domain name)

```bash
apt install nginx -y

# Configure Nginx
nano /etc/nginx/sites-available/default
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Restart Nginx:
```bash
nginx -t
systemctl restart nginx
```

---

## 🔗 STEP 3: Connect Render ↔ VPS

### Update LOCAL_SERVER_URL in Render

1. Go to Render Dashboard
2. Select your service
3. Go to "Environment"
4. Update `LOCAL_SERVER_URL` to your VPS IP:
   ```
   LOCAL_SERVER_URL=http://your-vps-ip:3000
   ```

### Test the Connection

```bash
# On your local machine, test VPS
curl http://your-vps-ip:3000/health

# Should return: {"status":"healthy"}
```

---

## 📱 STEP 4: WhatsApp Setup (Both Methods)

### A) WhatsApp Web (Simple) - On VPS

1. **Access Dashboard**
   ```
   http://your-vps-ip:3000
   ```

2. **QR Code Will Appear**
   - Scan with your phone
   - WhatsApp session will stay alive on VPS

3. **Verify Connection**
   - Check PM2 logs: `pm2 logs whatsapp-ghl`
   - Should see: "WhatsApp client is ready!"

### B) WhatsApp Business API (Production) - On Render

For WhatsApp Business API, you'll use the Business API service:

#### Setup Requirements:

1. **Meta Business Account**
   - Go to: https://business.facebook.com
   - Create business account

2. **WhatsApp Business API**
   - Go to: https://developers.facebook.com
   - Create app → Select "Business" type
   - Add "WhatsApp" product

3. **Get Credentials:**
   - Access Token
   - Phone Number ID
   - Business Account ID
   - Webhook Verify Token

4. **Add to Render Environment:**

```env
# WhatsApp Business API (on Render)
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

5. **Set Webhook in Meta:**
   - Go to WhatsApp settings
   - Add webhook URL: `https://your-render-url.com/webhook/whatsapp`
   - Verify token
   - Subscribe to events

---

## 🔗 STEP 5: Configure GoHighLevel Webhooks

### GHL Webhook Setup:

1. **Go to GHL Settings**
   - Navigate to: Settings → Integrations → Webhooks

2. **Add New Webhook**
   - URL: `https://your-render-url.com/webhooks/ghl`
   - Events: Select these:
     - ✅ `contact.updated`
     - ✅ `conversation.message.created`
     - ✅ `conversation.created`
     - ✅ `contact.created`

3. **Test Webhook**
   - GHL will send test event
   - Check Render logs for confirmation

---

## ✅ STEP 6: Final Testing

### Test Checklist:

#### Test 1: VPS WhatsApp Web
```bash
# On VPS
pm2 logs whatsapp-ghl

# Look for:
✅ "WhatsApp client is ready!"
✅ QR code in logs
```

#### Test 2: Send Test Message
- Send WhatsApp message to your number
- Check if it appears in GHL

#### Test 3: AI Reply
- Send message: "Hello"
- Should receive AI reply

#### Test 4: GHL Sync
- Check GHL contacts for new contact
- Verify conversation created

#### Test 5: Dashboard Access
```bash
# Access these URLs:
https://your-render-url.com               # Main dashboard
https://your-render-url.com/template-creator  # Template creator
http://your-vps-ip:3000                    # VPS dashboard
```

#### Test 6: Webhook
```bash
# Test from terminal
curl https://your-render-url.com/webhooks/ghl \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

---

## 🔧 Troubleshooting

### Issue 1: VPS WhatsApp Disconnects

**Solution:**
```bash
# Check PM2 status
pm2 status

# Restart if needed
pm2 restart whatsapp-ghl

# Check logs
pm2 logs whatsapp-ghl --lines 50
```

### Issue 2: Render Can't Connect to VPS

**Solution:**
```bash
# On VPS, check if server is running
curl http://localhost:3000/health

# Check firewall
ufw status

# Ensure port 3000 is open
ufw allow 3000/tcp
```

### Issue 3: QR Code Not Showing

**Solution:**
```bash
# Delete WhatsApp session folder
cd /root/whatsapp-ghl-integration
rm -rf .wwebjs_auth

# Restart server
pm2 restart whatsapp-ghl

# New QR will appear in logs
pm2 logs whatsapp-ghl
```

### Issue 4: GHL Webhook Not Working

**Solution:**
1. Verify webhook URL in GHL
2. Check Render logs
3. Test webhook manually:
```bash
curl https://your-render-url.com/webhooks/ghl \
  -X POST \
  -d '{"event":"test"}'
```

---

## 📊 Monitoring Commands

### On VPS:

```bash
# View server logs
pm2 logs whatsapp-ghl

# Check process status
pm2 status

# Monitor resource usage
pm2 monit

# Restart server
pm2 restart whatsapp-ghl

# Stop server
pm2 stop whatsapp-ghl

# View all logs
pm2 logs
```

### On Render:

- Dashboard shows real-time logs
- Go to your service → Logs tab

---

## 🎯 Summary

### What's Deployed Where:

```
┌─────────────────────────────────────────┐
│             Render.com                  │
│  ✅ Dashboard UI                        │
│  ✅ Webhook Endpoints                   │
│  ✅ API Endpoints                        │
│  ✅ GHL Integration                     │
│  ✅ WhatsApp Business API               │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│            VPS Server                   │
│  ✅ WhatsApp Web Session                │
│  ✅ QR Code Scanner                     │
│  ✅ Message Processing                  │
│  ✅ Real-time Connections                │
└─────────────────────────────────────────┘
```

### URLs You'll Need:

- **Render Dashboard:** `https://whatsapp-ghl-integration-77cf.onrender.com`
- **VPS Dashboard:** `http://your-vps-ip:3000`
- **GHL Webhook:** `https://your-render-url.com/webhooks/ghl`
- **WhatsApp Webhook:** `https://your-render-url.com/webhook/whatsapp`

---

## ✅ You're All Set!

Follow these steps in order:
1. ✅ Deploy to Render (Dashboard)
2. ✅ Set up VPS (WhatsApp Web)
3. ✅ Connect Render ↔ VPS
4. ✅ Configure WhatsApp (Both methods)
5. ✅ Set up GHL webhooks
6. ✅ Test everything

**Need help with any step? Let me know!** 🚀

