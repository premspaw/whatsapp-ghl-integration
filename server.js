const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Simple AI Reply Function (without MCP dependency)
async function generateSimpleAIReply(message, contactName) {
  try {
    const responses = [
      `Hello ${contactName}! Thanks for reaching out. How can I help you today?`,
      `Hi ${contactName}! I'm here to assist you. What do you need help with?`,
      `Hello! Thanks for your message. I'm ready to help you with any questions you have.`,
      `Hi there! How can I make your day better today?`,
      `Hello! I'm here to provide excellent customer service. What can I do for you?`
    ];
    
    // Simple keyword-based responses
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello ${contactName}! How can I help you today?`;
    } else if (lowerMessage.includes('help')) {
      return `I'm here to help you, ${contactName}! What specific assistance do you need?`;
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return `I'd be happy to discuss pricing with you, ${contactName}. Let me connect you with our sales team.`;
    } else if (lowerMessage.includes('thank')) {
      return `You're very welcome, ${contactName}! Is there anything else I can help you with?`;
    } else {
      // Random response for other messages
      return responses[Math.floor(Math.random() * responses.length)];
    }
  } catch (error) {
    console.error('Error generating simple AI reply:', error);
    return `Hello ${contactName}! Thanks for your message. How can I help you today?`;
  }
}

const WhatsAppService = require('./services/whatsappService');
const MockWhatsAppService = require('./services/mockWhatsAppService');
const GHLService = require('./services/ghlService');
const AIService = require('./services/aiService');
const MCPAIService = require('./services/mcpAIService');
const EnhancedAIService = require('./services/enhancedAIService');
const ConversationManager = require('./services/conversationManager');
const SMSService = require('./services/smsService');
// Email service removed - WhatsApp only
const WebhookService = require('./services/webhookService');
const { createClient } = require('@supabase/supabase-js');
const SecurityService = require('./services/securityService');
const { createHandoff, listHandoffs, assignHandoff, resolveHandoff } = require('./services/db/handoffRepo');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Ngrok bypass middleware - add headers to skip browser warning
app.use((req, res, next) => {
  // Add ngrok-skip-browser-warning header to all responses
  res.setHeader('ngrok-skip-browser-warning', 'true');
  
  // Allow all origins for ngrok compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Initialize services with error handling
let whatsappService, ghlService, aiService, enhancedAIService, mcpAIService, conversationManager, smsService, webhookService, securityService;
let useMockWhatsApp;
let supabase;

try {
  useMockWhatsApp = process.env.USE_MOCK_WHATSAPP === 'true';
  whatsappService = useMockWhatsApp ? new MockWhatsAppService() : new WhatsAppService();
  ghlService = new GHLService();
  aiService = new AIService();
  mcpAIService = new MCPAIService(ghlService); // Initialize MCP AI Service
  enhancedAIService = new EnhancedAIService(ghlService); // Initialize Enhanced AI Service
  conversationManager = new ConversationManager();
  smsService = new SMSService();
  // Email service removed - WhatsApp only
  webhookService = new WebhookService();
  securityService = new SecurityService();
  // Initialize new AI-related services
  const PDFProcessingService = require('./services/pdfProcessingService');
  const WebsiteScraperService = require('./services/websiteScraperService');
  const AnalyticsService = require('./services/analyticsService');
  
  // Initialize the new services
  const pdfProcessingService = new PDFProcessingService(enhancedAIService.embeddings);
  const websiteScraperService = new WebsiteScraperService(enhancedAIService.embeddings);
  const analyticsService = new AnalyticsService();
  
  // Connect webhook cache invalidation to GHL service cache
  webhookService.onInvalidate = (contactId) => {
    try {
      if (ghlService && typeof ghlService.invalidateContactCache === 'function') {
        ghlService.invalidateContactCache(contactId);
      }
    } catch (e) {}
  };
  // Initialize Supabase (server-side)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: process.env.SUPABASE_SCHEMA || 'public' } }
    );
    console.log('✅ Supabase client initialized');
  } else {
    console.log('ℹ️ Supabase not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
  }
  // Listen for AI human-handoff requests
  enhancedAIService.on('handoff', ({ phoneNumber, conversationId, message }) => {
    console.log('🤝 Human handoff requested for', phoneNumber);
    io.emit('handoff_requested', { phoneNumber, conversationId, message });
    // Persist to DB if configured
    (async () => {
      try {
        await createHandoff({ phone: phoneNumber, conversationRef: conversationId, summary: message });
      } catch (e) {}
    })();
  });
  
  console.log('✅ All services initialized successfully');
  console.log(`📱 WhatsApp Mode: ${useMockWhatsApp ? 'Mock' : 'Real'}`);
  
  // Track AI conversation metrics for analytics
  enhancedAIService.on('conversation', (data) => {
    try {
      analyticsService.logConversation({
        contactId: data.contactId,
        phoneNumber: data.phoneNumber,
        message: data.message,
        response: data.response,
        responseTime: data.responseTime,
        usedKnowledgeBase: data.usedKnowledgeBase
      });
    } catch (e) {
      console.error('Error logging conversation for analytics:', e);
    }
  });
          } catch (error) {
  console.error('❌ Error initializing services:', error.message);
  process.exit(1);
}

// API Routes
app.use('/api/whatsapp', require('./routes/whatsappRoutes')(whatsappService, ghlService, enhancedAIService, conversationManager));
app.use('/api/ghl', require('./routes/ghlRoutes')(ghlService));
app.use('/api/ai', require('./routes/aiRoutes')(aiService, mcpAIService, enhancedAIService));
app.use('/api/analytics', require('./routes/analyticsRoutes')(analyticsService, securityService));
app.use('/api/knowledge', require('./routes/knowledgeRoutes')(enhancedAIService, pdfProcessingService, websiteScraperService));

// Serve analytics dashboard
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
