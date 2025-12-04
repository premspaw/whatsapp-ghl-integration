## Local Repo Verification
- Check working tree and latest commit: `git status` and `git log -n 3 --stat`
- Confirm OAuth edits exist in the last commit: `git show -n 1 --stat | findstr /C:"services/ghlOAuthService.js"` (Windows) or `git show -n 1 --stat | grep services/ghlOAuthService.js`
- Inspect file contents for markers:
  - `git show HEAD:services/ghlOAuthService.js | grep -n "version_id\|leadconnectorhq.com\|gohighlevel.com"`
  - Expect entries near `services/ghlOAuthService.js:72` and `services/ghlOAuthService.js:126` (version_id), and fallback URLs in the token/refresh sections.
- Ensure local branch is ahead or equal to origin: `git fetch origin && git status -sb`

## Push To Git
- If commits are local-only: `git push origin main`
- Verify on remote:
  - `git ls-remote --heads origin main`
  - View the file on your Git host to confirm the latest content (services/ghlOAuthService.js shows version_id and fallback).

## VPS: Pull And Verify
- SSH: `ssh root@<vps_host>`
- Repo location: `cd /root/whatsapp-ghl-integration`
- Pull code: `git pull --ff-only`
- Verify file contains the changes:
  - `grep -n "version_id\|leadconnectorhq.com\|gohighlevel.com" services/ghlOAuthService.js`
  - `sed -n '60,140p' services/ghlOAuthService.js` (or `powershell -Command "Get-Content services/ghlOAuthService.js | Select-Object -Index 60..140"` if Windows)
- Confirm commit on VPS matches origin: `git rev-parse HEAD` and compare with local `git rev-parse origin/main`

## Restart App With Updated Env
- Ensure clean env (no quotes/backticks):
  - `GHL_OAUTH_CLIENT_ID`, `GHL_OAUTH_CLIENT_SECRET`
  - `GHL_OAUTH_REDIRECT_URI=https://api.synthcore.in/api/oauth/callback`
  - `GHL_OAUTH_TOKEN_URL=https://marketplace.leadconnectorhq.com/oauth/token`
  - `GHL_OAUTH_VERSION_ID=69297994cd7d285c1e4b5671`
  - `GHL_OAUTH_AUTH_BASE=https://marketplace.leadconnectorhq.com/oauth/authorize`
- Restart: `pm2 restart synthcore-whatsapp --update-env` and `pm2 save`
- Health check: `curl -sS http://127.0.0.1:3000/api/system/status`

## OAuth Install Retest
- Get authorize URL: `curl -sS "https://api.synthcore.in/api/ghl/oauth/authorize?state=install-$(date +%s)"`
- Open in browser, log in to CRM, select Sub-Account, approve.
- Callback exchanges token with version_id and endpoint fallback.
- Verify status: `curl -sS https://api.synthcore.in/api/ghl/oauth/status` → `locations` should populate.

## If 400 Persists
- Confirm the marketplace app has the exact redirect URI set.
- Temporarily reduce scopes to a minimal valid set: `GHL_OAUTH_SCOPES="contacts.readonly conversations/message.write locations.readonly"` and restart.
- Inspect callback error body (now bubbled by the route) to pinpoint provider message.

Would you like me to proceed with these steps (push and VPS pull), or should I provide copy-paste commands tailored to your exact VPS hostname?