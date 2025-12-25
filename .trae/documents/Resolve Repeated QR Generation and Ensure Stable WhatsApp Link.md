## Why It’s Happening

* WhatsApp Web rotates QR every \~20 seconds until the device links; repeated "QR Code received" logs mean the session isn’t completing for that location.

* Your logs show `default` becomes ready, but `dXh04Cd8ixM9hnk1IS5b` keeps emitting QR and never reaches `ready`, indicating that tenant isn’t linked yet or there’s a duplicate server process re-initializing the same location.

* If two server instances run concurrently (e.g., PM2 cluster or two apps), both try to initialize `dXh04Cd8ixM9hnk1IS5b`; one may hold the session while the other keeps generating QR indefinitely.

## Plan

### 1) Diagnose the Current State

* Check WhatsApp status for the tenant: `GET /api/whatsapp/status?locationId=dXh04Cd8ixM9hnk1IS5b` (expect `isReady:true` only when linked).

* Fetch QR PNG to confirm it’s still active: `GET /api/whatsapp/qr-image?locationId=dXh04Cd8ixM9hnk1IS5b`.

* Inspect runtime diagnostics: `GET /api/whatsapp/debug?locationId=dXh04Cd8ixM9hnk1IS5b` (look at `executablePath`, `authPathExists`, `hasQRCode`).

* On the VPS, list PM2 processes and confirm only one instance of this app is running.

### 2) Eliminate Duplicate Instances (if any)

* If multiple app processes are running, stop extras and keep a single instance.

* Avoid PM2 cluster mode for this app unless adding explicit inter-process coordination; run with `instances: 1`.

### 3) Reset and Relink the Tenant Session

* Use admin endpoints to force a clean state for `dXh04Cd8ixM9hnk1IS5b`:

  * Logout: `POST /api/whatsapp/logout?locationId=dXh04Cd8ixM9hnk1IS5b` (clears auth)

  * Restart: `POST /api/whatsapp/restart?locationId=dXh04Cd8ixM9hnk1IS5b`

* Open the dashboard and scan the fresh QR: `.../ghl-whatsapp-tab.html?locationId=dXh04Cd8ixM9hnk1IS5b`.

* Confirm status flips to connected: `GET /api/whatsapp/status?locationId=dXh04Cd8ixM9hnk1IS5b` → `isReady:true`.

### 4) Verify Device Link Persistence

* Ensure WhatsApp shows the linked device entry under Linked Devices.

* Restart the app once and confirm it does NOT emit further QR for that location (no more QR logs after linked).

### 5) Resolve GHL Sync Errors

* Register GHL access for any location you’re using:

  * Quick: open the dashboard once with `&apiKey=YOUR_GHL_API_KEY` to save an API key for that `locationId`.

  * Recommended: use OAuth via `GET /api/auth/oauth/authorize` and complete the callback.

* Verify `GET /api/auth/locations` shows your `locationId` with tokens; then send a test WhatsApp message and check logs for successful contact sync (no `No access token found`).

### 6) Optional Hardening

* Keep a single running instance in PM2; if scaling, add inter-process locking for WhatsApp sessions.

* Monitor `auth_failure` or `disconnected` events; auto-trigger a restart or alert when they occur.

## Confirmation

If you approve, I will:

* Run the diagnostics, ensure only one server instance, and reset/relink the `dXh04Cd8ixM9hnk1IS5b` session.

* Verify that the dashboard shows connected and that GHL sync is working without token errors.

