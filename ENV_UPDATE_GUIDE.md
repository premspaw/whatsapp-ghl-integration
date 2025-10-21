# 🔧 .env File Update Guide

## ✅ Current Status

Your `.env` file is **mostly configured**! Here's what you have:

```
✅ GHL_API_KEY          = pit-89789df0-5431-4cc6-9787-8d2423d5d120
✅ GHL_LOCATION_ID      = dXh04Cd8ixM9hnk1IS5b  
✅ OPENROUTER_API_KEY   = Configured
✅ USE_MOCK_WHATSAPP    = false (Real WhatsApp mode)
✅ PORT                 = 3000
```

## ⚠️ Missing Configuration

You need to add **Supabase credentials** for advanced features:

### Why Supabase is Important:
- 🤖 **AI Memory**: Stores conversation history for context-aware replies
- 📦 **Vector Embeddings**: Powers RAG (Retrieval Augmented Generation)
- 💾 **Message Persistence**: Permanent message storage
- 👥 **Contact Management**: Sync and store contact data
- 🎯 **Human Handoff**: Track agent assignments

---

## 📝 Quick Fix: Add These Lines

**Open your `.env` file and add these sections:**

### 1. WhatsApp Message Filtering (Add after line 3)

```env
# WhatsApp Message Filtering
FILTER_GROUP_MESSAGES=true
FILTER_BROADCAST_MESSAGES=true
FILTER_COMPANY_MESSAGES=true
```

### 2. GHL Channel Mode (Add after GHL_BASE_URL)

```env
GHL_CHANNEL_MODE=sms
```

### 3. Supabase Configuration (Add after NODE_ENV)

```env
# Supabase Configuration (REQUIRED for database features)
# Get from: https://app.supabase.com → Your Project → Settings → API
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_SCHEMA=public
```

---

## 🚀 How to Get Supabase Credentials

### Step 1: Create Supabase Project (5 minutes)

1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"New Project"**
3. Sign in with GitHub (recommended)
4. Create new organization (if needed)
5. Create new project:
   - **Name**: `whatsapp-ghl-integration`
   - **Database Password**: (generate strong password - save it!)
   - **Region**: Choose closest to you
   - **Pricing**: Free tier is fine for testing
6. Wait 2-3 minutes for project to initialize

### Step 2: Get API Credentials

1. Once project is ready, go to **Settings** (⚙️ icon in sidebar)
2. Click **"API"** in the left menu
3. Copy the following:

```
Project URL:        https://xxxxxxxxx.supabase.co
anon public key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Update .env File

```env
SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...service_role...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...anon...
SUPABASE_SCHEMA=public
```

### Step 4: Run Database Migrations

1. In Supabase dashboard, click **"SQL Editor"** in sidebar
2. Click **"New query"**
3. Copy and paste contents of: `data/migrations/001_init.sql`
4. Click **"Run"** (or press Ctrl+Enter)
5. Repeat for:
   - `data/migrations/002_match_embeddings.sql`
   - `data/migrations/003_handoff.sql`

### Step 5: Verify Setup

```bash
# Restart your server
npm start

# Check database connection
curl http://localhost:3000/api/db/status

# Expected response:
# {"configured":true,"connected":true}
```

---

## 🎯 Your Complete .env File Should Look Like:

```env
# ═══════════════════════════════════════════════════════════
# WHATSAPP CONFIGURATION
# ═══════════════════════════════════════════════════════════
WHATSAPP_SESSION_NAME=Mywhatsapp
USE_MOCK_WHATSAPP=false

# WhatsApp Message Filtering
FILTER_GROUP_MESSAGES=true
FILTER_BROADCAST_MESSAGES=true
FILTER_COMPANY_MESSAGES=true

# ═══════════════════════════════════════════════════════════
# GOHIGHLEVEL API CONFIGURATION
# ═══════════════════════════════════════════════════════════
GHL_API_KEY=pit-89789df0-5431-4cc6-9787-8d2423d5d120
GHL_LOCATION_ID=dXh04Cd8ixM9hnk1IS5b
GHL_BASE_URL=https://services.leadconnectorhq.com
GHL_CHANNEL_MODE=sms

