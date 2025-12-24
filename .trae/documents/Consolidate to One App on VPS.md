## Current State
- Port `3000` is serving health OK via an existing Node process
- PM2 also attempted to run `whatsapp-ghl`, causing `EADDRINUSE` conflicts
- Nginx shows duplicate `server_name api.synthcore.in` warnings but still routes to `127.0.0.1:3000`

## Goal
- Run exactly one app instance on the VPS
- Choose either: keep the existing manual Node process OR standardize under PM2

## Option A — Keep Current App, Remove PM2 Duplicate
- Stop PM2 app and keep the live process:
  - `pm2 delete whatsapp-ghl && pm2 save && pm2 ls`
- Verify:
  - `curl -sS http://localhost:3000/health`
  - `ss -lntp | grep ':3000'`

## Option B — Migrate to PM2 (Recommended)
- Stop the current owner of `:3000` and start under PM2:
  - `PID=$(ss -lntp | awk '/:3000/{match($NF,/pid=([0-9]+)/,a);print a[1];exit}') && kill $PID && pm2 start src/server.js --name "whatsapp-ghl" && pm2 save && pm2 logs whatsapp-ghl --lines 50`
- Verify:
  - `curl -sS http://localhost:3000/health`
  - `pm2 ls`

## Environment File Correction (No Backticks)
- Ensure `.env` has a valid redirect URI and no backticks:
  - `cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
USE_MOCK_WHATSAPP=false
GHL_OAUTH_REDIRECT_URI=https://api.synthcore.in/api/auth/oauth/callback
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EOF`
- Reload (if using PM2):
  - `pm2 reload whatsapp-ghl && pm2 save`

## Nginx Warning Cleanup (Optional)
- Identify duplicates:
  - `grep -R "server_name api.synthcore.in" /etc/nginx/sites-available /etc/nginx/sites-enabled -n`
- Keep a single site definition for `api.synthcore.in`, then:
  - `sudo nginx -t && sudo systemctl reload nginx`

## Verification Checklist
- Health endpoint returns OK
- Only one process is bound to `:3000`
- PM2 (if chosen) shows a single `whatsapp-ghl` process
- Nginx serves `https://api.synthcore.in/admin.html` and the dashboard URL

## Request
- Confirm whether you want Option A (keep current app, remove PM2) or Option B (migrate to PM2). I’ll proceed accordingly and provide any follow-up commands.