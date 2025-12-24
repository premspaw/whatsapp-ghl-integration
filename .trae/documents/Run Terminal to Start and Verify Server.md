## Goals
- Start the app via terminal without modifying code
- Verify multi-tenant dashboards and API key registration work locally
- Provide a one-line VPS deployment command for your remote server

## Local Run (Terminal)
- Install and start:
  - `npm install`
  - `npm start`
- Verify:
  - Open `http://localhost:3000/admin.html`
  - Open `http://localhost:3000/ghl-whatsapp-tab.html?locationId=YOUR_LOC_ID`
  - Optional: `?apiKey=YOUR_GHL_API_KEY` on the dashboard URL for manual key registration

## VPS Deploy (Single Copy-Paste)
- Run in `/root/whatsapp-ghl-integration`:
  - `sudo -i && cd /root/whatsapp-ghl-integration && git pull && npm install --production && cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
USE_MOCK_WHATSAPP=false
GHL_OAUTH_REDIRECT_URI=https://api.synthcore.in/api/auth/oauth/callback
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EOF
&& (pm2 start src/server.js --name "whatsapp-ghl" || pm2 restart whatsapp-ghl) && pm2 save`
- Verify:
  - `https://api.synthcore.in/admin.html`
  - `https://api.synthcore.in/ghl-whatsapp-tab.html?locationId=YOUR_LOC_ID`

## Verification Checklist
- Admin loads and lists locations
- Dashboard loads; WhatsApp status shows connected or QR available
- Template creator opens with `locationId` in URL
- Outbound webhook works with `locationId` routing

## Safety Notes
- Supabase is optional; if unset, tokens persist locally
- No secrets are logged; `.env` values are required only for redirect URI and port

Please confirm if I should run the local terminal now, or proceed with the VPS command on your server.