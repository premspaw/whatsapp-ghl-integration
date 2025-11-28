# 🚀 Test GHL Webhook → Template Messages NOW!

## ✅ Your Current Setup:

1. **VPS WhatsApp:** `https://api.synthcore.in/` (running WhatsApp)
2. **Render Deployment:** `https://whatsapp-ghl-integration-77cf.onrender.com/` (main app)
3. **WhatsApp:** Connected ✅

## 🎯 Test Plan:

### **Current Status Check:**

Open these URLs in your browser:

1. **Render Dashboard:**
   ```
   https://whatsapp-ghl-integration-77cf.onrender.com/
   ```
   
   **Expected:** Shows the integration dashboard

2. **API Health Check:**
   ```
   https://whatsapp-ghl-integration-77cf.onrender.com/api/health
   ```
   
   **Expected:** `{ "status": "running" }`

3. **Check Templates:**
   ```
   https://whatsapp-ghl-integration-77cf.onrender.com/api/templates
   ```
   
   **Expected:** List of templates including `welcome`

---

## 🔧 STEP 1: Configure GHL Webhook

### **Option A: Using GHL Workflow (Recommended)**

1. **Go to:** GHL → Workflows → Create New Automation
2. **Trigger:** Contact Created / Form Submitted / etc.
3. **Add Action:** Custom Webhook
4. **Configure:**

   **URL:**
   ```
   https://whatsapp-ghl-integration-77cf.onrender.com/api/whatsapp/send-template
   ```

   **Method:** `POST`
   
   **Headers:**
   ```
   Content-Type: application/json
   ```

   **Custom Data (Key-Value Pairs):**
   ```
   Key: to           Value: {{contact.phone}}
   Key: templateName Value: welcome
   Key: variables    Value: {"name":"{{contact.first_name}}"}
   ```

---

## 🧪 STEP 2: Test the Webhook

### **Option A: Test from GHL**

1. **Trigger the workflow** (create a contact, submit a form, etc.)
2. **Check Render logs** for incoming request
3. **Check WhatsApp** on the contact's phone
4. **Check GHL conversation** tab

### **Option B: Test via Browser/Postman**

**Open Postman or any API tester:**

```bash
POST https://whatsapp-ghl-integration-77cf.onrender.com/api/whatsapp/send-template

Headers:
Content-Type: application/json

Body (JSON):
{
  "to": "+918123133382",
  "templateName": "welcome",
  "variables": {
    "name": "Prem"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Template message sent successfully",
  "sentMessage": {
    "to": "+918123133382",
    "template": "welcome",
    "content": "Hi Prem this new automation working checking"
  }
}
```

---

## 📋 STEP 3: Verify Everything Works

### **Checklist:**

- [ ] **Render is running** - Open dashboard URL
- [ ] **WhatsApp is connected** - Check `/api/whatsapp/status`
- [ ] **Templates exist** - Check `/api/templates`
- [ ] **Webhook URL is correct** - `https://whatsapp-ghl-integration-77cf.onrender.com/api/whatsapp/send-template`
- [ ] **Test message sent** - Check WhatsApp mobile
- [ ] **GHL conversation updated** - Check GHL conversations tab

---

## 🌐 STEP 4: Ensure Render Stays Online 24/7

### **Current Setup:**

Your Render deployment will **automatically:**
- ✅ **Start when triggered** (keeps running)
- ✅ **Wake up** when receiving webhooks
- ✅ **Stay online** for free tier (sleeps after 15 minutes of inactivity)

### **For 24/7 Always-On:**

**Render Free Tier:**
- Sleeps after 15 minutes of inactivity
- Wakes up when webhook is triggered
- Takes 30-60 seconds to wake up

**Render Paid Tier:**
- Always stays awake
- Instant response
- No wake-up delay

### **Verify Render is Awake:**

```bash
curl https://whatsapp-ghl-integration-77cf.onrender.com/api/health
```

If it takes 30-60 seconds to respond, it was sleeping but woke up ✅

---

## 🆘 Troubleshooting:

### **Issue 1: Render shows "No integrations"**

