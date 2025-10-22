# 🔄 Hybrid Setup Guide: Local WhatsApp + Render Webhooks

## 🎯 The Problem
- Render can't show QR codes (headless)
- WhatsApp Web.js needs authentication
- GHL webhooks need stable URL

## ✅ The Solution: Hybrid Setup

### Architecture:
```
Local Computer          Render Server
┌─────────────────┐    ┌─────────────────┐
│ WhatsApp Client │    │ GHL Webhooks    │
│ (with QR code)  │◄──►│ (stable URL)    │
│                 │    │                 │
│ Port 3000       │    │ Port 10000      │
└─────────────────┘    └─────────────────┘
        ▲                        ▲
        │                        │
        │                        │
┌───────▼────────┐    ┌─────────▼────────┐
│   WhatsApp     │    │   GoHighLevel    │
│   Mobile       │    │   Workflows      │
└────────────────┘    └─────────────────┘
```

## 🚀 Setup Steps:

### Step 1: Keep Local Server Running
- Run your local server (port 3000)
- Scan QR code with WhatsApp mobile
- Keep this connection active

### Step 2: Configure Render for Webhooks Only
- Render handles GHL webhooks
- Render forwards requests to local server
- Local server handles WhatsApp sending

### Step 3: Update GHL Webhooks
- Point GHL to Render URL
- Render forwards to local WhatsApp client

## 📋 Configuration:

### Local Server (.env):
```
NODE_ENV=development
PORT=3000
WHATSAPP_SESSION_NAME=LocalWhatsApp
```

### Render Server (.env):
```
NODE_ENV=production
PORT=10000
LOCAL_WHATSAPP_URL=http://your-public-ip:3000
```

## 🔧 Implementation:

### 1. Modify Render server.js:
```javascript
// Forward WhatsApp requests to local server
app.post('/api/whatsapp/send-template', async (req, res) => {
  try {
    const localUrl = process.env.LOCAL_WHATSAPP_URL;
    const response = await axios.post(`${localUrl}/api/whatsapp/send-template`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Keep Local Server Running:
```bash
npm start  # Keep this running locally
```

### 3. Update GHL Webhooks:
```
https://whatsapp-ghl-integration-77cf.onrender.com/webhooks/ghl
```

## ✅ Benefits:
- Stable Render URL for GHL
- Local WhatsApp connection works
- No QR code issues
- Production-ready webhooks

## ⚠️ Requirements:
- Keep local computer running
- Stable internet connection
- Port forwarding (if needed)
