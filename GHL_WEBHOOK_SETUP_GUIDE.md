# 🔗 **GHL Webhook Setup Guide**

## 🎯 **Setup GHL Webhook for WhatsApp Integration**

### **✅ What I Added:**
- **Webhook endpoint**: `/webhooks/ghl` in our server
- **Automatic message relay**: GHL → WhatsApp → GHL logging
- **Phone number handling**: Converts GHL contacts to WhatsApp format

### **📋 Setup Steps in GHL:**

#### **Step 1: Access Webhook Settings**
1. **Go to**: GHL Dashboard → Settings → Integrations → Webhooks
2. **Click**: "Add Webhook"

#### **Step 2: Configure Webhook**
- **Event**: `conversation.message.created` or `message.created`
- **Method**: `POST`
- **URL**: `http://localhost:3000/webhooks/ghl`
  - **For production**: Replace with your server URL
- **Headers**: None required
- **Authentication**: None required

#### **Step 3: Test the Integration**
1. **Go to**: Your GHL contact (`+91 81231 33382`)
2. **Open**: SMS conversation
3. **Type**: "Hello what are you"
4. **Send**: The message
5. **Check**: WhatsApp on `+91 81231 33382` - should receive the message

### **🔄 How It Works:**

#### **Message Flow:**
1. **You type** in GHL SMS tab
2. **GHL sends** webhook to our server
3. **Our server** sends via WhatsApp (`+918660395136`)
4. **Contact receives** message on WhatsApp
5. **Message logged** back to GHL conversation

#### **Phone Number Format:**
- **GHL Contact**: `+91 81231 33382`
- **WhatsApp Format**: `+918123133382` (no spaces)
- **Our system** handles the conversion automatically

### **📱 Expected Results:**

#### **When You Send from GHL:**
- **Sender**: `+918660395136` (your WhatsApp Business)
- **Receiver**: `+91 81231 33382` (contact's WhatsApp)
- **Message**: "Hello what are you"
- **GHL Log**: Message appears in conversation history

#### **Server Logs:**
```
GHL Webhook received: {...}
📤 Sending WhatsApp message to +918123133382: Hello what are you
✅ Message logged back to GHL
```

### **🔧 Troubleshooting:**

#### **If Messages Don't Send:**
1. **Check server logs** for webhook errors
2. **Verify webhook URL** is correct
3. **Ensure WhatsApp** is connected (`WhatsApp client is ready!`)
4. **Check phone number** format in GHL contact

#### **If Webhook Not Triggered:**
1. **Verify event type** in GHL webhook settings
2. **Check GHL webhook logs** for delivery status
3. **Test webhook** with a simple POST request

### **🚀 Next Steps:**

1. **Set up the webhook** in GHL (follow steps above)
2. **Test sending** a message from GHL
3. **Check WhatsApp** on the contact's phone
4. **Verify conversation** appears in GHL

### **💡 Pro Tips:**

- **Use localhost** for testing (http://localhost:3000/webhooks/ghl)
- **For production**, use your public server URL
- **Monitor server logs** to see webhook activity
- **Test with different contacts** to ensure it works

### **✅ Summary:**

- **Webhook endpoint**: Added to server ✅
- **GHL integration**: Ready to configure ✅
- **WhatsApp relay**: Automatic ✅
- **Message logging**: Back to GHL ✅

**Now you can send WhatsApp messages directly from GHL!** 🎉

**Follow the setup steps above to connect GHL to your WhatsApp system.**