**Fix:**
- This is normal if Render is freshly deployed
- Render doesn't store session data
- **Solution:** You need to scan QR code on Render

**How to connect WhatsApp on Render:**

1. **Open:** `https://whatsapp-ghl-integration-77cf.onrender.com/`
2. **Look for:** QR code in the page or logs
3. **Scan** with WhatsApp mobile
4. **Verify:** Shows "WhatsApp connected"

---

### **Issue 2: Webhook returns 404 or 500**

**Check:**
1. **Server logs** on Render dashboard
2. **WhatsApp connection status:** Is it connected?
3. **Environment variables:** Are they set correctly?

**Quick Fix:**
```bash
# Check if Render is running
curl https://whatsapp-ghl-integration-77cf.onrender.com/api/health

# Check WhatsApp status
curl https://whatsapp-ghl-integration-77cf.onrender.com/api/whatsapp/status
```

---

### **Issue 3: Messages not sending via Render**

**Why:** Render doesn't have WhatsApp session by default

**Solution:** Use VPS for WhatsApp (your current setup is better!)

**Better Approach:** Keep using `api.synthcore.in` for WhatsApp connections

---

## 💡 RECOMMENDED ARCHITECTURE:

Based on your current setup, here's what you should do:

```
┌─────────────────────────────────────────────────┐
│ GHL Workflow                                     │
│ Triggers                                         │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ Render App                                       │
│ https://whatsapp-ghl-integration-77cf...        │
│ Handles:                                         │
│ - Template lookup                                 │
│ - Variable replacement                            │
│ - Business logic                                  │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│ VPS WhatsApp                                     │
│ https://api.synthcore.in/                       │
│ Handles:                                         │
│ - WhatsApp connection                            │
│ - Message sending                                │
│ - Receiving messages                             │
└─────────────────────────────────────────────────┘
```

---

## 🎯 SOLUTION: Hybrid Setup

### **Keep What You Have:**

1. **Render:** Main application logic, API endpoints
2. **VPS:** WhatsApp connection and sending

### **But You Need to Connect Them:**

**Option 1: Use VPS directly for webhooks**

**GHL Webhook URL:**
```
https://api.synthcore.in/api/whatsapp/send-template
```

**Custom Data:**
```
to: {{contact.phone}}
templateName: welcome
variables: {"name":"{{contact.first_name}}"}
```

**This is the SIMPLEST solution!** ✅

---

## 🧪 QUICK TEST:

**Right now, test this:**

```bash
# Open browser or Postman
POST https://api.synthcore.in/api/whatsapp/send-template

Headers:
Content-Type: application/json

Body:
{
  "to": "+918123133382",
  "templateName": "welcome",
  "variables": {
    "name": "Prem"
  }
}
```

**Expected:**
- ✅ Returns success
- ✅ Message received on WhatsApp
- ✅ GHL conversation updated

---

## ✅ NEXT STEPS:

1. **Test VPS webhook** (from GHL or Postman)
2. **Verify message is sent** via WhatsApp
3. **Check GHL** conversation tab shows the message
4. **Set up GHL workflow** with the webhook URL
5. **Test end-to-end** automation

---

## 🎉 YOUR CURRENT SETUP IS PERFECT!

**You have:**
- ✅ VPS with WhatsApp connected
- ✅ Render deployment for the app
- ✅ Template system ready

**Just use VPS URL for webhooks!** 🚀

---

## 📝 WEBHOOK CONFIGURATION:

### **In GHL Workflow:**

**URL:**
```
https://api.synthcore.in/api/whatsapp/send-template
```

**Method:** POST

**Content-Type:** application/json

**Custom Data:**
```
Key: to
Value: {{contact.phone}}

Key: templateName
Value: welcome

Key: variables
Value: {"name":"{{contact.first_name}}"}
```

---

## 🚀 TEST IT NOW!

1. **Open GHL** → Workflows → Create New
2. **Add trigger** (Contact Created, Form Submitted, etc.)
3. **Add Custom Webhook** action
4. **Set URL:** `https://api.synthcore.in/api/whatsapp/send-template`
5. **Add custom data** (from above)
6. **Save and Test!**

**Result:** Template message sent via WhatsApp! 🎉

