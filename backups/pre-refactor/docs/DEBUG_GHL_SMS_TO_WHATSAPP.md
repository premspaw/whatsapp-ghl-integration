# Debug: GHL SMS to WhatsApp Not Working

## Problem
- ✅ GHL SMS workflow triggered
- ✅ Message appears in GHL conversations
- ❌ Message NOT sent to WhatsApp mobile
- ❌ Message NOT appearing in WhatsApp tab

## 🔧 Fix Applied - Enhanced Logging

I've added detailed logging to track exactly what's happening.

---

## 🚀 Step 1: Restart Server (REQUIRED!)

**You MUST restart for the new logging to work:**

```bash
# Stop server (Ctrl+C)
npm start
```

Or:
```bash
RESTART_NOW.bat
```

---

## 🔍 Step 2: Check GHL Webhook Configuration

### Go to GHL → Settings → Integrations → Webhooks

**You need a webhook configured like this:**

| Setting | Value |
|---------|-------|
| **URL** | `https://kathi-sensational-rosalyn.ngrok-free.dev/webhooks/ghl` |
| **Method** | POST |
| **Events** | ✅ `ConversationProvider` → `Message` → `Created` |
| **Status** | Active/Enabled |

### Important: Check the Event Type!

The event should be one of these:
- `conversation.message.created` ✅
- `message.created` ✅
- `ConversationProvider Message Created` ✅

**Screenshot of correct configuration:**
```
Event Type: ConversationProvider
Sub-event: Message Created
URL: https://kathi-sensational-rosalyn.ngrok-free.dev/webhooks/ghl
Method: POST
Status: ✅ Active
```

---

## 🧪 Step 3: Test Again

### 3A. Trigger Your Workflow

1. **Go to GHL → Workflows**
2. **Find your workflow** (with tag trigger + SMS action)
3. **Add the tag to a test contact**
   - Or manually trigger the workflow

### 3B. Watch Server Logs

**Your server console should show detailed logs:**

#### ✅ Good Logs (Working):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 GHL WEBHOOK RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full payload: { event: 'conversation.message.created', data: {...} }
🎯 Event type: conversation.message.created
📦 Data received: Yes
🔍 Checking message direction: outbound type: SMS
📋 Message object: { direction: 'outbound', message: 'Test', ... }
✅ OUTBOUND MESSAGE DETECTED!
📞 Contact phone: +918123133382
💬 Message text: Test message from GHL
📤 Preparing to send WhatsApp message to +918123133382: Test message from GHL
🔍 WhatsApp status: { connected: true, serviceExists: true, isReady: true }
✅ WhatsApp message sent successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ WEBHOOK PROCESSING COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### ❌ Bad Logs (Not Working) - Scenarios:

**Scenario 1: Webhook not being called at all**
```
(No webhook logs appear)
```
**Cause:** GHL webhook not configured or wrong URL

**Scenario 2: Wrong event type**
```
📨 GHL WEBHOOK RECEIVED
🎯 Event type: contact.updated
⚠️ Event type not matched for message handling
Received event: contact.updated
Expected: conversation.message.created or message.created
```
**Cause:** Wrong event configured in GHL webhook

**Scenario 3: Not detecting as outbound**
```
🔍 Checking message direction: inbound type: SMS
⚠️ NOT an outbound message - skipping WhatsApp send
```
**Cause:** Message direction is wrong in payload

**Scenario 4: WhatsApp not ready**
```
✅ OUTBOUND MESSAGE DETECTED!
📞 Contact phone: +918123133382
💬 Message text: Test
🔍 WhatsApp status: { connected: false, serviceExists: true, isReady: false }
⏳ WhatsApp not ready, waiting 5 seconds...
```
**Cause:** WhatsApp not connected

---

## 🔧 Fixes Based on Logs

### Fix 1: No Webhook Logs Appearing

**Problem:** Webhook not being called at all

**Solution:**

1. **Check webhook URL in GHL:**
   ```
   https://kathi-sensational-rosalyn.ngrok-free.dev/webhooks/ghl
   ```
   Make sure it's exactly this!

2. **Test webhook manually:**
   ```bash
   curl -X POST https://kathi-sensational-rosalyn.ngrok-free.dev/webhooks/ghl \
     -H "Content-Type: application/json" \
     -d '{
       "event": "conversation.message.created",
       "data": {
         "message": {
           "direction": "outbound",
           "phone": "+918123133382",
           "message": "Test from curl"
         }
       }
     }'
   ```

   You should see the webhook logs in server console.

3. **Check ngrok is running:**
   ```bash
   ngrok http 3000
   ```

### Fix 2: Wrong Event Type

**Problem:** 
```
Received event: contact.tag_added
Expected: conversation.message.created
```

**Solution:**

