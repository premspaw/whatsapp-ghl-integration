# GHL Marketplace App Configuration Summary

## Current Configuration (Using ngrok for testing)

### 1. Custom Page (Dashboard)
**URL**: `https://eurychoric-inwrought-tijuana.ngrok-free.dev/whatsapp-dashboard.html`
- This is the custom UI that appears in GHL when users click on your app
- Shows WhatsApp conversations and AI management

### 2. Conversation Provider Delivery Link (Outbound Webhook)
**URL**: `https://eurychoric-inwrought-tijuana.ngrok-free.dev/provider/outbound`
- GHL sends messages TO this endpoint when a contact sends a message
- Your server receives the message, processes with AI, and sends reply back to GHL

### 3. OAuth Redirect URI
**URL**: `https://eurychoric-inwrought-tijuana.ngrok-free.dev/api/oauth/callback`
- Handles OAuth authorization when sub-accounts install your app
- Exchanges authorization code for access token

## Message Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    GHL Sub-Account User                       │
│              (Installs your Marketplace App)                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ 1. OAuth Authorization
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  /api/oauth/callback                                          │
│  - Receives auth code                                         │
│  - Exchanges for access token                                 │
│  - Stores token in ghl_database.json                          │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ 2. User opens custom page
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  /whatsapp-dashboard.html                                     │
│  - Shows WhatsApp conversations                               │
│  - AI configuration panel                                     │
│  - Message history                                            │
└──────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  WhatsApp User  │
                    │  sends message  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  GHL Conversation│
                    │  (Your Provider) │
                    └────────┬────────┘
                             │
                             │ 3. Outbound Webhook
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  /provider/outbound                                           │
│  - Receives message from GHL                                  │
│  - Extracts: phone, message, contactId                        │
│  - Forwards to AI processing                                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ 4. AI Processing
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  AI Agent (Enhanced AI Service)                               │
│  - Retrieves conversation history                             │
│  - Searches knowledge base                                    │
│  - Generates contextual response                              │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ 5. Send Inbound Message to GHL
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  GHL Conversations API                                        │
│  POST /conversations/messages/inbound                         │
│  - conversationProviderId: YOUR_PROVIDER_ID                   │
│  - body: AI response                                          │
│  - contactId: from webhook                                    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ 6. Message delivered
                            ▼
                    ┌─────────────────┐
                    │  WhatsApp User  │
                    │ receives reply  │
                    └─────────────────┘
```

## Current Status

✅ **Working with ngrok**:
- Custom page URL configured
- Outbound webhook configured
- OAuth callback configured

⚠️ **For VPS Deployment**:
When you deploy to VPS, you need to:

1. **Update GHL Marketplace App Settings**:
   - Custom Page: `https://YOUR-VPS-URL/whatsapp-dashboard.html`
   - Outbound Webhook: `https://YOUR-VPS-URL/provider/outbound`
   - OAuth Redirect: `https://YOUR-VPS-URL/api/oauth/callback`

2. **Update .env file**:
   ```env
   BASE_URL=https://YOUR-VPS-URL
   APP_URL=https://YOUR-VPS-URL
   GHL_OAUTH_REDIRECT_URI=https://YOUR-VPS-URL/api/oauth/callback
   PROVIDER_WEBHOOK_URL=https://YOUR-VPS-URL/provider/outbound
   CUSTOM_PAGE_URL=https://YOUR-VPS-URL/whatsapp-dashboard.html
   ```

3. **SSL Certificate Required**:
   - GHL requires HTTPS for all webhooks and OAuth
   - Use Let's Encrypt or Cloudflare for free SSL

## Testing Checklist

- [ ] OAuth flow works (install app in test sub-account)
- [ ] Custom page loads in GHL
- [ ] Outbound webhook receives messages
- [ ] AI processes messages correctly
- [ ] Inbound messages appear in GHL conversation
- [ ] WhatsApp user receives AI reply

## Next Steps

1. Keep ngrok running for local testing
2. Test the complete flow with a test sub-account
3. When ready, deploy to VPS and update all URLs
4. Publish app to GHL Marketplace (or keep private for specific clients)
