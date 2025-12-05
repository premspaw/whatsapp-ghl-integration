# Server Control & GHL Webhook Testing Guide

## How to Stop the Server

### Method 1: Using Terminal (Recommended)
```bash
# Find the process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace 12348 with the actual PID)
taskkill /PID 12348 /F
```

### Method 2: Using Ctrl+C
- If you started the server with `npm start` in the terminal
- Press `Ctrl+C` to stop it

## How to Start the Server

```bash
npm start
```

## Testing the GHL Webhook

### 1. First, connect WhatsApp
1. Go to `http://localhost:3000/simple`
2. Click "Connect WhatsApp" 
3. Scan the QR code with your phone
4. Wait for "WhatsApp client is ready!" in terminal

### 2. Test the webhook
Use this PowerShell command to simulate a GHL webhook:

```powershell
$webhookUrl = "http://localhost:3000/webhooks/ghl"
$payload = @{
    event = "conversation.message.created"
    data = @{
        message = @{
            direction = "outbound"
            contact = @{
                phone = "+918123133382"
                id = "test_contact_123"
            }
            message = "Test message from GHL webhook"
            conversationId = "test_conversation_123"
        }
    }
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri $webhookUrl -Method POST -Body $payload -ContentType "application/json"
```

### 3. Expected Flow
1. ✅ GHL webhook sends message to our server
2. ✅ Our server sends via WhatsApp to contact  
3. ✅ Contact receives message on WhatsApp
4. ✅ Message logged back to GHL

## Troubleshooting

### If WhatsApp shows "Not Connected" in UI
1. Stop server: `taskkill /PID <PID> /F`
2. Start server: `npm start`
3. Refresh the page: `http://localhost:3000/simple`
4. Connect WhatsApp again

### If webhook fails with "WhatsApp client is not ready"
1. Make sure WhatsApp is connected (scan QR code)
2. Wait for "WhatsApp client is ready!" in terminal
3. Then test the webhook

### If you see "address already in use" error
```bash
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then start again
npm start
```

## Current Status
- ✅ Server is running on port 3000
- ✅ WhatsApp webhook endpoint: `/webhooks/ghl`
- ✅ Fixed webhook to check WhatsApp readiness
- ✅ Better error handling for message sending
