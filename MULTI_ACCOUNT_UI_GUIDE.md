# 🎯 Multi-Account WhatsApp-GHL Integration UI Guide

## 📋 Overview

**NEW SYSTEM:** This platform now supports **multiple WhatsApp integrations** for **different GoHighLevel sub-accounts**!

You can now:
- ✅ Connect **multiple WhatsApp numbers** to **different GHL locations**
- ✅ Manage each integration independently
- ✅ View statistics across all integrations
- ✅ Switch between integrations easily

---

## 📁 New File Structure

### **Pages Available:**

1. **`index.html`** - Main Dashboard
   - View all your integrations
   - See statistics (total integrations, active connections, messages, contacts)
   - Quick actions for each integration
   - Add new integrations

2. **`add-integration.html`** - Add New Integration Wizard
   - Step 1: Basic Information (name, description)
   - Step 2: WhatsApp Configuration (Business or API)
   - Step 3: GHL Setup (API key, location ID)
   - Step 4: Review & Create

3. **`manage-integration.html`** - Manage Single Integration
   - View detailed statistics
   - Configure WhatsApp settings
   - Configure GHL settings
   - AI configuration
   - Activity logs
   - Connect/Disconnect/Delete integration

4. **`ghl-whatsapp-tab.html`** - Conversations View (kept from original)
   - View and manage conversations for specific integration

5. **`ai-management-dashboard.html`** - AI Management (kept from original)
   - Train AI for conversations
   - Knowledge base management

6. **`automation-dashboard.html`** - Automation (kept from original)
   - Message templates
   - Automation rules

### **Deleted Pages:**
- ❌ `simple-dashboard.html` (replaced by new index.html)
- ❌ `agent-dashboard.html` (merged into manage-integration.html)

---

## 🚀 How to Use the New System

### **Step 1: Main Dashboard (localhost:3000)**

When you open `http://localhost:3000`, you'll see:

```
┌─────────────────────────────────────────────────────────┐
│  WhatsApp-GHL Integration Manager                       │
│  Manage multiple WhatsApp connections                   │
└─────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Total: 0    │  Active: 0   │  Messages: 0 │  Contacts: 0 │
└──────────────┴──────────────┴──────────────┴──────────────┘

Your Integrations:
┌─────────────────────────────────────────────────────────┐
│  📱 Integration Name                    ✅ CONNECTED    │
│  +1 234 567 8900                                        │
│  Location: Main Business | Messages: 25 | Contacts: 10 │
│  [Manage] [Conversations] [Test] [Disconnect] [Delete] │
└─────────────────────────────────────────────────────────┘

                          [➕] Add New
```

### **Step 2: Adding Your First Integration**

1. Click **"Add New Integration"** button (big + button at bottom-right or top button)

2. **Wizard Step 1: Basic Info**
   - **Integration Name**: e.g., "Main Customer Support"
   - **Description**: Optional description

3. **Wizard Step 2: WhatsApp Configuration**
   
   Choose one of two options:
   
   **Option A: Existing WhatsApp Business** (Recommended for conversations)
   - Your existing WhatsApp Business number
   - Business name
   - Meta App ID (optional)
   
   **Option B: WhatsApp Business API** (For bulk messaging)
   - WhatsApp Business number
   - Phone Number ID (from Meta)
   - Meta Access Token

4. **Wizard Step 3: GHL Configuration**
   - **GHL API Key**: Your GoHighLevel API key
   - **Location ID**: The specific GHL sub-account ID
   - **Location Name**: Friendly name (optional)
   - Click "Test GHL Connection" to verify

5. **Wizard Step 4: Review**
   - Review all your settings
   - Check "Automatically connect after creation" if you want
   - Click "Create Integration"

6. **Done!** You'll be redirected back to the main dashboard

### **Step 3: Managing Integrations**

From the main dashboard, click **"Manage"** on any integration to:

- **Details Tab**: View basic information, edit name/description
- **WhatsApp Settings Tab**: View connection details, reconnect
- **GHL Settings Tab**: View GHL configuration, test connection, force sync
- **AI Configuration Tab**: Enable/disable AI, configure model and prompts
- **Activity Logs Tab**: View all activity for this integration

### **Step 4: Working with Multiple Integrations**

Example scenario: You have 3 sub-accounts in GHL:

1. **Main Business Support**
   - WhatsApp: +1-555-0100
   - GHL Location: Main Location (ID: abc123)
   - AI: Enabled with customer support personality

2. **Sales Team**
   - WhatsApp: +1-555-0200
   - GHL Location: Sales Department (ID: def456)
   - AI: Enabled with sales-focused personality

3. **Product Support**
   - WhatsApp: +1-555-0300
   - GHL Location: Product Team (ID: ghi789)
   - AI: Enabled with technical support personality

Each integration operates **independently**:
- Messages from `+1-555-0100` → Main Location in GHL
- Messages from `+1-555-0200` → Sales Department in GHL
- Messages from `+1-555-0300` → Product Team in GHL

---

## 🔧 Backend API Endpoints Required

To make this UI work, the following API endpoints need to be implemented in `server.js`:

### **Integration Management:**

```javascript
GET    /api/integrations              // List all integrations
POST   /api/integrations              // Create new integration
GET    /api/integrations/:id          // Get single integration
PUT    /api/integrations/:id          // Update integration
DELETE /api/integrations/:id          // Delete integration

POST   /api/integrations/:id/connect     // Connect integration
POST   /api/integrations/:id/disconnect  // Disconnect integration
POST   /api/integrations/:id/test        // Test integration
POST   /api/integrations/:id/sync        // Force sync with GHL
```

