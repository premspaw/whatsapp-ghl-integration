# WhatsApp Business API Setup (Production Ready)

## Why This is Better Than QR Code Scanning

✅ **No QR code needed** - Uses official WhatsApp Business API
✅ **Works with serverless** - Perfect for Vercel/Render deployment
✅ **More reliable** - Official API with guaranteed uptime
✅ **Better features** - Templates, media, analytics
✅ **Scalable** - Handles high volume messages

## Setup Steps

### 1. Create WhatsApp Business Account
1. Go to [Facebook Business](https://business.facebook.com/)
2. Create a Business Manager account
3. Add your business information
4. Verify your business (required for production)

### 2. Create WhatsApp Business App
1. In Business Manager, go to "WhatsApp Business Platform"
2. Click "Create App"
3. Choose "Business" as the app type
4. Fill in app details

### 3. Get API Credentials
You'll need these credentials:
- **Phone Number ID** - Your WhatsApp Business phone number
- **Access Token** - Permanent token (not temporary)
- **Webhook Verify Token** - Custom token for webhook verification
- **App Secret** - For webhook signature verification

### 4. Configure Webhooks
1. Set webhook URL: `https://your-domain.vercel.app/api/whatsapp/webhook`
2. Set verify token (same as in your environment variables)
3. Subscribe to events: `messages`, `message_deliveries`

### 5. Environment Variables for Vercel/Render

```bash
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_APP_SECRET=your_app_secret

# GHL Integration
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Cost Comparison

| Method | Setup Cost | Monthly Cost | Reliability |
|--------|------------|--------------|-------------|
| QR Code Scanning | Free | Free | Low (breaks often) |
| WhatsApp Business API | Free | $0.005-0.05 per message | High (99.9% uptime) |

## Message Types Supported

### 1. Text Messages
```javascript
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "text",
  "text": { "body": "Hello! How can I help you?" }
}
```

### 2. Template Messages (Marketing/Notifications)
```javascript
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": { "code": "en_US" }
  }
}
```

### 3. Media Messages
```javascript
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Check out this image!"
  }
}
```

## Deployment Options

### Option A: Vercel (Recommended)
- ✅ Serverless functions
- ✅ Automatic scaling
- ✅ Global CDN
- ✅ Easy deployment

### Option B: Render
- ✅ Persistent web services
- ✅ Background workers
- ✅ Database hosting
- ✅ More control

### Option C: Railway
- ✅ Docker support
- ✅ Persistent connections
- ✅ Easy database setup

## Next Steps

1. **Choose your deployment platform**
2. **Set up WhatsApp Business API**
3. **Configure environment variables**
4. **Deploy your application**
5. **Test with real messages**

Would you like me to help you set up any of these options?
