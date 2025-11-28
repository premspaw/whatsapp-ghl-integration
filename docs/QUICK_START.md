# Quick Start Guide

## 🚀 Start with Mock WhatsApp (Recommended for Testing)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp env.example .env

# Edit .env file with your API keys (optional for mock mode)
# For now, you can leave most fields empty to test with mock data
```

### 3. Start the Application
```bash
npm start
```

### 4. Access the Application
- **Main Interface**: http://localhost:3000
- **Mock Testing**: http://localhost:3000/mock-test.html

## 🧪 Testing with Mock WhatsApp

### Mock Testing Interface
1. Go to http://localhost:3000/mock-test.html
2. Use the quick test scenarios:
   - **Customer Support**: Simulates order issues
   - **Sales Inquiry**: Simulates potential customers
   - **Customer Complaint**: Simulates unsatisfied customers
   - **General Question**: Simulates business questions

### Custom Message Testing
1. Select a mock contact from the dropdown
2. Type your custom message
3. Click "Send" to trigger the message
4. Go to the main interface to see the conversation

### Mock Contacts Available
- **John Doe** (+1234567890) - Customer with order issues
- **Sarah Wilson** (+1987654321) - Satisfied customer
- **Mike Johnson** (+1122334455) - Potential customer

## 🔄 Switch to Real WhatsApp

### When Ready for Production
1. Set `USE_MOCK_WHATSAPP=false` in your `.env` file
2. Configure your WhatsApp credentials
3. Restart the application
4. Scan the QR code with your WhatsApp mobile app

## 📱 Features to Test

### Conversation Tabs
- **WhatsApp Tab**: Shows mock WhatsApp conversations
- **SMS Tab**: Shows SMS conversations (when configured)
- **Email Tab**: Shows email conversations (when configured)
- **All Tab**: Shows all conversations combined

### AI Integration
- Toggle AI replies on/off per conversation
- Test different AI response scenarios
- Monitor AI reply effectiveness

### GHL Integration
- Toggle GHL sync on/off per conversation
- Test contact creation in GHL
- Test conversation syncing

## 🛠️ Development Workflow

### 1. Start with Mock
```bash
# Use mock WhatsApp for development
USE_MOCK_WHATSAPP=true npm start
```

### 2. Test Scenarios
- Use the mock testing interface
- Test different conversation types
- Verify AI replies work correctly
- Check GHL sync functionality

### 3. Switch to Real WhatsApp
```bash
# Use real WhatsApp for production
USE_MOCK_WHATSAPP=false npm start
```

## 🔧 Configuration Options

### Mock Mode (Development)
```env
USE_MOCK_WHATSAPP=true
NODE_ENV=development
```

### Production Mode
```env
USE_MOCK_WHATSAPP=false
WHATSAPP_SESSION_NAME=Mywhatsapp
GHL_API_KEY=your_ghl_api_key
OPENAI_API_KEY=your_openai_api_key
```

## 📊 Monitoring

### Check System Status
- WhatsApp connection status
- GHL API connection status
- AI service status
- Mock service status

### View Logs
```bash
# Check application logs
npm start

# Or use nodemon for development
npm run dev
```

## 🚨 Troubleshooting

### Mock WhatsApp Not Working
- Check if `USE_MOCK_WHATSAPP=true` in `.env`
- Restart the application
- Check browser console for errors

### Real WhatsApp Not Connecting
- Ensure `USE_MOCK_WHATSAPP=false`
- Check WhatsApp Web is not already connected
- Try refreshing the QR code

### AI Replies Not Working
- Check OpenAI API key is configured
- Verify AI toggle is enabled for conversation
- Check application logs for errors

## 🎯 Next Steps

1. **Test with Mock Data**: Use the mock testing interface
2. **Configure APIs**: Add your GHL and OpenAI API keys
3. **Test AI Replies**: Enable AI for conversations and test
4. **Test GHL Sync**: Enable GHL sync and verify data appears
5. **Switch to Real WhatsApp**: When ready, connect real WhatsApp
6. **Deploy**: Set up for production use

## 📞 Support

- Check the main README.md for detailed documentation
- Review CONVERSATION_TABS.md for tab system details
- Use the mock testing interface for safe testing