### **Data Structure Example:**

```json
{
  "id": "int_abc123",
  "name": "Main Customer Support",
  "description": "Primary customer support line",
  "status": "connected",
  "connectionType": "business",
  
  "whatsappNumber": "+15550100",
  "businessName": "My Business",
  "metaAppId": "",
  
  "ghlApiKey": "pit-xxxxx",
  "ghlLocationId": "abc123",
  "ghlLocationName": "Main Location",
  
  "aiEnabled": true,
  "aiModel": "gpt-4",
  "aiSystemPrompt": "You are a helpful assistant...",
  "aiTemperature": 0.7,
  
  "messagesToday": 25,
  "activeConversations": 5,
  "activeContacts": 10,
  "uptime": 99.5,
  
  "createdAt": "2025-10-17T00:00:00.000Z",
  "updatedAt": "2025-10-17T10:00:00.000Z"
}
```

---

## 💾 Storage Options

You can store integrations in:

1. **Supabase** (Recommended)
   ```sql
   CREATE TABLE integrations (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     status TEXT DEFAULT 'disconnected',
     connection_type TEXT,
     whatsapp_number TEXT,
     business_name TEXT,
     meta_app_id TEXT,
     ghl_api_key_encrypted TEXT,
     ghl_location_id TEXT,
     ghl_location_name TEXT,
     ai_enabled BOOLEAN DEFAULT true,
     ai_model TEXT DEFAULT 'gpt-4',
     ai_system_prompt TEXT,
     ai_temperature FLOAT DEFAULT 0.7,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **JSON File** (For testing)
   ```javascript
   // data/integrations.json
   {
     "integrations": [
       { "id": "int_1", "name": "Main", ... },
       { "id": "int_2", "name": "Sales", ... }
     ]
   }
   ```

3. **In-Memory** (Temporary)
   ```javascript
   let integrations = new Map();
   ```

---

## 🎨 UI Features

### **Main Dashboard (`index.html`)**
- ✅ Real-time statistics across all integrations
- ✅ Status indicators (Connected/Disconnected)
- ✅ Quick actions per integration
- ✅ Floating "Add New" button
- ✅ Empty state when no integrations exist
- ✅ Real-time updates via Socket.IO

### **Add Integration Wizard (`add-integration.html`)**
- ✅ 4-step guided wizard
- ✅ Progress indicators
- ✅ Form validation
- ✅ Connection type selection (Business vs API)
- ✅ GHL connection testing
- ✅ Review before creation

### **Manage Integration (`manage-integration.html`)**
- ✅ Comprehensive statistics
- ✅ 5 tabs (Details, WhatsApp, GHL, AI, Logs)
- ✅ Real-time status updates
- ✅ Connect/Disconnect/Delete actions
- ✅ Test functionality
- ✅ Activity logs

---

## 🔐 Security Considerations

1. **API Keys**: Never store API keys in plain text
   - Encrypt GHL API keys before storing
   - Use environment variables for Meta tokens

2. **Validation**: Validate all inputs
   - Phone number format
   - GHL Location ID format
   - API key format

3. **Rate Limiting**: Prevent abuse
   - Limit number of integrations per user
   - Rate limit API calls

4. **Authentication**: Add user authentication
   - Each user sees only their integrations
   - Role-based access control

---

## 📱 Responsive Design

All pages are **mobile-friendly**:
- ✅ Responsive grid layouts
- ✅ Touch-friendly buttons
- ✅ Collapsible navigation
- ✅ Mobile-optimized forms

---

## 🎯 Next Steps

### **For User:**
1. ✅ Start the server: `npm start`
2. ✅ Open `http://localhost:3000`
3. ✅ Click "Add New Integration"
4. ✅ Fill in your first WhatsApp-GHL connection
5. ✅ Repeat for each sub-account

### **For Developer:**
1. Implement backend API endpoints
2. Set up Supabase table (or use JSON storage)
3. Add authentication (optional)
4. Connect real WhatsApp/GHL services
5. Test multi-account scenarios

---

## 🆘 Support

### **Common Questions:**

**Q: Can I have multiple WhatsApp numbers for one GHL location?**
A: Yes! Create separate integrations with different WhatsApp numbers but same GHL Location ID.

**Q: Can I have one WhatsApp number for multiple GHL locations?**
A: No, each WhatsApp number should map to one GHL location for clarity.

**Q: How do I switch between integrations?**
A: Go to the main dashboard and click "Manage" or "Conversations" on the integration you want to use.

**Q: Can I import/export integrations?**
A: Not yet, but you can add this feature by implementing export/import API endpoints.

---

## 📊 Monitoring

Track these metrics per integration:
- Messages sent/received today
- Active conversations
- Total contacts
- Uptime percentage
- Error rates
- API quota usage

---

## 🎉 Benefits of Multi-Account System

1. **Scalability**: Add unlimited integrations
2. **Organization**: Separate workflows per sub-account
3. **Flexibility**: Different AI personalities per integration
4. **Isolation**: Issues in one integration don't affect others
5. **Reporting**: Track metrics per integration
6. **Team Collaboration**: Different teams can manage their own integrations

---

## 🚀 Start Using It Now!

1. Run your server: `npm start`
2. Open: `http://localhost:3000`
3. Click the **big + button** at the bottom-right
4. Follow the wizard to add your first integration
5. Enjoy managing multiple WhatsApp-GHL connections!

---

**Need help?** Check the browser console for detailed logs and error messages.

**Pro Tip:** Use descriptive integration names like "Support - Main Store" or "Sales - North Region" to easily identify them later!

