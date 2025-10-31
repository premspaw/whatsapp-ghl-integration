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
// Ensure these services are scoped outside try/catch so routes can access them
let pdfProcessingService, websiteScraperService, analyticsService;

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
  
  // Initialize the new services (assign to outer-scoped vars)
  pdfProcessingService = new PDFProcessingService(enhancedAIService.embeddings);
  websiteScraperService = new WebsiteScraperService(enhancedAIService.embeddings);
  analyticsService = new AnalyticsService();
  
  // Connect webhook cache invalidation to GHL service cache
  webhookService.onInvalidate = (contactId) => {
    try {
      if (ghlService && typeof ghlService.invalidateContactCache === 'function') {
        ghlService.invalidateContactCache(contactId);
      }
    } catch (e) {}
  };
  // Initialize Supabase (server-side) — resilient to invalid config
  try {
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const looksValidUrl = typeof supaUrl === 'string' && /^https?:\/\/.+/.test(supaUrl);
    if (looksValidUrl && typeof supaKey === 'string' && supaKey.length > 0) {
      supabase = createClient(
        supaUrl,
        supaKey,
        { db: { schema: process.env.SUPABASE_SCHEMA || 'public' } }
      );
      console.log('✅ Supabase client initialized');
    } else {
      console.log('ℹ️ Supabase not configured or invalid; continuing without DB');
    }
  } catch (e) {
    console.warn('⚠️ Supabase initialization failed:', e.message);
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
app.use('/api/handoff-rules', require('./routes/handoffRulesRoutes')(enhancedAIService));

// Conversation utilities used by the WhatsApp tab
app.post('/api/conversations/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    if (!conversationManager || typeof conversationManager.markAsRead !== 'function') {
      return res.status(500).json({ success: false, error: 'ConversationManager not available' });
    }
    await conversationManager.markAsRead(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/conversations/:id/sync-ghl', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ghlService || typeof ghlService.syncConversation !== 'function') {
      return res.status(500).json({ success: false, error: 'GHL service not available' });
    }
    if (!conversationManager || typeof conversationManager.getConversation !== 'function') {
      return res.status(500).json({ success: false, error: 'ConversationManager not available' });
    }
    const conv = await conversationManager.getConversation(id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    const result = await ghlService.syncConversation(conv);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve analytics dashboard
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// GHL Webhook endpoint for outbound messages
app.post('/webhooks/ghl', async (req, res) => {
  try {
    // Verify shared secret if configured
    if (securityService && !securityService.verifyHeaderSecret(req, securityService.ghlSecret)) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    console.log('GHL Webhook received:', JSON.stringify(req.body, null, 2));
    
    const { event, data } = req.body;
    
    // Handle conversation message created events
    if (event === 'conversation.message.created' || event === 'message.created') {
      const message = data.message || data;
      // Idempotency check
      if (securityService) {
        const eventId = securityService.computeEventId(message);
        if (securityService.isDuplicateEvent(eventId)) {
          return res.json({ success: true, message: 'Duplicate ignored' });
        }
        // Mark processed at the end of handler
        res.locals.__eventId = eventId;
      }
      
      // Check if it's an outbound message (from GHL to contact)
      if (message.direction === 'outbound' || message.type === 'outbound') {
        const contactPhone = message.contact?.phone || message.phone;
        const messageText = message.message || message.body || message.text;
        
        if (contactPhone && messageText) {
          console.log(`📤 Sending WhatsApp message to ${contactPhone}: ${messageText}`);
          
          // Check rate limit and WhatsApp readiness
          if (securityService && !securityService.canSendToContact(contactPhone)) {
            console.log('⏱️ Rate limit hit for', contactPhone);
            return res.json({ success: true, message: 'Rate limited' });
          }
          
          // Check if WhatsApp is ready
          if (whatsappService && whatsappService.isReady) {
            try {
              await whatsappService.sendMessage(contactPhone, messageText);
              console.log('✅ WhatsApp message sent successfully');
              if (securityService) securityService.registerContactSend(contactPhone);
            } catch (sendError) {
              console.error('Error sending WhatsApp message:', sendError);
              throw new Error(`Failed to send WhatsApp message: ${sendError.message}`);
            }
          } else {
            console.log('⏳ WhatsApp not ready, waiting 5 seconds...');
            // Wait 5 seconds and try again
            await new Promise(resolve => setTimeout(resolve, 5000));
            if (whatsappService && whatsappService.isReady) {
              try {
                await whatsappService.sendMessage(contactPhone, messageText);
                console.log('✅ WhatsApp message sent successfully (after retry)');
                if (securityService) securityService.registerContactSend(contactPhone);
              } catch (sendError) {
                console.error('Error sending WhatsApp message (retry failed):', sendError);
                throw new Error(`Failed to send WhatsApp message: ${sendError.message}`);
              }
            } else {
              throw new Error('WhatsApp client is not ready or connected');
            }
          }
          
          // Log the sent message back to GHL conversation
          try {
            await ghlService.addOutboundMessage(
              message.contact?.id || message.contactId,
              {
                message: messageText,
                type: 'SMS',
                timestamp: new Date().toISOString(),
                meta: { source: 'whatsapp' }
              },
              message.conversationId
            );
            console.log('✅ Message logged back to GHL');
          } catch (logError) {
            console.error('Error logging message to GHL:', logError);
          }
        }
      }
    }
    
    // Mark idempotent processed
    if (securityService && res.locals.__eventId) securityService.markEventProcessed(res.locals.__eventId);
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('GHL Webhook Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WhatsApp Provider inbound webhook (Option A compatible)
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    // Verify shared secret if configured
    if (securityService && !securityService.verifyHeaderSecret(req, securityService.whatsappSecret)) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    // Ack quickly
    res.status(200).json({ success: true });

    const payload = req.body || {};
    const from = payload.from || payload.phone || payload.sender;
    const text = (payload.text && (payload.text.body || payload.text)) || payload.message || payload.body || '';
    const timestamp = Number(payload.timestamp) || Date.now();

    if (!from || !text) {
      console.log('⚠️ Inbound WhatsApp webhook missing from/text');
      return;
    }

    // Idempotency
    let __eventId = null;
    if (securityService) {
      __eventId = securityService.computeEventId(payload);
      if (securityService.isDuplicateEvent(__eventId)) {
        return; // already processed
      }
    }

    // Store conversation message
    await conversationManager.addMessage({
      id: payload.providerMessageId || `prov_${Date.now()}`,
      from: from,
      body: text,
      timestamp: timestamp,
      type: 'text',
      direction: 'inbound'
    });

    console.log(`📨 Inbound WhatsApp message from ${from}: ${text}`);

    // Get or create GHL contact
    let contact;
    try {
      contact = await ghlService.findContactByPhone(from);
      if (!contact) {
        contact = await ghlService.createContact({
          phone: from,
          firstName: 'WhatsApp',
          lastName: 'Contact'
        });
        console.log('✅ Created new GHL contact:', contact.id);
      }
    } catch (contactError) {
      console.error('Error handling GHL contact:', contactError);
      return;
    }

    // Add message to GHL conversation
    try {
      await ghlService.addInboundMessage(contact.id, {
        message: text,
        type: 'SMS',
        timestamp: new Date(timestamp).toISOString(),
        meta: { source: 'whatsapp' }
      });
      console.log('✅ Message added to GHL conversation');
    } catch (ghlError) {
      console.error('Error adding message to GHL:', ghlError);
    }

    // Generate AI response using Enhanced AI Service with RAG
    try {
      const aiResponse = await enhancedAIService.generateContextualReply(text, from, contact.id);
      
      if (aiResponse && aiResponse.trim()) {
        console.log(`🤖 AI Response: ${aiResponse}`);
        
        // Send AI response back via WhatsApp
        if (whatsappService && whatsappService.isReady) {
          await whatsappService.sendMessage(from, aiResponse);
          console.log('✅ AI response sent via WhatsApp');
          
          // Log AI response to GHL
          await ghlService.addOutboundMessage(contact.id, {
            message: aiResponse,
            type: 'SMS',
            timestamp: new Date().toISOString(),
            meta: { source: 'ai_whatsapp' }
          });
          console.log('✅ AI response logged to GHL');
        } else {
          console.log('⚠️ WhatsApp not ready, AI response not sent');
        }
      }
    } catch (aiErr) {
      console.error('❌ AI error (provider webhook path):', aiErr.message);
    }

    // Mark processed
    if (securityService && __eventId) securityService.markEventProcessed(__eventId);
  } catch (error) {
    console.error('WhatsApp webhook error:', error.message);
  }
});

// Webhook automation endpoints
app.post('/webhooks/ghl-automation', async (req, res) => {
  try {
    console.log('🤖 GHL Automation Webhook received:', JSON.stringify(req.body, null, 2));
    
    // Process the webhook through our webhook service
    await webhookService.processGHLWebhook(req.body);
    
    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ GHL Automation Webhook Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Setup automation triggers
app.post('/api/automation/setup', async (req, res) => {
  try {
    const { locationId } = req.body;
    const webhook = await webhookService.setupAutomationTriggers({ locationId });
    
    res.json({
      success: true,
      webhook: webhook
    });
  } catch (error) {
    console.error('❌ Error setting up automation:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get webhooks status
app.get('/api/automation/webhooks', async (req, res) => {
  try {
    const { locationId } = req.query;
    const webhooks = await webhookService.getWebhooks(locationId);
    
    res.json({
      success: true,
      webhooks: webhooks,
      count: webhooks.length
    });
  } catch (error) {
    console.error('❌ Error fetching webhooks:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete webhook
app.delete('/api/automation/webhooks/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { locationId } = req.query;
    await webhookService.deleteWebhook(webhookId, locationId);
    
    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize WhatsApp service after server starts
  if (whatsappService && whatsappService.initialize) {
    console.log('🔄 Initializing WhatsApp service...');
    
    // Set up event handlers
    whatsappService.on('qr', (qr) => {
      console.log('📱 QR Code received - scan with WhatsApp');
      // QR code is already displayed in terminal by whatsapp-web.js
    });

    whatsappService.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
    });

    whatsappService.on('disconnected', () => {
      console.log('❌ WhatsApp client disconnected');
    });

    whatsappService.on('message', async (message) => {
      try {
        console.log('📨 Received WhatsApp message:', message.body);
        // Message handling is done through webhooks, but we can log here
      } catch (error) {
        console.error('❌ Error handling WhatsApp message:', error);
      }
    });

    // Initialize the service
    whatsappService.initialize();
  }
});
