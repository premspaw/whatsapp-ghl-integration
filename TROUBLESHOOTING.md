# Troubleshooting Guide

## 🚨 App Crashing Issues

### Quick Fix Steps

1. **Create .env file:**
   ```bash
   npm run create-env
   ```

2. **Debug the issue:**
   ```bash
   npm run debug
   ```

3. **Install missing dependencies:**
   ```bash
   npm install
   ```

4. **Start the app:**
   ```bash
   npm start
   ```

## 🔍 Common Issues & Solutions

### 1. Missing .env File
**Error:** `Cannot find module` or environment variables undefined

**Solution:**
```bash
npm run create-env
```

### 2. Missing Dependencies
**Error:** `Cannot find module 'express'` or similar

**Solution:**
```bash
npm install
```

### 3. Port Already in Use
**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or change port in .env file
PORT=3001
```

### 4. WhatsApp Service Issues
**Error:** WhatsApp service initialization fails

**Solution:**
- For testing: Set `USE_MOCK_WHATSAPP=true` in .env
- For production: Configure WhatsApp credentials

### 5. GHL API Issues
**Error:** GHL service connection fails

**Solution:**
- Add your GHL API key to .env file
- Verify GHL credentials are correct
- Check GHL API status

### 6. AI Service Issues
**Error:** OpenAI API errors

**Solution:**
- Add your OpenAI API key to .env file
- Verify OpenAI account has credits
- Check API key permissions

## 🛠️ Debug Commands

### Check System Status
```bash
npm run debug
```

### Test Mock WhatsApp
```bash
npm run test-mock
```

### Create Environment File
```bash
npm run create-env
```

## 📱 Mock vs Real WhatsApp

### Mock Mode (Recommended for Testing)
```env
USE_MOCK_WHATSAPP=true
```

**Benefits:**
- No WhatsApp connection required
- Safe testing environment
- Pre-configured test data
- No API keys needed

### Real WhatsApp Mode
```env
USE_MOCK_WHATSAPP=false
```

**Requirements:**
- WhatsApp mobile app
- QR code scanning
- Stable internet connection

## 🔧 Service-Specific Issues

### WhatsApp Service
- **Mock Mode:** Always works, no configuration needed
- **Real Mode:** Requires WhatsApp Web connection

### SMS Service
- **Not Configured:** Runs in mock mode
- **Twilio:** Requires account SID, auth token, phone number
- **Vonage:** Requires API key, secret, phone number

### Email Service
- **Not Configured:** Runs in mock mode
- **Gmail:** Requires app password (not regular password)
- **Other SMTP:** Configure host, port, credentials

### GHL Service
- **Not Configured:** API calls will fail
- **Configured:** Requires API key and location ID

### AI Service
- **Not Configured:** AI replies disabled
- **Configured:** Requires OpenAI API key

## 🚀 Startup Checklist

### Before Starting
- [ ] Node.js installed (v14+)
- [ ] npm install completed
- [ ] .env file exists
- [ ] Port 3000 available

### For Mock Testing
- [ ] USE_MOCK_WHATSAPP=true
- [ ] No API keys required
- [ ] Access http://localhost:3000/mock-test.html

### For Production
- [ ] USE_MOCK_WHATSAPP=false
- [ ] WhatsApp credentials configured
- [ ] GHL API key added
- [ ] OpenAI API key added

## 📊 Error Messages Guide

### "Cannot find module"
- Run `npm install`
- Check if file exists in services/

### "Port already in use"
- Change PORT in .env
- Kill existing process

### "WhatsApp client disconnected"
- Check internet connection
- Restart WhatsApp Web
- Try mock mode first

### "GHL API error"
- Check API key
- Verify location ID
- Check GHL service status

### "OpenAI API error"
- Check API key
- Verify account credits
- Check rate limits

## 🆘 Still Having Issues?

### 1. Check Logs
```bash
npm start
# Look for error messages in console
```

### 2. Debug Mode
```bash
npm run debug
# Check all dependencies and files
```

### 3. Test Mock System
```bash
npm run test-mock
# Verify mock WhatsApp works
```

### 4. Reset Environment
```bash
# Delete .env and recreate
rm .env
npm run create-env
```

### 5. Fresh Install
```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install
```

## 📞 Getting Help

1. **Check the logs** for specific error messages
2. **Run debug script** to identify missing components
3. **Test with mock mode** first to isolate issues
4. **Verify all dependencies** are installed
5. **Check environment variables** are set correctly

## 🎯 Quick Start (If Everything Fails)

```bash
# 1. Create environment file
npm run create-env

# 2. Install dependencies
npm install

# 3. Start in mock mode
npm start

# 4. Open browser
# http://localhost:3000/mock-test.html
```

This should get you up and running with mock WhatsApp for testing!
