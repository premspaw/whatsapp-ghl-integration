# Ngrok Setup Guide for GHL WhatsApp Integration

## Quick Fix Applied ✅

I've added middleware to your `server.js` that automatically handles ngrok's browser warning page by adding the `ngrok-skip-browser-warning` header to all responses.

## How to Access Your GHL Tab via Ngrok

### Step 1: Restart Your Server

```bash
# Stop your current server (Ctrl+C if running)
# Then start it again
npm start
```

Or use the quick restart batch file:
```bash
RESTART_NOW.bat
```

### Step 2: Start Ngrok

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://kathi-sensational-rosalyn.ngrok-free.dev -> http://localhost:3000
```

### Step 3: Access the GHL WhatsApp Tab

Your GHL WhatsApp tab URL will be:
```
https://your-ngrok-url.ngrok-free.dev/ghl-whatsapp-tab.html
```

For example:
```
https://kathi-sensational-rosalyn.ngrok-free.dev/ghl-whatsapp-tab.html
```

## If You Still Get 400 Errors

### Option 1: Use the `--request-header-add` flag (Recommended)

```bash
ngrok http 3000 --request-header-add='ngrok-skip-browser-warning:true'
```

### Option 2: Access via Browser First

1. Open your ngrok URL in a browser: `https://your-ngrok-url.ngrok-free.dev`
2. Click "Visit Site" on the ngrok warning page
3. This will set a cookie that bypasses the warning for future requests
4. Now refresh your GHL tab

### Option 3: Upgrade to Ngrok Paid Plan

The free ngrok plan shows a browser warning page. Paid plans ($8/month) don't have this limitation:
- Visit: https://ngrok.com/pricing
- Upgrade to Basic or Pro plan
- No more browser warnings!

## Configure GHL Custom Tab

Once ngrok is working, add the custom tab in GHL:

1. Go to GHL Settings → Custom Values → Custom Menu Link
2. Add a new custom tab:
   - **Name**: WhatsApp Conversations
   - **Icon**: 📱 (or choose from GHL's icon picker)
   - **URL**: `https://your-ngrok-url.ngrok-free.dev/ghl-whatsapp-tab.html`
   - **Position**: Main Navigation

3. Save and refresh GHL

## Testing the Connection

### Test 1: Direct Browser Access
```
https://your-ngrok-url.ngrok-free.dev/ghl-whatsapp-tab.html
```

You should see the WhatsApp tab interface without any errors.

### Test 2: API Endpoint Check
```
https://your-ngrok-url.ngrok-free.dev/api/whatsapp/conversations
```

You should see JSON response with your conversations.

### Test 3: Socket.IO Connection
Open browser console on the GHL tab and look for:
```
Connected to server
```

## Common Issues & Solutions

### Issue: "GET /ghl-whatsapp-tab.html 400 (Bad Request)"

**Solution:**
- The middleware I added should fix this automatically
- Restart your server after the update
- Use the `--request-header-add` flag with ngrok

### Issue: Preload warnings in console

**Solution:**
- These warnings are non-critical and won't affect functionality
- They occur because browsers preload resources
- You can safely ignore them

### Issue: Socket.IO connection fails

**Solution:**
- Make sure your server is running on port 3000
- Check that ngrok is forwarding to the correct port
- Verify CORS headers are set (already done in the middleware)

### Issue: Conversations not loading

**Solution:**
1. Check if your WhatsApp is connected: `/api/whatsapp/status`
2. Verify conversations exist: `/api/whatsapp/conversations`
3. Check browser console for errors
4. Restart the server and ngrok

## Production Deployment (No Ngrok Needed)

For production, deploy to a hosting service instead of using ngrok:

### Option 1: Railway
```bash
# Already configured in your project
railway up
```

### Option 2: Render
```bash
# Already configured in your project
# Connect your GitHub repo to Render
```

### Option 3: Vercel
```bash
# Already configured in your project
vercel deploy
```

Then update your GHL custom tab URL to use your production URL.

## Environment Variables for Production

Make sure these are set in your production environment:

```env
PORT=3000
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_key
OPENAI_API_KEY=your_openai_key
WEBHOOK_BASE_URL=https://your-production-url.com
```

## Webhook Configuration

Update your GHL webhook URLs to use your ngrok (or production) URL:

**Inbound Messages:**
```
https://your-ngrok-url.ngrok-free.dev/webhook/whatsapp
```

**GHL Outbound:**
```
https://your-ngrok-url.ngrok-free.dev/webhooks/ghl
```

**GHL Automation:**
```
https://your-ngrok-url.ngrok-free.dev/webhooks/ghl-automation
```

## Need Help?

If you're still experiencing issues:

1. Check server logs for errors
2. Check browser console for JavaScript errors
3. Verify ngrok is running and forwarding correctly
4. Make sure all environment variables are set
5. Try restarting both server and ngrok

## Pro Tip: Keep Ngrok URLs Stable

Free ngrok URLs change every time you restart. To get a stable URL:

```bash
# Sign up for ngrok (free tier)
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Use a custom subdomain (requires paid plan)
ngrok http 3000 --subdomain=my-whatsapp-ghl
```

This gives you a stable URL: `https://my-whatsapp-ghl.ngrok.io`

---

**✅ Your server is now configured to work properly with ngrok!**

Just restart your server and ngrok, then try accessing the GHL tab again.

