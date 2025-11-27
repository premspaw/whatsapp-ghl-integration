# Quick Reference - Synthcore VPS Deployment

## 🎯 Goal
Replace n8n with Node.js AI Agent on your existing VPS setup

---

## ⚡ Quick Deploy Commands

### 1. Upload Code (From Windows)
```powershell
cd C:\Users\lenovo\.gemini\antigravity\playground\tachyon-radiation
scp -r * root@api.synthcore.in:/root/whatsapp-ai/
```

### 2. Deploy on VPS
```bash
ssh root@api.synthcore.in
cd /root/whatsapp-ai
chmod +x deploy-synthcore.sh
./deploy-synthcore.sh
```

### 3. Configure Nginx
```bash
nano /etc/nginx/sites-available/default
```

Add this inside `server` block:
```nginx
location /webhook/ai {
    proxy_pass http://localhost:3001/webhook/whatsapp;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 90s;
}
```

Save, then:
```bash
nginx -t && systemctl reload nginx
```

### 4. Update WhatsApp Server Webhook
```bash
# Find your WhatsApp server config
find /root /var/www /opt -name "*whatsapp*" -type d 2>/dev/null | grep -v node_modules

# Edit config (adjust path to your actual location)
nano /root/whatsapp-server/.env

# Change webhook URL to:
WEBHOOK_URL=https://api.synthcore.in/webhook/ai

# Restart WhatsApp server
pm2 restart whatsapp-server
```

### 5. Test
```bash
# Test AI endpoint
curl http://localhost:3001/api/status

# Test webhook
curl -X POST https://api.synthcore.in/webhook/ai \
  -H "Content-Type: application/json" \
  -d '{"phone": "+918123133382", "text": "test"}'

# Check logs
pm2 logs whatsapp-ai
```

---

## 🔑 Important: Update API Key

```bash
nano /root/whatsapp-ai/.env
# Update SYNTHCORE_API_KEY with your actual key
pm2 restart whatsapp-ai
```

---

## 📊 Monitoring

```bash
pm2 status                    # Check status
pm2 logs whatsapp-ai          # View logs
pm2 monit                     # Live monitoring
tail -f /root/whatsapp-ai/server.log  # Application logs
```

---

## 🔄 Architecture

**BEFORE (with n8n):**
```
WhatsApp → VPS → GHL Sync + Dashboard
                 ↓
              n8n (cloud) → AI Response
```

**AFTER (with Node.js):**
```
WhatsApp → VPS → GHL Sync + Dashboard
                 ↓
              AI Agent (VPS) → AI Response
```

---

## ✅ What Changes
- ❌ n8n webhook removed
- ✅ New endpoint: `https://api.synthcore.in/webhook/ai`
- ✅ AI runs on your VPS (port 3001)

## ✅ What Stays Same
- ✅ Dashboard: `https://api.synthcore.in/ghl-whatsapp-tab.html`
- ✅ GHL sync (automatic)
- ✅ Send API: `https://api.synthcore.in/api/whatsapp/send`
- ✅ WhatsApp server (just webhook URL changes)

---

## 🆘 Troubleshooting

**AI not responding?**
```bash
pm2 logs whatsapp-ai --lines 50
```

**Port conflict?**
```bash
lsof -i :3001
# Change PORT in .env if needed
```

**Webhook not working?**
```bash
curl https://api.synthcore.in/webhook/ai
tail -f /var/log/nginx/error.log
```

---

## 📖 Full Documentation
See: `DEPLOYMENT_SYNTHCORE.md`
