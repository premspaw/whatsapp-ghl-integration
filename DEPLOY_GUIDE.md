# 🚀 Deployment Guide (VPS)

Your codebase is now ready for multi-tenant deployment.

## ✅ Prerequisites on VPS

1.  **Node.js 18+** installed.
2.  **Git** installed.
3.  **PM2** installed (optional but recommended for keeping the app running).
    ```bash
    npm install -g pm2
    ```

## 📦 Deployment Steps

### 1. Pull the Latest Code
Navigate to your project folder on the VPS and run the helper script:

```bash
# If you are already in the directory:
git pull
bash deploy.sh
```

*Note: I have created a `deploy.sh` script that handles pulling, installing dependencies, and checking your `.env` configuration.*

### 2. Verify Environment Variables (.env)
The `deploy.sh` script attempts to update your `.env`, but verify these key values manually if needed:

```ini
# .env file

# MUST match your GHL App Configuration
GHL_OAUTH_REDIRECT_URI="https://api.synthcore.in/api/auth/oauth/callback"

# Database (Optional, defaults to local file if empty)
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""

# WhatsApp
USE_MOCK_WHATSAPP=false
```

### 3. Nginx Configuration (Important!)
Since you are using `api.synthcore.in`, ensure your Nginx config forwards traffic to port 3000 and handles WebSockets.

**Example Nginx Block:**
```nginx
server {
    listen 80;
    server_name api.synthcore.in;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🛠 Features Now Available

1.  **Multi-Tenancy**: The app now supports multiple subaccounts.
    *   **Dashboard**: `https://api.synthcore.in/ghl-whatsapp-tab.html?locationId=YOUR_LOC_ID`
    *   **Admin Panel**: `https://api.synthcore.in/admin.html`
2.  **API Key Support**:
    *   You can manually register a location without OAuth by appending `&apiKey=YOUR_KEY` to the dashboard URL once.
3.  **Localhost Preview**:
    *   The app detects if it's running locally or on VPS and adjusts API calls accordingly.

## 🧪 Testing on VPS

1.  **Open Admin Panel**: `https://api.synthcore.in/admin.html`
2.  **Check Logs**:
    ```bash
    pm2 logs whatsapp-ghl
    ```
3.  **Connect a Tenant**:
    *   Go to `https://api.synthcore.in/ghl-whatsapp-tab.html?locationId=TEST_LOC_ID`
    *   Scan the QR Code.
    *   Send a test message from WhatsApp to that number.
