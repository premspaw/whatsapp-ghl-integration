# VPS Deployment Troubleshooting

## If npm install is taking too long (4+ minutes)

This is **NORMAL** for the first installation because:
- `whatsapp-web.js` downloads Chromium browser (~170MB)
- `puppeteer` downloads additional browser files
- Total download can be 200-400MB depending on your VPS internet speed

### Check Progress on VPS

SSH into your VPS and check:

```bash
# Check if npm install is still running
ps aux | grep npm

# Check network activity
sudo iftop

# Check disk I/O
iostat -x 1

# Check what's being downloaded
ls -lh node_modules/.cache/puppeteer/
```

### Expected Timeline

- **Fast VPS (100+ Mbps)**: 2-4 minutes
- **Medium VPS (50 Mbps)**: 4-8 minutes  
- **Slow VPS (10 Mbps)**: 10-15 minutes

### Speed Up Installation (If Stuck)

If it's been more than 10 minutes, you can:

1. **Cancel and use --legacy-peer-deps**:
   ```bash
   # Press Ctrl+C to cancel
   npm install --legacy-peer-deps
   ```

2. **Skip Optional Dependencies**:
   ```bash
   npm install --legacy-peer-deps --no-optional
   ```

3. **Use Mock WhatsApp (No Chromium Download)**:
   ```bash
   # In your .env file, ensure:
   USE_MOCK_WHATSAPP=true
   
   # Then install without whatsapp-web.js
   npm install --legacy-peer-deps --omit=optional
   ```

### Quick Alternative: Deploy Without WhatsApp-Web.js

Since you're using Mock WhatsApp mode, you can skip the heavy dependencies:

```bash
# On VPS, edit package.json and remove whatsapp-web.js
nano package.json

# Remove this line:
# "whatsapp-web.js": "^1.23.0"

# Then install
npm install --legacy-peer-deps
```

### Check Installation Status

```bash
# See what's happening
tail -f ~/.npm/_logs/*-debug.log

# Or check npm cache
du -sh ~/.npm

# Check node_modules size
du -sh node_modules/
```

### If Installation Completes Successfully

You should see:
```
added 408 packages in 5m
```

Then start the server:
```bash
pm2 start server.js --name ghl-whatsapp-integration
pm2 logs ghl-whatsapp-integration
```

### Recommended: Use PM2 Directly

Instead of npm install on VPS, upload node_modules from your local machine:

```powershell
# On your local machine (Windows)
# Compress node_modules
Compress-Archive -Path node_modules -DestinationPath node_modules.zip

# Upload to VPS
scp node_modules.zip root@api.synthcore.in:/root/whatsapp-ghl-integration/

# On VPS
ssh root@api.synthcore.in
cd /root/whatsapp-ghl-integration
unzip node_modules.zip
pm2 start server.js --name ghl-whatsapp-integration
```

This skips the installation entirely!

### Current Status Check

Run this on your VPS:
```bash
# Check if process is running
ps aux | grep node

# Check if port 3000 is listening
netstat -tulpn | grep 3000

# Check PM2 status
pm2 status

# View logs
pm2 logs --lines 50
```

## What to Do Right Now

**Option 1: Wait it out** (if it's been less than 10 minutes)
- It's probably still downloading Chromium
- Be patient, it will finish

**Option 2: Cancel and use faster method**
```bash
# Press Ctrl+C
# Then run:
npm install --legacy-peer-deps --production
```

**Option 3: Upload node_modules from local**
- Fastest option if you have good upload speed
- See instructions above
