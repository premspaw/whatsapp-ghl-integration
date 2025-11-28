# 🔗 Webhook Setup Guide - GoHighLevel

**Your Render URL:** https://whatsapp-ghl-integration-77cf.onrender.com

---

## ✅ What's Been Fixed

I've added the `/send-message` endpoint to your server.js that:

1. ✅ Accepts `number` and `message` from GHL webhooks
2. ✅ Automatically formats phone numbers (adds @c.us)
3. ✅ Checks if WhatsApp is ready before sending
4. ✅ Returns proper success/error responses
5. ✅ Includes detailed logging for debugging

---

## 🔧 Setup Instructions

### Step 1: Push to GitHub & Deploy on Render

```bash
# Add changes
git add server.js

# Commit
git commit -m "Add /send-message webhook endpoint for GHL"

# Push to GitHub
git push origin main
```

Render will automatically redeploy.

### Step 2: Test the Endpoint

After deployment, test it:

```bash
curl -X POST https://whatsapp-ghl-integration-77cf.onrender.com/send-message \
  -H "Content-Type: application/json" \
  -d '{"number":"919876543210","message":"Test message from GHL"}'
```

**Expected Response:**
```json
{
  "success": true,
  "number": "919876543210@c.us",
  "message": "Test message from GHL",
  "messageId": "3EB0123456789ABCDE_"
}
```

### Step 3: Add Webhook to GoHighLevel

1. **Go to GHL Settings**
   - Navigate to: Settings → Integrations → Webhooks

2. **Create New Webhook**
   - Click "Add Webhook"
   - Name: "WhatsApp Message Webhook"
   - URL: `https://whatsapp-ghl-integration-77cf.onrender.com/send-message`
   - Method: **POST**
   - Format: **JSON**

3. **Select Events**
   - ✅ Choose the events you want to trigger messages
   - Recommended: After a contact action, after automation, etc.

---

## 📝 GHL Workflow Setup (Alternative)

### Option A: Direct Webhook (What we set up)

In GHL → Webhooks → Create webhook with:
- URL: `https://whatsapp-ghl-integration-77cf.onrender.com/send-message`
- Format: Send webhook data as `number` and `message`

### Option B: Workflow Automation

1. **Create Workflow in GHL**
   - Add webhook node
   - URL: `https://whatsapp-ghl-integration-77cf.onrender.com/send-message`
   - Method: POST
   - Content Type: application/json

2. **Configure Payload**
   ```
   {
     "number": "{{contact.phone}}",
     "message": "Your message here with {{contact.name}}"
   }
   ```

---

## 🧪 Testing Guide

### Test 1: Health Check

```bash
curl https://whatsapp-ghl-integration-77cf.onrender.com/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "whatsappReady": true,
  "services": {
    "whatsapp": true,
    "ghl": true,
    "ai": true
  }
}
```

### Test 2: Send Message

```bash
curl -X POST https://whatsapp-ghl-integration-77cf.onrender.com/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "number": "919876543210",
    "message": "Hello from GHL!"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "number": "919876543210@c.us",
  "message": "Hello from GHL!",
  "messageId": "3EB0123456789ABCDE_"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "WhatsApp service not ready",
  "details": "Check if WhatsApp is connected"
}
```

### Test 3: Check Logs on Render

1. Go to Render dashboard
2. Click on your service
3. View "Logs" tab
4. Look for: `📨 GHL webhook received - /send-message`

---

## 🔍 Troubleshooting

### Error: 404 Not Found

**Problem:** Endpoint not found  
**Solution:** 
- Make sure you pushed to GitHub
- Check Render logs for deployment errors
- Verify deployment completed successfully

### Error: WhatsApp service not ready

**Problem:** WhatsApp not connected  
**Solution:**
- The webhook endpoint checks if WhatsApp is ready before sending
- You need to scan QR code first on the dashboard
- Make sure WhatsApp Web is connected

### Error: Invalid phone number

**Problem:** Number format incorrect  
**Solution:**
- Number should be digits only (e.g., "919876543210")
- The endpoint automatically adds @c.us suffix
- Don't include @c.us in your GHL webhook payload

### Error: 503 Service Unavailable

**Problem:** WhatsApp client not initialized  
**Solution:**
- Check PM2 status on VPS (if running VPS setup)
- Restart WhatsApp service: `pm2 restart whatsapp-ghl`
- Check logs: `pm2 logs whatsapp-ghl`

---

## 📊 Request/Response Format

### Request from GHL:

```json
{
  "number": "919876543210",
  "message": "Hello, this is a test message from GHL"
}
```

### Response from Your Server:

**Success:**
```json
{
  "success": true,
  "number": "919876543210@c.us",
  "message": "Hello, this is a test message from GHL",
  "messageId": "3EB0123456789ABCDE_"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message here",
  "details": "Additional details"
}
```

---

## 🎯 Next Steps

1. ✅ **Deploy to Render** (push code to GitHub)
2. ✅ **Test the endpoint** (use curl or Postman)
3. ✅ **Add webhook in GHL** (set URL to your endpoint)
4. ✅ **Test with real workflow** (trigger from GHL)
5. ✅ **Monitor logs** (check for errors)

---

## 📞 Support

**Check Endpoints:**
- Health: `https://whatsapp-ghl-integration-77cf.onrender.com/health`
- Send Message: `https://whatsapp-ghl-integration-77cf.onrender.com/send-message`

**View Logs:**
- Go to Render Dashboard → Your Service → Logs

**Test WhatsApp:**
- Go to: `https://whatsapp-ghl-integration-77cf.onrender.com`
- Scan QR code to connect WhatsApp

---

**Everything is ready! Just push to GitHub and test! 🚀**

