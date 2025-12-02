# ✅ VPS Configuration Complete - api.synthcore.in

## Updated Configuration

Your application is now configured to use your VPS at **`https://api.synthcore.in`**

### GHL Marketplace App URLs

Update these in your GHL Marketplace App settings:

1. **OAuth Redirect URI**:
   ```
   https://api.synthcore.in/api/oauth/callback
   ```

2. **Conversation Provider Outbound Webhook**:
   ```
   https://api.synthcore.in/provider/outbound
   ```

3. **Custom Page (Dashboard)**:
   ```
   https://api.synthcore.in/whatsapp-dashboard.html
   ```

### Environment Variables Set

```env
BASE_URL=https://api.synthcore.in
APP_URL=https://api.synthcore.in
GHL_OAUTH_REDIRECT_URI=https://api.synthcore.in/api/oauth/callback
PROVIDER_WEBHOOK_URL=https://api.synthcore.in/provider/outbound
CUSTOM_PAGE_URL=https://api.synthcore.in/whatsapp-dashboard.html
SYNTHCORE_WHATSAPP_URL=https://api.synthcore.in/api/whatsapp/send
NODE_ENV=production
```

### Server Status

✅ **Server is running** with VPS configuration:
```
GHLOAuthService config: {
  clientId: '68ec93c80aad6bbd8249e3e2-minl7lu9',
  redirectUri: 'https://api.synthcore.in/api/oauth/callback',
  tokenUrl: 'https://services.leadconnectorhq.com/oauth/token'
}
```

### Message Flow (Correct)

```
WhatsApp User
     ↓
GHL Conversation (Your Provider)
     ↓
https://api.synthcore.in/provider/outbound (webhook)
     ↓
AI Processing (Your Server)
     ↓
GHL Conversations API (Inbound Message)
     ↓
GHL Conversation
     ↓
WhatsApp User (receives AI reply)
```

### Deployment Steps

1. **Deploy to VPS**:
   ```bash
   # From your local machine
   scp -r * root@api.synthcore.in:/root/whatsapp-ghl-integration/
   
   # SSH to VPS
   ssh root@api.synthcore.in
   
   # Navigate to project
   cd /root/whatsapp-ghl-integration
   
   # Install dependencies
   npm install --legacy-peer-deps
   
   # Start with PM2
   pm2 start server.js --name ghl-whatsapp-integration
   pm2 save
   ```

2. **Update GHL Marketplace App**:
   - Go to your GHL Marketplace App settings
   - Update all three URLs above
   - Save changes

3. **Test OAuth Flow**:
   - Visit: `https://api.synthcore.in/api/oauth/authorize`
   - Complete authorization
   - Verify token is stored

4. **Test Message Flow**:
   - Install app in a test sub-account
   - Send a WhatsApp message
   - Verify it appears in GHL conversation
   - Confirm AI reply is sent back

### Important Notes

- ✅ No more ngrok needed
- ✅ All URLs point to your VPS
- ✅ Production-ready configuration
- ✅ SSL/HTTPS required (ensure your VPS has SSL certificate)

### Next Actions

1. **Deploy the code to your VPS**
2. **Update GHL Marketplace App settings** with the new URLs
3. **Test the complete flow**
4. **Monitor logs**: `pm2 logs ghl-whatsapp-integration`

Your integration is now ready for production deployment on your VPS! 🚀
