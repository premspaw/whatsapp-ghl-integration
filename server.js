const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const WhatsAppService = require('./services/whatsappService');
const MockWhatsAppService = require('./services/mockWhatsAppService');
const GHLService = require('./services/ghlService');
const AIService = require('./services/aiService');
const ConversationManager = require('./services/conversationManager');
const SMSService = require('./services/smsService');
const EmailService = require('./services/emailService');

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
app.use(express.static(path.join(__dirname, 'public')));

// Initialize services with error handling
let whatsappService, ghlService, aiService, conversationManager, smsService, emailService;
let useMockWhatsApp;

try {
  useMockWhatsApp = process.env.USE_MOCK_WHATSAPP === 'true';
  whatsappService = useMockWhatsApp ? new MockWhatsAppService() : new WhatsAppService();
  ghlService = new GHLService();
  aiService = new AIService();
  conversationManager = new ConversationManager();
  smsService = new SMSService();
  emailService = new EmailService();
  
  console.log('✅ All services initialized successfully');
  console.log(`📱 WhatsApp Mode: ${useMockWhatsApp ? 'Mock' : 'Real'}`);
} catch (error) {
  console.error('❌ Error initializing services:', error.message);
  process.exit(1);
}

// Store active connections
let activeConnections = new Map();

// In-memory WhatsApp connection status
let whatsappConnection = {
  connected: false,
  type: null,
  phoneNumber: null,
  businessName: null
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_whatsapp', (data) => {
    socket.join('whatsapp');
    console.log('Client joined WhatsApp room');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// WhatsApp event handlers
whatsappService.on('qr', (qr) => {
  console.log('QR Code received');
  io.to('whatsapp').emit('qr_code', qr);
});

whatsappService.on('ready', () => {
  console.log('WhatsApp client is ready!');
  io.to('whatsapp').emit('whatsapp_ready', { status: 'connected' });
  // Update in-memory status
  whatsappConnection.connected = true;
});

        whatsappService.on('message', async (message) => {
          try {
            console.log('New WhatsApp message:', message.body);
            
            // Store conversation
            await conversationManager.addMessage(message);
            
            // Emit to frontend
            io.to('whatsapp').emit('new_message', {
              id: message.id._serialized,
              from: message.from,
              body: message.body,
              timestamp: message.timestamp,
              type: message.type
            });

            // FIRST: Sync the user's message to GHL immediately
            try {
              console.log('🔄 Auto-syncing user message to GHL...');
              const conversation = await conversationManager.getConversation(message.from);
              await ghlService.syncConversation(conversation);
              console.log('✅ User message auto-synced to GHL');
            } catch (syncError) {
              console.error('❌ Error auto-syncing user message to GHL:', syncError.message);
            }

            // Check if AI reply is enabled for this conversation
            const conversation = await conversationManager.getConversation(message.from);
            if (conversation && conversation.aiEnabled) {
              // Generate AI reply
              const aiReply = await aiService.generateReply(message.body, conversation.context);
              
              if (aiReply) {
                // Send AI reply back to WhatsApp
                await whatsappService.sendMessage(message.from, aiReply);
                
                // Store AI reply in conversation
                await conversationManager.addMessage({
                  from: 'ai',
                  body: aiReply,
                  timestamp: Date.now(),
                  type: 'text'
                }, message.from);
                
                // Emit AI reply to frontend
                io.to('whatsapp').emit('ai_reply', {
                  to: message.from,
                  body: aiReply,
                  timestamp: Date.now()
                });

                // SECOND: Sync the AI reply to GHL
                try {
                  console.log('🔄 Auto-syncing AI reply to GHL...');
                  const updatedConversation = await conversationManager.getConversation(message.from);
                  await ghlService.syncConversation(updatedConversation);
                  console.log('✅ AI reply auto-synced to GHL');
                } catch (syncError) {
                  console.error('❌ Error auto-syncing AI reply to GHL:', syncError.message);
                }
              }
            }

          } catch (error) {
            console.error('Error handling WhatsApp message:', error);
          }
        });

// SMS event handlers
smsService.on('message', async (message) => {
  try {
    console.log('New SMS message:', message.body);
    
    // Store conversation
    await conversationManager.addMessage(message);
    
    // Emit to frontend
    io.to('whatsapp').emit('new_message', {
      id: message.id,
      from: message.from,
      body: message.body,
      timestamp: message.timestamp,
      type: message.type
    });

    // Check if AI reply is enabled for this conversation
    const conversation = await conversationManager.getConversation(message.from);
    if (conversation && conversation.aiEnabled) {
      // Generate AI reply
      const aiReply = await aiService.generateReply(message.body, conversation.context);
      
      if (aiReply) {
        // Send AI reply back via SMS
        await smsService.sendSMS(message.from, aiReply);
        
        // Store AI reply in conversation
        await conversationManager.addMessage({
          from: 'ai',
          body: aiReply,
          timestamp: Date.now(),
          type: 'sms'
        }, message.from);
        
        // Emit AI reply to frontend
        io.to('whatsapp').emit('ai_reply', {
          to: message.from,
          body: aiReply,
          timestamp: Date.now()
        });
      }
    }

    // Sync with GHL if enabled
    if (conversation && conversation.syncToGHL) {
      await ghlService.syncConversation(conversation);
    }

  } catch (error) {
    console.error('Error handling SMS message:', error);
  }
});

// Email event handlers
emailService.on('message', async (message) => {
  try {
    console.log('New Email message:', message.subject);
    
    // Store conversation
    await conversationManager.addMessage(message);
    
    // Emit to frontend
    io.to('whatsapp').emit('new_message', {
      id: message.id,
      from: message.from,
      body: message.body,
      timestamp: message.timestamp,
      type: message.type,
      subject: message.subject
    });

    // Check if AI reply is enabled for this conversation
    const conversation = await conversationManager.getConversation(message.from);
    if (conversation && conversation.aiEnabled) {
      // Generate AI reply
      const aiReply = await aiService.generateReply(message.body, conversation.context);
      
      if (aiReply) {
        // Send AI reply back via Email
        await emailService.sendReply(message.from, message.subject, aiReply);
        
        // Store AI reply in conversation
        await conversationManager.addMessage({
          from: 'ai',
          body: aiReply,
          timestamp: Date.now(),
          type: 'email'
        }, message.from);
        
        // Emit AI reply to frontend
        io.to('whatsapp').emit('ai_reply', {
          to: message.from,
          body: aiReply,
          timestamp: Date.now()
        });
      }
    }

    // Sync with GHL if enabled
    if (conversation && conversation.syncToGHL) {
      await ghlService.syncConversation(conversation);
    }

  } catch (error) {
    console.error('Error handling Email message:', error);
  }
});

// API Routes
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await conversationManager.getAllConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Custom WhatsApp Conversations API for the custom tab
app.get('/api/whatsapp/conversations', async (req, res) => {
  try {
    const conversations = await conversationManager.getAllConversations();
    
    // Format conversations for the custom tab
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      contactName: conv.contactName || 'Unknown Contact',
      phoneNumber: conv.phoneNumber,
      messages: conv.messages || [],
      lastMessage: conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null,
      messageCount: conv.messages ? conv.messages.length : 0,
      aiEnabled: conv.aiEnabled || false,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }));

    res.json({ 
      success: true,
      conversations: formattedConversations,
      total: formattedConversations.length
    });
  } catch (error) {
    console.error('Error fetching WhatsApp conversations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch WhatsApp conversations' 
    });
  }
});

