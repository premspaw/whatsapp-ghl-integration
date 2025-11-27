# 🚀 Deployment Guide - Replace n8n with Node.js AI Agent

## Your Current Setup
- **VPS:** api.synthcore.in (WhatsApp Server running)
- **Dashboard:** https://api.synthcore.in/ghl-whatsapp-tab.html (KEEP AS IS)
- **GHL Sync:** Automatic (KEEP AS IS)
- **OLD AI:** n8n at https://synthcore8.app.n8n.cloud/webhook-test/webhook/whatsapp (REPLACE)
- **Send API:** https://api.synthcore.in/api/whatsapp/send (KEEP AS IS)

---

## 🎯 What We're Doing

**REPLACING:** n8n webhook with our new Node.js AI Agent  
**KEEPING:** Everything else (VPS, Dashboard, GHL sync, Send API)

---

## Step 1: Upload Code to Your VPS

### Option A: Using SCP (Recommended)

**From your Windows machine (PowerShell):**

```powershell
# Navigate to project folder
cd C:\Users\lenovo\.gemini\antigravity\playground\tachyon-radiation

# Create a zip file first (easier to upload)
Compress-Archive -Path * -DestinationPath whatsapp-ai.zip -Force

# Upload to VPS
scp whatsapp-ai.zip root@api.synthcore.in:/root/
```

### Option B: Using WinSCP or FileZilla

1. Download WinSCP: https://winscp.net/
2. Connect to: `api.synthcore.in`
3. Upload entire folder to: `/root/whatsapp-ai/`

---

## Step 2: SSH into Your VPS

```bash
ssh root@api.synthcore.in
```

---

## Step 3: Setup the Application

```bash
# Extract if you uploaded zip
cd /root
unzip whatsapp-ai.zip -d whatsapp-ai
cd whatsapp-ai

# OR if you uploaded folder directly
cd /root/whatsapp-ai

# Install dependencies
npm install

# Create .env file
nano .env
```

**Paste this into .env:**

```env
PORT=3001

# OpenRouter / Grok
OPENROUTER_API_KEY=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

# Pinecone
PINECONE_API_KEY=pcsk_21QzxN_JCXXsbyvq7GUUYwN7YNPKieqyF3eLz2DP7PZd3uMYRHfYUzAvQ5up7hgyZwetXW
PINECONE_INDEX_HOST=prod-1-data.ke.pinecone.io

# GoHighLevel
GHL_API_KEY=pit-89789df0-5431-4cc6-9787-8d2423d5d120
GHL_LOCATION_ID=dXh04Cd8ixM9hnk1IS5b
GHL_MCP_ENDPOINT=https://services.leadconnectorhq.com/mcp/

# Synthcore WhatsApp (YOUR EXISTING SEND API)
SYNTHCORE_API_KEY=your_actual_synthcore_api_key_here
SYNTHCORE_WHATSAPP_URL=https://api.synthcore.in/api/whatsapp/send

# Supabase
SUPABASE_URL=https://fwvgyjnpxqxhrcbwsjnt.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dmd5am5weHF4aHJjYndzam50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzMjE4MSwiZXhwIjoyMDc5ODA4MTgxfQ.SP0q5C_y4tCbENBW3Pi7r2qri3yx_0Q9AEtoUQ1Y6U4
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 4: Install PM2 and Start the App

```bash
# Install PM2 (if not already installed)
npm install -g pm2

# Start the app
pm2 start server.js --name whatsapp-ai

# Save PM2 config
pm2 save

# Enable auto-start on reboot
pm2 startup

# Check status
pm2 status

# View logs
pm2 logs whatsapp-ai
```

---

## Step 5: Configure Nginx Reverse Proxy

Your VPS already has Nginx running. We need to add a new route for the AI agent.

```bash
# Find your Nginx config
ls /etc/nginx/sites-available/