Go to GHL webhook settings and change event to:
- Event Category: `ConversationProvider`
- Event: `Message Created`

### Fix 3: Not Outbound Message

**Problem:**
```
Message direction: inbound
⚠️ NOT an outbound message
```

**Solution:**

The SMS from GHL workflow should have:
- `direction: "outbound"`
- `type: "SMS"` or `"outbound"`

This should be automatic from GHL. If not, copy the full payload and send it to me.

### Fix 4: WhatsApp Not Ready

**Problem:**
```
🔍 WhatsApp status: { connected: false, isReady: false }
```

**Solution:**

1. **Check WhatsApp tab:**
   ```
   https://kathi-sensational-rosalyn.ngrok-free.dev/ghl-whatsapp-tab.html
   ```
   Should show "Connected" with green dot

2. **Check server logs for:**
   ```
   QR Code received
   WhatsApp client is ready!
   ✅ WhatsApp connection state set to connected
   ```

3. **If not connected:**
   - Restart server
   - Scan QR code
   - Wait for "WhatsApp client is ready!"

---

## 📊 Complete Debug Checklist

Run through this checklist:

### Server Status
- [ ] Server is running (not crashed)
- [ ] No errors in server logs
- [ ] Server accessible at `http://localhost:3000`

### WhatsApp Status
- [ ] WhatsApp tab shows "Connected"
- [ ] Green dot visible in top right
- [ ] Server logs show "WhatsApp client is ready!"

### Ngrok Status
- [ ] Ngrok is running
- [ ] URL: `https://kathi-sensational-rosalyn.ngrok-free.dev`
- [ ] Can access: `https://kathi-sensational-rosalyn.ngrok-free.dev/ghl-whatsapp-tab.html`

### GHL Webhook Configuration
- [ ] Webhook exists in GHL
- [ ] URL is correct: `.../webhooks/ghl`
- [ ] Event type: `conversation.message.created`
- [ ] Status: Active/Enabled

### Workflow Configuration
- [ ] Workflow has trigger (tag/filter/etc)
- [ ] Workflow has SMS action
- [ ] SMS has text content
- [ ] Workflow is Published (not Draft)

---

## 🧪 Quick Test Command

Run this to test webhook directly:

```bash
curl -X POST https://kathi-sensational-rosalyn.ngrok-free.dev/webhooks/ghl \
  -H "Content-Type: application/json" \
  -d '{
    "event": "conversation.message.created",
    "data": {
      "message": {
        "id": "test123",
        "direction": "outbound",
        "type": "SMS",
        "contact": {
          "phone": "+918123133382"
        },
        "message": "Test from command line",
        "body": "Test from command line"
      }
    }
  }'
```

**Expected result:**
- Server logs show webhook received
- WhatsApp message sent to +918123133382
- Message appears in WhatsApp mobile
- Message appears in WhatsApp tab

---

## 🔍 What to Send Me

If it's still not working, send me:

1. **Complete server logs** from when you trigger the workflow (copy the full output)

2. **Webhook configuration screenshot** from GHL

3. **Answer these questions:**
   - Do you see ANY webhook logs when you trigger workflow? (Yes/No)
   - Is WhatsApp showing "Connected" in the tab? (Yes/No)
   - Did you restart server after I added the logging? (Yes/No)

---

## 💡 Common Issues

### Issue: "Webhook received but message not outbound"

**Check:** The SMS action in GHL workflow might be creating an inbound message instead of outbound.

**Fix:** Make sure you're using the "Send SMS" action, not "Add Note" or "Internal Message"

### Issue: "Phone number format wrong"

**Check logs for:**
```
📞 Contact phone: undefined
```

**Fix:** Make sure contact in GHL has phone number set properly

### Issue: "WhatsApp sends but doesn't appear in tab"

**Check:** This means webhook is working! The issue is frontend sync.

**Fix:** Hard refresh the tab (Ctrl+F5)

---

## ✅ Expected Flow

When working correctly:

```
1. GHL Workflow Triggered
   ↓
2. GHL Creates SMS (Outbound)
   ↓
3. GHL Sends Webhook to Your Server
   ↓
4. Server Receives Webhook
   ↓
5. Server Detects: Outbound SMS
   ↓
6. Server Sends via WhatsApp
   ↓
7. Contact Receives on WhatsApp Mobile ✅
   ↓
8. Message Appears in WhatsApp Tab ✅
   ↓
9. Message Syncs Back to GHL ✅
```

---

## 🚀 Next Steps

1. **Restart server** (new logging code)
2. **Check GHL webhook configuration**
3. **Trigger workflow again**
4. **Read server logs carefully**
5. **Tell me what you see in the logs**

The detailed logs will tell us exactly where it's failing!

---

**Ready to debug! Restart server and try again!** 🔍

