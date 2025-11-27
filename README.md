# Custom WhatsApp Automation

This is a Node.js application that replicates the n8n "Send → WhatsApp (VPS) RAW" workflow.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    - Copy `.env.example` to `.env`.
    - Fill in your API keys:
        - `OPENROUTER_API_KEY`: For the Grok AI model.
        - `PINECONE_API_KEY`: For knowledge base search.
        - `GHL_API_KEY`: For CRM data.
        - `SYNTHCORE_API_KEY`: For sending WhatsApp messages.

3.  **Run the Server**:
    ```bash
    node server.js
    ```

## Testing

You can simulate an incoming WhatsApp message using the test script:

# 🤖 WhatsApp AI Agent - Synthcore

An intelligent WhatsApp bot powered by **Grok AI**, **Pinecone Knowledge Base**, and **GoHighLevel CRM** integration. Built to replace n8n with a faster, more powerful, and fully customizable AI solution.

## 🌟 Features

- ✅ **AI-Powered Responses** - Uses Grok 4.1 via OpenRouter for intelligent conversations
- ✅ **Knowledge Base** - Pinecone vector search for accurate company information
- ✅ **CRM Integration** - Real-time GoHighLevel contact data and pipeline management
- ✅ **Conversation Memory** - Supabase database for chat history and context
- ✅ **WhatsApp Integration** - Seamless message sending via Synthcore WhatsApp API
- ✅ **Web Dashboard** - Monitor activity, view logs, and manage settings
- ✅ **24/7 Operation** - PM2 process management for continuous uptime

## 🏗️ Architecture

```
WhatsApp Message
  ↓
VPS (api.synthcore.in)
  ↓
├─→ GHL Sync (automatic)
├─→ Dashboard (existing)
└─→ AI Agent (this app)
      ├─→ Pinecone (knowledge search)
      ├─→ GHL (CRM data)
      ├─→ Supabase (chat history)
      └─→ Grok AI (response generation)
          ↓
    WhatsApp Response
```

## 📋 Prerequisites

- Node.js 18+ 
- VPS with Ubuntu/Debian
- API Keys:
  - OpenRouter (for Grok AI)
  - Pinecone (for knowledge base)
  - GoHighLevel (for CRM)
  - Supabase (for database)
  - Synthcore WhatsApp API

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/whatsapp-ai-agent.git
cd whatsapp-ai-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Update with your API keys (see `.env.example` for required variables).

### 4. Run Locally (Development)

```bash
node server.js
```

Access dashboard at: `http://localhost:3000`

### 5. Deploy to VPS (Production)

See **[DEPLOYMENT_SYNTHCORE.md](./DEPLOYMENT_SYNTHCORE.md)** for complete deployment guide.

Quick deploy:
```bash
scp -r * root@api.synthcore.in:/root/whatsapp-ai/
ssh root@api.synthcore.in
cd /root/whatsapp-ai
./deploy-synthcore.sh
```

## 📁 Project Structure

```
whatsapp-ai-agent/
├── server.js              # Main Express server
├── agent.js               # LangChain AI agent configuration
├── tools.js               # Pinecone & GHL tools
├── db.js                  # Supabase database functions
├── utils.js               # Helper functions (phone formatting, WhatsApp API)
├── public/                # Web dashboard UI
│   ├── index.html
│   └── styles.css
├── .env.example           # Environment variables template
├── package.json           # Dependencies
├── DEPLOYMENT_SYNTHCORE.md # VPS deployment guide
└── QUICK_DEPLOY.md        # Quick reference commands
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `OPENROUTER_API_KEY` | OpenRouter API key for Grok AI | Yes |
| `PINECONE_API_KEY` | Pinecone API key | Yes |
| `PINECONE_INDEX_HOST` | Pinecone index host URL | Yes |
| `GHL_API_KEY` | GoHighLevel API key | Yes |
| `GHL_LOCATION_ID` | GoHighLevel location ID | Yes |
| `SYNTHCORE_API_KEY` | Synthcore WhatsApp API key | Yes |
| `SYNTHCORE_WHATSAPP_URL` | WhatsApp send endpoint | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase service role key | Yes |

## 🎯 API Endpoints

### Webhook
- `POST /webhook/whatsapp` - Receives WhatsApp messages

### Dashboard API
- `GET /api/status` - Server status
- `GET /api/config` - Configuration (masked)
- `POST /api/config` - Update configuration
- `GET /api/logs` - Recent server logs
- `GET /api/messages` - Chat history
- `GET /api/prompt` - Current AI prompt
- `POST /api/prompt` - Update AI prompt

### Static Files
- `GET /` - Web dashboard UI

## 🧪 Testing

```bash
# Test Supabase connection
node test_supabase.js

# Test GHL API
node test_ghl_rest.js

# Test GHL tools
node test_ghl_tool.js

# Send test webhook
node send_test.js
```

## 📊 Monitoring

### PM2 Commands (Production)

```bash
pm2 status                 # Check status
pm2 logs whatsapp-ai       # View logs
pm2 restart whatsapp-ai    # Restart app
pm2 monit                  # Live monitoring
```

### Application Logs

```bash
tail -f server.log
```

## 🔒 Security

- ✅ API keys stored in `.env` (not committed to Git)
- ✅ Nginx reverse proxy for HTTPS
- ✅ SSL certificate via Let's Encrypt
- ✅ Firewall configured (UFW)
- ✅ Rate limiting on webhook endpoint

## 🛠️ Customization

### Modify AI Behavior

Edit `agent.js` to change the system prompt:

```javascript
const systemMessage = `Your custom AI instructions here...`;
```

Or use the web dashboard: `Settings → AI Prompt`

### Add New Tools

Edit `tools.js` to add custom LangChain tools:

```javascript
const myCustomTool = new DynamicTool({
    name: "my_tool",
    description: "What this tool does",
    func: async (input) => {
        // Your logic here
        return result;
    }
});
```

## 📖 Documentation

- **[DEPLOYMENT_SYNTHCORE.md](./DEPLOYMENT_SYNTHCORE.md)** - Complete VPS deployment guide
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - Quick reference commands
- **[.env.example](./.env.example)** - Environment variables template

## 🤝 Contributing

This is a private project for Synthcore. For internal contributions:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

Private - Synthcore Internal Use Only

## 🆘 Support

For issues or questions:
- Check logs: `pm2 logs whatsapp-ai`
- Review documentation in `DEPLOYMENT_SYNTHCORE.md`
- Contact: [your-email@synthcore.in]

## 🎉 Acknowledgments

Built with:
- [LangChain](https://js.langchain.com/) - AI orchestration
- [OpenRouter](https://openrouter.ai/) - Grok AI access
- [Pinecone](https://www.pinecone.io/) - Vector database
- [Supabase](https://supabase.com/) - PostgreSQL database
- [GoHighLevel](https://www.gohighlevel.com/) - CRM platform
- [Express.js](https://expressjs.com/) - Web framework
- [PM2](https://pm2.keymetrics.io/) - Process manager

---

**Made with ❤️ by Synthcore Team**
