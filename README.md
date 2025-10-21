# WhatsApp to GoHighLevel Integration

A comprehensive solution that connects WhatsApp to GoHighLevel (GHL) with AI-powered automatic replies and conversation management.

## Features

- 🔗 **WhatsApp Integration**: Connect your WhatsApp account using WhatsApp Web
- 🤖 **AI-Powered Replies**: Automatic AI responses using OpenAI GPT
- 📊 **GHL Integration**: Sync conversations and contacts with GoHighLevel
- 💬 **Conversation Management**: Track and manage all WhatsApp conversations
- 🎛️ **Control Panel**: Toggle AI replies and GHL sync per conversation
- 📱 **Real-time Updates**: Live message updates using WebSocket

## Prerequisites

- Node.js (v14 or higher)
- WhatsApp account
- GoHighLevel API access
- OpenAI API key (for AI replies)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-ghl-integration
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your credentials:
   ```env
   # WhatsApp Configuration
   WHATSAPP_SESSION_NAME=Mywhatsapp

   # GoHighLevel API Configuration
   GHL_API_KEY=your_ghl_api_key_here
   GHL_LOCATION_ID=your_ghl_location_id_here
   GHL_BASE_URL=https://services.leadconnectorhq.com

   # OpenRouter Configuration for AI Replies
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=anthropic/claude-3-haiku
   OPENROUTER_REFERER=http://localhost:3000
   # Supabase (Server-side)
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SCHEMA=public

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

## Usage

1. **Start the server**
   ```bash
   npm start
   ```

2. **Open the web interface**
   - Navigate to `http://localhost:3000`
   - You'll see a QR code to scan with your WhatsApp mobile app

3. **Connect WhatsApp**
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Scan the QR code displayed in the web interface

4. **Configure AI and GHL**
   - Once connected, conversations will appear in the sidebar
   - Click on any conversation to open it
   - Toggle "AI Reply" to enable automatic AI responses
   - Toggle "GHL Sync" to sync conversations with GoHighLevel

5. **Verify DB Connection (Optional)**
   - `GET /api/db/status` should return `{ configured: true, connected: true }` once your Supabase tables exist.

## API Endpoints

### Conversations
- `GET /api/conversations` - Get all conversations
- `GET /api/conversations/:id` - Get specific conversation
- `POST /api/conversations/:id/ai-toggle` - Toggle AI replies
- `POST /api/conversations/:id/ghl-sync` - Toggle GHL sync

### Messaging
- `POST /api/send-message` - Send WhatsApp message

### GHL Integration
- `GET /api/ghl/contacts` - Get GHL contacts

## Configuration

### WhatsApp Session
The app uses a local session named "Mywhatsapp" by default. You can change this in the `.env` file.

### AI Replies
AI replies are powered by OpenAI GPT-3.5-turbo. You can customize the AI behavior by modifying the prompts in `services/aiService.js`.

### GHL Integration
The app automatically syncs conversations with GoHighLevel when enabled. It creates contacts and conversations in your GHL account.

## File Structure

```
├── server.js                 # Main server file
├── services/
│   ├── whatsappService.js   # WhatsApp Web integration
│   ├── ghlService.js        # GoHighLevel API integration
│   ├── aiService.js         # OpenAI AI integration
│   └── conversationManager.js # Conversation management
├── public/
│   ├── index.html           # Web interface
│   └── js/
│       └── app.js           # Frontend JavaScript
├── data/
│   └── conversations.json   # Local conversation storage
└── package.json
```

## Troubleshooting

### WhatsApp Connection Issues
- Ensure your phone has an active internet connection
- Try refreshing the QR code if it expires
- Check that WhatsApp Web is not already connected on another device

### GHL Integration Issues
- Verify your GHL API key and location ID
- Ensure your GHL account has the necessary permissions
- Check the GHL API documentation for any changes

### AI Reply Issues
- Verify your OpenAI API key is valid
- Check your OpenAI account has sufficient credits
- Review the AI service logs for specific errors

## Development

To run in development mode with auto-restart:
```bash
npm run dev
```

## Security Notes

- Keep your API keys secure and never commit them to version control
- Use environment variables for all sensitive configuration
- Consider using a reverse proxy for production deployments
- Regularly update dependencies for security patches

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the application logs
3. Create an issue in the repository
