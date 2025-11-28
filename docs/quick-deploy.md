# 🚀 Quick Deployment Guide

## Local Machine (Windows)

### 1. Push to Git
```bash
# Run the automated script
git-push.bat
```

**OR manually:**
```bash
git add .
git commit -m "AI Integration fixes and improvements"
git push origin main
```

## VPS Server (Linux)

### 1. SSH to your VPS
```bash
ssh your-username@your-vps-ip
cd /path/to/your/project
```

### 2. Deploy Latest Code
```bash
# Make script executable (first time only)
chmod +x vps-deploy.sh

# Run deployment script
./vps-deploy.sh
```

**OR manually:**
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Restart application
pm2 restart ghl-whatsapp

# Check status
pm2 status
pm2 logs ghl-whatsapp --lines 10
```

## 🔍 Testing Your Live Deployment

### 1. Check Application Status
```bash
pm2 status ghl-whatsapp
pm2 logs ghl-whatsapp --lines 20
```

### 2. Test WhatsApp Integration
- Send a test message to your WhatsApp number
- Check logs for AI response generation
- Verify GHL conversation sync

### 3. Test Webhook Endpoints
```bash
# Test webhook (replace with your domain)
curl -X POST https://your-domain.com/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "body": "Test message",
    "timestamp": 1234567890,
    "id": "test_123",
    "type": "text"
  }'
```

## 🛠️ Troubleshooting

### If deployment fails:
```bash
# Check PM2 status
pm2 status

# View detailed logs
pm2 logs ghl-whatsapp

# Restart if needed
pm2 restart ghl-whatsapp

# Check system resources
pm2 monit
```

### If WhatsApp connection issues:
```bash
# Check QR code (if needed)
pm2 logs ghl-whatsapp | grep -i "qr"

# Restart WhatsApp service
pm2 restart ghl-whatsapp
```

## 📱 Live Testing Checklist

- [ ] Application starts without errors
- [ ] WhatsApp connection established
- [ ] Webhook endpoints responding
- [ ] AI responses being generated
- [ ] GHL conversations syncing
- [ ] Phone number normalization working
- [ ] Templates and automation rules loaded

## 🔗 Useful Commands

```bash
# Monitor in real-time
pm2 monit

# View specific logs
pm2 logs ghl-whatsapp --lines 50

# Restart specific process
pm2 restart ghl-whatsapp

# Stop all processes
pm2 stop all

# Start all processes
pm2 start all
```