app.get('/api/conversations/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const conversations = await conversationManager.getConversationsByType(type);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conversations/:id', async (req, res) => {
  try {
    const conversation = await conversationManager.getConversation(req.params.id);
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/conversations/:id/ai-toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    await conversationManager.toggleAI(req.params.id, enabled);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/conversations/:id/ghl-sync', async (req, res) => {
  try {
    const { enabled } = req.body;
    await conversationManager.toggleGHLSync(req.params.id, enabled);
    
    // If enabling sync, immediately sync the conversation
    if (enabled) {
      try {
        const conversation = await conversationManager.getConversation(req.params.id);
        if (conversation) {
          await ghlService.syncConversation(conversation);
          console.log('✅ Conversation synced to GHL immediately');
        }
      } catch (syncError) {
        console.error('Error syncing conversation to GHL:', syncError);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual sync endpoint
app.post('/api/conversations/:id/sync-ghl', async (req, res) => {
  try {
    const id = req.params.id;
    const conversation = await conversationManager.getConversation(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    // Validate phone format early (strip whatsapp suffixes)
    if (!conversation.phone && typeof id === 'string') {
      const digits = id.replace('@c.us', '').replace(/[^0-9]/g, '');
      if (!digits) {
        return res.status(400).json({ error: 'Invalid phone identifier for sync' });
      }
      conversation.phone = `+${digits}`;
    }
    
    const result = await ghlService.syncConversation(conversation);
    res.json({ 
      success: true, 
      message: 'Conversation synced to GHL',
      contact: result.contact,
      conversation: result.conversation
    });
  } catch (error) {
    console.error('Error manually syncing conversation:', error);
    const msg = (error && error.response && error.response.data && error.response.data.message) ? error.response.data.message : error.message;
    if (/phone number/i.test(msg)) {
      return res.status(400).json({ error: 'Invalid phone number for GHL. Ensure E.164 like +918123133382' });
    }
    res.status(500).json({ error: msg });
  }
});

app.post('/api/send-message', async (req, res) => {
  try {
    const { to, message } = req.body;
    await whatsappService.sendMessage(to, message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ghl/contacts', async (req, res) => {
  try {
    const contacts = await ghlService.getContacts();
    res.json(contacts);
  } catch (error) {
    console.error('GHL API Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'GHL API connection failed. Check your API key and location ID.'
    });
  }
});

// GHL Conversations API endpoints
app.get('/api/ghl/conversations/search', async (req, res) => {
  try {
    const searchParams = req.query;
    const conversations = await ghlService.searchConversations(searchParams);
    res.json(conversations);
  } catch (error) {
    console.error('GHL Conversations Search Error:', error.message);
    res.status(500).json({
      error: error.message,
      details: 'Failed to search GHL conversations.'
    });
  }
});


// WhatsApp Widget API endpoint
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { message, phoneNumber, businessName } = req.body;
    
    console.log('WhatsApp widget message received:', { message, phoneNumber, businessName });
    
    // Mock response - in real implementation, this would send to WhatsApp
    const response = {
      success: true,
      response: `Thank you for your message: "${message}". We'll get back to you soon!`,
      messageId: Date.now().toString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('WhatsApp Widget Error:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Workflow Automation API endpoints
app.get('/api/workflow/status', async (req, res) => {
  try {
    // Mock workflow status
    const status = {
      whatsapp: 'connected',
      ai: 'training',
      ghl: 'connected',
      website: 'pending'
    };
    
    res.json(status);
  } catch (error) {
    console.error('Workflow Status Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflow/save', async (req, res) => {
  try {
    const workflow = req.body;
    
    console.log('Saving workflow:', workflow);
    
    // Mock workflow save
    const result = {
      success: true,
      message: 'Workflow saved successfully',
      workflowId: Date.now().toString()
    };
    
    res.json(result);
  } catch (error) {
    console.error('Workflow Save Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/train', async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    console.log('AI training data received:', { question, answer });
    
    // Mock AI training
    const result = {
      success: true,
      message: 'AI training data added successfully',
      trainingId: Date.now().toString()
    };
    
    res.json(result);
  } catch (error) {
    console.error('AI Training Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Simple Dashboard API endpoints
app.get('/api/integration/status', async (req, res) => {
  try {
    const status = {
      whatsapp: whatsappConnection.connected ? 'connected' : 'disconnected',
      ai: 'training',
      ghl: 'connected',
      automation: whatsappConnection.connected ? 'ready' : 'blocked',
      phoneNumber: whatsappConnection.phoneNumber,
      businessName: whatsappConnection.businessName
    };
    
    res.json(status);
  } catch (error) {
    console.error('Integration Status Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/whatsapp/connect', async (req, res) => {
  try {
    const { connectionType, phoneNumber, metaToken, phoneNumberId, businessNumber, businessName, businessDescription, metaAppId } = req.body;
    
    console.log('WhatsApp connection request:', { connectionType, phoneNumber, businessNumber });
    
    if (connectionType === 'api') {
      // WhatsApp Business API connection
      // Update in-memory state (pending until ready event)
      whatsappConnection.type = 'api';
      whatsappConnection.phoneNumber = phoneNumber || null;
      whatsappConnection.businessName = businessName || null;
      
      const result = {
        success: true,
        message: 'WhatsApp Business API connected successfully',
        connectionId: Date.now().toString(),
        connectionType: 'api',
        phoneNumber: phoneNumber
      };
      
      res.json(result);
    } else if (connectionType === 'business') {
      // Existing WhatsApp Business connection (Like Make.com)
      // Update in-memory state (pending until ready event)
      whatsappConnection.type = 'business';
      whatsappConnection.phoneNumber = businessNumber || null;
      whatsappConnection.businessName = businessName || null;
      
      const result = {
        success: true,
        message: 'Existing WhatsApp Business connected successfully! (Like Make.com)',
        connectionId: Date.now().toString(),
        connectionType: 'business',
        phoneNumber: businessNumber,
        businessName: businessName,
        metaAppId: metaAppId,
        coexistsWithRegular: true,
        conversationOnly: true
      };
      
      res.json(result);
    } else {
      res.status(400).json({ error: 'Invalid connection type' });
    }
    
  } catch (error) {
    console.error('WhatsApp Connection Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/response', async (req, res) => {
  try {
    const { question, trainingData } = req.body;
    
    // Simple AI response based on training data
    let response = "I'm sorry, I don't have information about that. Please contact our support team for assistance.";
    
    if (trainingData && trainingData.length > 0) {
      const lowerQuestion = question.toLowerCase();
      for (const item of trainingData) {
        if (lowerQuestion.includes(item.question.toLowerCase()) || 
            item.question.toLowerCase().includes(lowerQuestion)) {
          response = item.answer;
          break;
        }
      }
    }
    
    res.json({
      success: true,
      response: response,
      question: question
    });
  } catch (error) {
    console.error('AI Response Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WhatsApp Status and QR Code endpoints
app.get('/api/whatsapp/status', async (req, res) => {
  try {
    const status = {
      connected: whatsappConnection.connected,
      phoneNumber: whatsappConnection.phoneNumber,
      businessName: whatsappConnection.businessName
    };
    res.json(status);
  } catch (error) {
    console.error('WhatsApp Status Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/whatsapp/cancel', async (req, res) => {
  try {
    console.log('Canceling WhatsApp connection...');

    // Try to logout/cleanup WhatsApp client if supported
    try {
      if (whatsappService && typeof whatsappService.logout === 'function') {
        await whatsappService.logout();
      } else if (whatsappService && typeof whatsappService.destroy === 'function') {
        await whatsappService.destroy();
      }
    } catch (e) {
      console.error('WhatsApp logout error (non-fatal):', e.message);
    }

    // Reset in-memory connection state
    whatsappConnection.connected = false;
    whatsappConnection.type = null;
    whatsappConnection.connectionType = null;
    whatsappConnection.phoneNumber = null;
    whatsappConnection.businessName = null;
    
    console.log('WhatsApp connection state reset:', whatsappConnection);

    res.json({ success: true, message: 'WhatsApp connection cancelled' });
  } catch (error) {
    console.error('WhatsApp Cancel Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ghl/conversations/:id', async (req, res) => {
  try {
    const conversation = await ghlService.getConversationById(req.params.id);
    res.json(conversation);
  } catch (error) {
    console.error('GHL Conversation Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch GHL conversation.'
    });
  }
});

app.get('/api/ghl/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await ghlService.getConversationMessages(req.params.id);
    res.json(messages);
  } catch (error) {
    console.error('GHL Conversation Messages Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch GHL conversation messages.'
    });
  }
});

app.get('/api/ghl/contacts/:contactId/conversations', async (req, res) => {
  try {
    const conversations = await ghlService.getConversations(req.params.contactId);
    res.json(conversations);
  } catch (error) {
    console.error('GHL Contact Conversations Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch GHL contact conversations.'
    });
  }
});

// GHL test endpoint
app.get('/api/ghl/test', async (req, res) => {
  try {
    const status = ghlService.getStatus();
    res.json({
      success: true,
      message: 'GHL service status',
      status: status
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      details: 'GHL service test failed'
    });
  }
});

// AI Model Information
app.get('/api/ai/models', async (req, res) => {
  try {
    const models = aiService.getAllModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ai/recommendations', async (req, res) => {
  try {
    const recommendations = aiService.getModelRecommendations();
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ai/status', async (req, res) => {
  try {
    const status = aiService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mock WhatsApp webhook endpoints for testing
app.post('/api/mock/trigger-message', async (req, res) => {
  try {
    const { contactId, message } = req.body;
    
    if (useMockWhatsApp && whatsappService && whatsappService.triggerMockMessage) {
      whatsappService.triggerMockMessage(contactId, message);
      res.json({ success: true, message: 'Mock message triggered' });
    } else {
      console.error('Mock WhatsApp service not available:', {
        useMockWhatsApp,
        hasService: !!whatsappService,
        hasMethod: !!(whatsappService && whatsappService.triggerMockMessage)
      });
      res.status(400).json({ error: 'Mock WhatsApp service not available' });
    }
  } catch (error) {
    console.error('Error triggering mock message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mock/simulate-scenario', async (req, res) => {
  try {
    const { scenario } = req.body;
    
    if (useMockWhatsApp && whatsappService && whatsappService.simulateConversationScenario) {
      whatsappService.simulateConversationScenario(scenario);
      res.json({ success: true, message: `Scenario '${scenario}' triggered` });
    } else {
      console.error('Mock WhatsApp service not available for scenario:', {
        useMockWhatsApp,
        hasService: !!whatsappService,
        hasMethod: !!(whatsappService && whatsappService.simulateConversationScenario)
      });
      res.status(400).json({ error: 'Mock WhatsApp service not available' });
    }
  } catch (error) {
    console.error('Error triggering scenario:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mock/contacts', async (req, res) => {
  try {
    if (useMockWhatsApp && whatsappService && whatsappService.getChats) {
      const contacts = await whatsappService.getChats();
      res.json(contacts);
    } else {
      console.error('Mock WhatsApp service not available for contacts:', {
        useMockWhatsApp,
        hasService: !!whatsappService,
        hasMethod: !!(whatsappService && whatsappService.getChats)
      });
      // Return an empty array so the UI can safely iterate without errors
      res.json([]);
    }
  } catch (error) {
    console.error('Error getting mock contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check service status
app.get('/api/debug/services', async (req, res) => {
  try {
    const status = {
      useMockWhatsApp,
      whatsappService: {
        exists: !!whatsappService,
        type: whatsappService ? whatsappService.constructor.name : 'undefined',
        hasTriggerMethod: !!(whatsappService && whatsappService.triggerMockMessage),
        hasSimulateMethod: !!(whatsappService && whatsappService.simulateConversationScenario),
        hasGetChatsMethod: !!(whatsappService && whatsappService.getChats),
        isReady: !!(whatsappService && whatsappService.isReady)
      },
      ghlService: {
        exists: !!ghlService,
        isConfigured: !!(ghlService && ghlService.getStatus && ghlService.getStatus().isConfigured)
      },
      aiService: {
        exists: !!aiService,
        isConfigured: !!(aiService && aiService.getStatus && aiService.getStatus().isConfigured)
      }
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple test endpoint for mock WhatsApp
app.get('/api/mock/test', async (req, res) => {
  try {
    if (useMockWhatsApp && whatsappService) {
      res.json({ 
        success: true, 
        message: 'Mock WhatsApp service is available',
        serviceType: whatsappService.constructor.name,
        hasTriggerMethod: !!whatsappService.triggerMockMessage
      });
    } else {
      res.status(400).json({ 
        error: 'Mock WhatsApp not available',
        useMockWhatsApp,
        hasService: !!whatsappService
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve WhatsApp conversations page
app.get('/whatsapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'whatsapp-conversations.html'));
});

// Serve the unified dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});


// Serve the workflow automation interface
app.get('/workflow', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'workflow-automation.html'));
});

// Serve the simple dashboard
app.get('/simple', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simple-dashboard.html'));
});

// GHL Webhook endpoint for outbound messages
app.post('/webhooks/ghl', async (req, res) => {
  try {
    console.log('GHL Webhook received:', JSON.stringify(req.body, null, 2));
    
    const { event, data } = req.body;
    
    // Handle conversation message created events
    if (event === 'conversation.message.created' || event === 'message.created') {
      const message = data.message || data;
      
      // Check if it's an outbound message (from GHL to contact)
      if (message.direction === 'outbound' || message.type === 'outbound') {
        const contactPhone = message.contact?.phone || message.phone;
        const messageText = message.message || message.body || message.text;
        
        if (contactPhone && messageText) {
          console.log(`📤 Sending WhatsApp message to ${contactPhone}: ${messageText}`);
          
          // Check if WhatsApp is connected AND ready
          if (whatsappConnection.connected && whatsappService && whatsappService.isReady) {
            try {
              await whatsappService.sendMessage(contactPhone, messageText);
              console.log('✅ WhatsApp message sent successfully');
            } catch (sendError) {
              console.error('Error sending WhatsApp message:', sendError);
              throw new Error(`Failed to send WhatsApp message: ${sendError.message}`);
            }
          } else {
            console.log('⏳ WhatsApp not ready, waiting 5 seconds...');
            // Wait 5 seconds and try again
            await new Promise(resolve => setTimeout(resolve, 5000));
            if (whatsappConnection.connected && whatsappService && whatsappService.isReady) {
              try {
                await whatsappService.sendMessage(contactPhone, messageText);
                console.log('✅ WhatsApp message sent successfully (after retry)');
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
                timestamp: new Date().toISOString()
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
    
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('GHL Webhook Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the application`);
  
  // Initialize all services with error handling
  try {
    console.log('🚀 Initializing services...');
    
    if (whatsappService && whatsappService.initialize) {
      whatsappService.initialize();
      console.log('✅ WhatsApp service initialized');
    }
    
    if (smsService && smsService.initialize) {
      smsService.initialize();
      console.log('✅ SMS service initialized');
    }
    
    if (emailService && emailService.initialize) {
      emailService.initialize();
      console.log('✅ Email service initialized');
    }
    
    console.log('🎉 All services started successfully!');
  } catch (error) {
    console.error('❌ Error starting services:', error.message);
    console.error('Stack trace:', error.stack);
  }
});
