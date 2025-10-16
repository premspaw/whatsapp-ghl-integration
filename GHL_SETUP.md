# GoHighLevel (GHL) Setup Guide

## 🔗 **Step-by-Step GHL Integration**

### **Step 1: Get Your GHL API Credentials**

#### **1.1 Login to GoHighLevel**
- Go to [GoHighLevel.com](https://gohighlevel.com)
- Login to your account

#### **1.2 Get API Key**
1. Navigate to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Give it a name: `WhatsApp Integration`
4. Copy the API Key (starts with `sk_...`)

#### **1.3 Get Location ID**
1. Go to **Settings** → **Company Settings**
2. Find your **Location ID** (long number)
3. Copy this Location ID

### **Step 2: Configure GHL in Your System**

#### **Method 1: Using Setup Script (Recommended)**
```bash
npm run setup-ghl YOUR_API_KEY YOUR_LOCATION_ID
```

**Example:**
```bash
npm run setup-ghl sk_1234567890abcdef 123456789
```

#### **Method 2: Manual Configuration**
Edit your `.env` file:
```env
# GoHighLevel API Configuration
GHL_API_KEY=sk_your_actual_api_key_here
GHL_LOCATION_ID=your_actual_location_id_here
GHL_BASE_URL=https://services.leadconnectorhq.com
```

### **Step 3: Test GHL Connection**

#### **3.1 Start the Application**
```bash
npm start
```

#### **3.2 Check GHL Status**
- Open http://localhost:3000
- Look for GHL status indicator
- Should show "Connected" if configured correctly

#### **3.3 Test GHL API**
```bash
# Test GHL connection
curl http://localhost:3000/api/ghl/contacts
```

### **Step 4: Verify Integration**

#### **4.1 Check System Status**
```bash
npm run test-mock
```

#### **4.2 Test Conversation Sync**
1. Go to http://localhost:3000/mock-test.html
2. Trigger a mock conversation
3. Enable "GHL Sync" for the conversation
4. Check if contact appears in your GHL account

## 🔧 **GHL Integration Features**

### **What Gets Synced to GHL:**

1. **Contacts**
   - WhatsApp contact information
   - Phone numbers
   - Conversation history

2. **Conversations**
   - Message history
   - Timestamps
   - Message types (text, media)

3. **AI Interactions**
   - AI-generated replies
   - Conversation context
   - Sentiment analysis

### **GHL API Endpoints Used:**

- `GET /contacts` - Fetch contacts
- `POST /contacts` - Create new contacts
- `PUT /contacts/{id}` - Update contact information
- `GET /conversations` - Fetch conversations
- `POST /conversations` - Create conversations
- `POST /conversations/{id}/messages` - Add messages

## 🚨 **Troubleshooting GHL Connection**

### **Common Issues:**

#### **1. "Invalid API Key" Error**
- Check if API key is correct
- Ensure API key starts with `sk_`
- Verify API key is active in GHL

#### **2. "Location Not Found" Error**
- Check Location ID is correct
- Verify Location ID matches your GHL account
- Ensure you have access to that location

#### **3. "Permission Denied" Error**
- Check API key permissions in GHL
- Ensure API key has necessary scopes
- Verify your GHL plan includes API access

#### **4. "Rate Limit Exceeded" Error**
- GHL has API rate limits
- Implement request throttling
- Check your GHL plan limits

### **Debug Commands:**

```bash
# Check GHL connection
curl http://localhost:3000/api/ghl/contacts

# Check system status
npm run debug

# Test mock system with GHL
npm run test-mock
```

## 📊 **GHL Integration Benefits**

### **Automatic Contact Creation:**
- New WhatsApp contacts → GHL contacts
- Phone number matching
- Contact information sync

### **Conversation Tracking:**
- All WhatsApp messages → GHL conversations
- Message timestamps
- Conversation history

### **AI-Powered Insights:**
- Sentiment analysis
- Intent detection
- Conversation summaries

### **Lead Management:**
- Qualify leads automatically
- Tag conversations
- Create opportunities

## 🎯 **Next Steps After GHL Setup**

### **1. Test the Complete Flow:**
```bash
# 1. Start the application
npm start

# 2. Open mock testing
# Go to http://localhost:3000/mock-test.html

# 3. Trigger a conversation
# Click "Customer Support" scenario

# 4. Enable GHL sync
# Toggle "GHL Sync" in the conversation

# 5. Check GHL account
# Verify contact and conversation appear
```

### **2. Configure AI Replies:**
- Enable AI replies for conversations
- Test different AI models
- Customize AI prompts

### **3. Set Up Real WhatsApp:**
- When ready, switch from mock to real WhatsApp
- Set `USE_MOCK_WHATSAPP=false` in .env
- Scan QR code with your WhatsApp

## 💡 **Pro Tips**

### **GHL Best Practices:**
1. **Tag Conversations** - Use GHL tags for organization
2. **Create Opportunities** - Convert conversations to deals
3. **Set Up Workflows** - Automate follow-ups
4. **Use Custom Fields** - Store additional contact data

### **Integration Optimization:**
1. **Monitor API Usage** - Track GHL API calls
2. **Implement Caching** - Reduce API requests
3. **Error Handling** - Graceful fallbacks
4. **Logging** - Track sync operations

## 📞 **Support Resources**

- **GHL API Documentation**: [GoHighLevel API Docs](https://highlevel.stoplight.io/)
- **GHL Support**: Contact through your GHL account
- **Integration Issues**: Check system logs and error messages

## ✅ **Verification Checklist**

- [ ] GHL API key configured
- [ ] Location ID set correctly
- [ ] GHL connection test successful
- [ ] Mock conversations syncing to GHL
- [ ] AI replies working
- [ ] Contact creation in GHL
- [ ] Conversation history preserved

Your GHL integration is now ready! The system will automatically sync WhatsApp conversations to your GoHighLevel account.
