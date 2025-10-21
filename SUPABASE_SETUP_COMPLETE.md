# 🎯 Your Supabase Setup - Complete Guide

**Your Credentials Received!** ✅

---

## 📋 STEP 1: Add to .env File

Open your `.env` file and add these lines (after `NODE_ENV=development`):

```env
# ═══════════════════════════════════════════════════════════
# SUPABASE CONFIGURATION
# ═══════════════════════════════════════════════════════════
SUPABASE_URL=https://sroctkdugjdsaberrlkf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2N0a2R1Z2pkc2FiZXJybGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjU1MzksImV4cCI6MjA3MzM0MTUzOX0.f04DyTsi2ByVaQ_L44Wa_IJOadnqjDV9n66n3Cd3jEg
SUPABASE_SERVICE_ROLE_KEY=<PASTE_FULL_SERVICE_ROLE_KEY_HERE>
SUPABASE_SCHEMA=public
```

### ⚠️ IMPORTANT: Get Complete Service Role Key

1. Go to: https://app.supabase.com/project/sroctkdugjdsaberrlkf/settings/api
2. Scroll to **"Project API keys"**
3. Find **"service_role" key** (marked as secret)
4. Click "👁️ Reveal" to show the full key
5. Copy the **COMPLETE** key (it's very long, ~250+ characters)
6. Paste it in the .env file replacing `<PASTE_FULL_SERVICE_ROLE_KEY_HERE>`

**The service_role key should look like:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2N0a2R1Z2pkc2FiZXJybGtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NTUzOSwiZXhwIjoyMDczMzQxNTM5fQ.XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
(Your actual key will be different and longer)

---

## 📋 STEP 2: Run Database Migrations

Once you've added the service_role key, run these commands:

### Option A: Use Our Migration Script (Recommended)

```bash
node run-supabase-migrations.js
```

### Option B: Manual Migration (via Supabase Dashboard)

1. Open Supabase Dashboard: https://app.supabase.com/project/sroctkdugjdsaberrlkf
2. Click **"SQL Editor"** in the left sidebar
3. Click **"+ New query"**

**Run Migration 1:**
```sql
-- Copy and paste entire contents of: data/migrations/001_init.sql
-- Then click "Run" or press Ctrl+Enter
```

**Run Migration 2:**
```sql
-- New query → Copy/paste: data/migrations/002_match_embeddings.sql
-- Click "Run"
```

**Run Migration 3:**
```sql
-- New query → Copy/paste: data/migrations/003_handoff.sql
-- Click "Run"
```

---

## 📋 STEP 3: Verify Setup

```bash
# Start the server
npm start

# In another terminal, test the database connection:
curl http://localhost:3000/api/db/status
```

**Expected response:**
```json
{
  "configured": true,
  "connected": true
}
```

✅ If you see this, you're all set!

---

## 📋 OPTIONAL: Add Recommended Settings

While you have the `.env` file open, also add these helpful settings:

```env
# WhatsApp Message Filtering (add after USE_MOCK_WHATSAPP)
FILTER_GROUP_MESSAGES=true
FILTER_BROADCAST_MESSAGES=true
FILTER_COMPANY_MESSAGES=true

# GHL Channel Mode (add after GHL_BASE_URL)
GHL_CHANNEL_MODE=sms
```

---

## 🎯 Your Complete .env File Should Look Like:

```env
# WhatsApp Configuration
WHATSAPP_SESSION_NAME=Mywhatsapp
USE_MOCK_WHATSAPP=false
FILTER_GROUP_MESSAGES=true
FILTER_BROADCAST_MESSAGES=true
FILTER_COMPANY_MESSAGES=true

# GoHighLevel API Configuration
GHL_API_KEY=pit-89789df0-5431-4cc6-9787-8d2423d5d120
GHL_LOCATION_ID=dXh04Cd8ixM9hnk1IS5b
GHL_BASE_URL=https://services.leadconnectorhq.com
GHL_CHANNEL_MODE=sms

# OpenRouter Configuration for AI Replies
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_REFERER=http://localhost:3000

# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://sroctkdugjdsaberrlkf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2N0a2R1Z2pkc2FiZXJybGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjU1MzksImV4cCI6MjA3MzM0MTUzOX0.f04DyTsi2ByVaQ_L44Wa_IJOadnqjDV9n66n3Cd3jEg
SUPABASE_SERVICE_ROLE_KEY=<YOUR_COMPLETE_SERVICE_ROLE_KEY>
SUPABASE_SCHEMA=public

# SMS Configuration (Optional)
SMS_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_FROM_NUMBER=

# Email Configuration (Optional)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=
# EMAIL_PASS=
```

---

## 🚀 After Setup

Once everything is configured:

```bash
# 1. Start server
npm start

# 2. Open browser
http://localhost:3000

# 3. Scan WhatsApp QR code

# 4. Send test message

# 5. Check these dashboards:
http://localhost:3000/simple-dashboard.html
http://localhost:3000/ai-management-dashboard.html
http://localhost:3000/agent-dashboard.html
```

---

## 🎉 What You'll Have

With Supabase configured, you now have:

✅ **Persistent Message Storage** - All messages saved to database  
✅ **AI Conversation Memory** - AI remembers context across sessions  
✅ **Vector Embeddings** - RAG for smart document learning  
✅ **Contact Management** - Full contact history and metadata  
✅ **Human Handoff** - Agent assignment and tracking  
✅ **Advanced Analytics** - Query conversation data  

---

## 🆘 Troubleshooting

### Error: "Cannot connect to database"

**Check:**
1. Is `SUPABASE_URL` correct? (Should start with https://)
2. Is `SUPABASE_SERVICE_ROLE_KEY` the full key? (Very long, 250+ chars)
3. Did you copy the **service_role** key (not anon key)?

**Fix:**
- Go back to Supabase dashboard → Settings → API
- Re-copy the service_role key (click reveal button)
- Make sure to copy the ENTIRE key
- Paste into .env

### Error: "relation does not exist"

**Cause:** Migrations not run

**Fix:**
```bash
# Run migrations manually in Supabase SQL Editor
# Or use: node run-supabase-migrations.js
```

### Error: "Invalid API key"

**Cause:** Wrong key or key has spaces/newlines

**Fix:**
- Remove any spaces or line breaks from the key
- Key should be one continuous string
- No quotes needed in .env file

---

## 📞 Quick Links

- **Your Supabase Dashboard:** https://app.supabase.com/project/sroctkdugjdsaberrlkf
- **API Settings:** https://app.supabase.com/project/sroctkdugjdsaberrlkf/settings/api
- **SQL Editor:** https://app.supabase.com/project/sroctkdugjdsaberrlkf/sql
- **Table Editor:** https://app.supabase.com/project/sroctkdugjdsaberrlkf/editor

---

## ✅ Checklist

- [ ] Added SUPABASE_URL to .env
- [ ] Added SUPABASE_ANON_KEY to .env  
- [ ] Got full service_role key from dashboard
- [ ] Added SUPABASE_SERVICE_ROLE_KEY to .env
- [ ] Ran migration 001_init.sql
- [ ] Ran migration 002_match_embeddings.sql
- [ ] Ran migration 003_handoff.sql
- [ ] Tested: curl http://localhost:3000/api/db/status
- [ ] Received: {"configured":true,"connected":true}

---

**You're almost there! Just need the complete service_role key and run migrations! 🚀**

*Questions? Check: TROUBLESHOOTING.md or ENV_UPDATE_GUIDE.md*