# ═══════════════════════════════════════════════════════════
# AI CONFIGURATION
# ═══════════════════════════════════════════════════════════
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_REFERER=http://localhost:3000

# ═══════════════════════════════════════════════════════════
# SERVER CONFIGURATION
# ═══════════════════════════════════════════════════════════
PORT=3000
NODE_ENV=development

# ═══════════════════════════════════════════════════════════
# SUPABASE CONFIGURATION (Add your credentials here)
# ═══════════════════════════════════════════════════════════
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_SCHEMA=public

# ═══════════════════════════════════════════════════════════
# SMS CONFIGURATION (OPTIONAL)
# ═══════════════════════════════════════════════════════════
SMS_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_FROM_NUMBER=

# ═══════════════════════════════════════════════════════════
# EMAIL CONFIGURATION (OPTIONAL)
# ═══════════════════════════════════════════════════════════
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
# EMAIL_USER=
# EMAIL_PASS=
# EMAIL_FROM=
```

---

## 🧪 Testing Your Configuration

### Test 1: Basic Server Start
```bash
npm start
```
Expected: Server starts without errors

### Test 2: Database Connection
```bash
# In another terminal:
curl http://localhost:3000/api/db/status
```
Expected: `{"configured":true,"connected":true}`

### Test 3: GHL Connection
```bash
curl http://localhost:3000/api/ghl/contacts?limit=5
```
Expected: List of your GHL contacts

### Test 4: Send Test Message
```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1234567890","message":"Test message"}'
```

---

## 📊 What Each Feature Needs

| Feature | Required Env Vars | Status |
|---------|-------------------|--------|
| **Basic Server** | PORT, NODE_ENV | ✅ Configured |
| **WhatsApp** | WHATSAPP_SESSION_NAME | ✅ Configured |
| **GHL Sync** | GHL_API_KEY, GHL_LOCATION_ID | ✅ Configured |
| **AI Replies** | OPENROUTER_API_KEY | ✅ Configured |
| **Database** | SUPABASE_* (3 vars) | ⚠️ **Needs Setup** |
| **SMS** | TWILIO_* (3 vars) | ⚪ Optional |
| **Email** | EMAIL_* (5 vars) | ⚪ Optional |

---

## 🎯 Priority Setup Order

1. ✅ **DONE**: Server, WhatsApp, GHL, AI
2. **DO NEXT**: Supabase (15 minutes)
3. **OPTIONAL**: SMS (if needed)
4. **OPTIONAL**: Email (if needed)

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Check SUPABASE_URL is correct (should start with https://)
- Verify SUPABASE_SERVICE_ROLE_KEY is the **service_role** key, not anon key
- Run migrations in Supabase SQL Editor

### "GHL API errors"
- Verify GHL_API_KEY is valid (test in GHL API settings)
- Check GHL_LOCATION_ID matches your actual location

### "AI replies not working"
- Check OPENROUTER_API_KEY has credits
- Test at: https://openrouter.ai/activity
- Try different model: OPENROUTER_MODEL=openai/gpt-3.5-turbo

---

## 📞 Quick Support

**Stuck?** Check these files:
- `QUICK_CHECKLIST.md` - Step-by-step setup
- `PROJECT_STATUS_SUMMARY.md` - Full system overview
- `TROUBLESHOOTING.md` - Common issues

**Still stuck?** Run:
```bash
node test-complete-flow.js
```
This will test all systems and report what's working/broken.

---

## 🎉 Once Everything is Set Up

You'll have:
- ✅ WhatsApp messages synced to GHL
- ✅ AI-powered automatic replies with context
- ✅ RAG system learning from your documents
- ✅ Full conversation history in database
- ✅ Human handoff when needed
- ✅ Real-time dashboards

**It's worth the 15 minutes to set up Supabase!** 🚀

---

*Last Updated: October 17, 2025*