# Edit the main config (usually 'default' or 'synthcore')
nano /etc/nginx/sites-available/default
```

**Add this location block inside your existing `server` block:**

```nginx
server {
    listen 80;
    server_name api.synthcore.in;

    # Your existing locations (keep them)
    # ...

    # NEW: AI Agent Webhook
    location /webhook/ai {
        proxy_pass http://localhost:3001/webhook/whatsapp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 90s;
    }

    # NEW: AI Dashboard (optional)
    location /ai-dashboard {
        proxy_pass http://localhost:3001;
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
nginx -t

# If OK, reload
systemctl reload nginx
```

---

## Step 6: Update Your WhatsApp Server Webhook

You need to change where your WhatsApp server sends webhooks.

**FIND your WhatsApp server config:**

```bash
# Common locations:
ls /root/whatsapp-server/
ls /var/www/whatsapp/
ls /opt/whatsapp/

# Or search for it
find / -name "*whatsapp*" -type d 2>/dev/null | grep -v node_modules
```

**Once you find it, look for a config file (usually `.env` or `config.json`):**

```bash
# Example if it's in /root/whatsapp-server/
nano /root/whatsapp-server/.env
```

**CHANGE the webhook URL from:**
```
WEBHOOK_URL=https://synthcore8.app.n8n.cloud/webhook-test/webhook/whatsapp
```

**TO:**
```
WEBHOOK_URL=https://api.synthcore.in/webhook/ai
```

**Restart your WhatsApp server:**

```bash
# Find the PM2 process name
pm2 list

# Restart it (replace 'whatsapp-server' with actual name)
pm2 restart whatsapp-server
```

---

## Step 7: Test the Integration

### Test 1: Check if AI Agent is Running

```bash
curl http://localhost:3001/api/status
```

**Expected output:**
```json
{"status":"running","agentReady":true,"totalRequests":0}
```

### Test 2: Send a Test Webhook

```bash
curl -X POST https://api.synthcore.in/webhook/ai \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918123133382", "fromName": "Test", "text": "What are your CRM prices?"}'
```

### Test 3: Check Logs

```bash
# AI Agent logs
pm2 logs whatsapp-ai

# Check server.log
tail -f /root/whatsapp-ai/server.log
```

### Test 4: Send Real WhatsApp Message

Send a message to your WhatsApp number and check:
1. ✅ Message appears in dashboard (ghl-whatsapp-tab.html)
2. ✅ Message syncs to GHL
3. ✅ AI responds automatically
4. ✅ Response appears in WhatsApp

---

## 🔧 Important Configuration Notes

### 1. SYNTHCORE_API_KEY

You need to find your actual Synthcore API key. Check:

```bash
# Check your WhatsApp server config
cat /root/whatsapp-server/.env | grep API_KEY

# Or check any existing config files
grep -r "api.synthcore.in" /root/ 2>/dev/null | grep -i key
```

Update it in `/root/whatsapp-ai/.env` and restart:

```bash
nano /root/whatsapp-ai/.env
# Update SYNTHCORE_API_KEY
pm2 restart whatsapp-ai
```

### 2. Port Configuration

The AI agent runs on **port 3001** (not 3000) to avoid conflicts with your existing services.

If port 3001 is already in use:

```bash
# Check what's using port 3001
lsof -i :3001

# Change to another port in .env
nano /root/whatsapp-ai/.env
# Change PORT=3001 to PORT=3002 (or any free port)

# Update Nginx config accordingly
nano /etc/nginx/sites-available/default
# Change proxy_pass http://localhost:3001 to your new port

# Restart
pm2 restart whatsapp-ai
nginx -t && systemctl reload nginx
```

---

## 🎯 What Stays the Same

✅ **Dashboard:** https://api.synthcore.in/ghl-whatsapp-tab.html (no changes)  
✅ **GHL Sync:** Automatic (no changes)  
✅ **Send API:** https://api.synthcore.in/api/whatsapp/send (no changes)  
✅ **WhatsApp Server:** Keeps running (just webhook URL changes)

---

## 🔄 What Changes

❌ **n8n:** No longer receives webhooks  
✅ **New AI Agent:** Receives webhooks at `https://api.synthcore.in/webhook/ai`  
✅ **Better AI:** Uses Pinecone knowledge base + GHL CRM data + Grok AI

---

## 📊 Monitoring

### Check AI Agent Status

```bash
pm2 status
pm2 logs whatsapp-ai
pm2 monit
```

### View Recent Activity

```bash
tail -f /root/whatsapp-ai/server.log
```

### Access Dashboard

```
https://api.synthcore.in/ai-dashboard
```

---

## 🆘 Troubleshooting

### AI Not Responding?

```bash
# Check if app is running
pm2 status

# Check logs for errors
pm2 logs whatsapp-ai --lines 50

# Check if webhook is reachable
curl https://api.synthcore.in/webhook/ai
```

### WhatsApp Server Not Sending to AI?

```bash
# Check WhatsApp server logs
pm2 logs whatsapp-server

# Verify webhook URL is updated
cat /root/whatsapp-server/.env | grep WEBHOOK
```

### Nginx Errors?

```bash
nginx -t
tail -f /var/log/nginx/error.log
```

### Port Conflicts?

```bash
lsof -i :3001
# Kill process if needed
kill -9 <PID>
pm2 restart whatsapp-ai
```

---

## 🎉 Success Checklist

- [ ] Code uploaded to VPS
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured with correct API keys
- [ ] PM2 running the app (`pm2 status` shows "online")
- [ ] Nginx configured with `/webhook/ai` route
- [ ] WhatsApp server webhook URL updated
- [ ] Test webhook returns 200 OK
- [ ] Real WhatsApp message triggers AI response
- [ ] Response appears in WhatsApp
- [ ] Dashboard still shows conversations
- [ ] GHL still syncs conversations

---

## 🔐 Security Notes

1. **Firewall:** Ensure only necessary ports are open
2. **SSL:** Your existing SSL certificate covers the new endpoint
3. **API Keys:** Keep `.env` file secure (`chmod 600 .env`)
4. **Logs:** Rotate logs to prevent disk space issues

---

## 📞 Need Help?

If you encounter issues:

1. Check PM2 logs: `pm2 logs whatsapp-ai`
2. Check server logs: `tail -f /root/whatsapp-ai/server.log`
3. Check Nginx logs: `tail -f /var/log/nginx/error.log`
4. Verify webhook: `curl https://api.synthcore.in/webhook/ai`

---

## 🚀 You're Done!

Your WhatsApp AI is now running 24/7 on your VPS, replacing n8n with a more powerful, integrated solution!

**Key Benefits:**
- ✅ Faster responses (no external n8n dependency)
- ✅ Better AI (Pinecone knowledge + GHL CRM context)
- ✅ Conversation memory (Supabase)
- ✅ Full control (runs on your VPS)
- ✅ Easy monitoring (PM2 + logs + dashboard)
