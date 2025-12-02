# Unified GHL + AI Dashboard Integration

This project now combines the **AI Dashboard** (Tachyon Radiation) and the **GHL Conversation Provider** into a single application.

## Overview

- **Server**: `server.js` (Runs on Port 3000 by default)
- **Database**: 
  - `db.js` (Supabase for Chat History)
  - `ghl_db.js` (Local JSON file for GHL Auth Tokens)
- **GHL Integration**:
  - `auth.js`: Handles OAuth flow.
  - `provider.js`: Handles Webhooks and Message Syncing.

## Setup

1. **Environment Variables**:
   Ensure your `.env` file includes the following GHL credentials:
   ```env
   Client_Id=YOUR_CLIENT_ID
   Client_Secret=YOUR_CLIENT_SECRET
   App_Url=https://your-tunnel-url.ngrok.io
   CONVERSATION_PROVIDER_ID=YOUR_PROVIDER_ID
   GHL_LOCATION_ID=YOUR_LOCATION_ID
   ```
   *Note: `App_Url` must match your OAuth Redirect URI in GHL Marketplace.*

2. **Dependencies**:
   Run `npm install` to ensure all packages are installed.

## Running the App

Start the server:
```bash
npm start
```

## Usage

1. **Authorization**:
   Visit `http://localhost:3000/oauth/authorize` (or your public URL) to authorize the app with your GHL Location.

2. **Webhooks**:
   - **Inbound (WhatsApp -> GHL)**: Handled automatically when a WhatsApp message is received.
   - **Outbound (GHL -> WhatsApp)**: Configure your GHL Custom Provider to send webhooks to `https://your-tunnel-url.ngrok.io/webhooks/outbound`.

3. **Dashboard**:
   Access the AI Dashboard at `http://localhost:3000`.

## Key Files Created/Modified
- `server.js`: Main entry point, now includes GHL routes.
- `auth.js`: GHL OAuth logic.
- `provider.js`: GHL Message Provider logic.
- `ghl_db.js`: Token storage.
