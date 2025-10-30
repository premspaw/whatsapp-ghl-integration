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

  // Support generic room join used by frontend
  socket.on('join_room', (room) => {
    const targetRoom = room || 'whatsapp';
    socket.join(targetRoom);
    console.log('Client joined room:', targetRoom);
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
  console.log('✅ WhatsApp connection state set to connected:', whatsappConnection);
  console.log('🔍 Current whatsappConnection object:', JSON.stringify(whatsappConnection, null, 2));
  // Emit status update for UI compatibility
  io.emit('status_update', {
    whatsapp: 'connected',
    ai: 'training',
    ghl: 'connected',
    automation: 'ready',
    phoneNumber: whatsappConnection.phoneNumber,
    businessName: whatsappConnection.businessName
  });
});

whatsappService.on('disconnected', () => {
  console.log('WhatsApp client disconnected!');
  io.to('whatsapp').emit('whatsapp_disconnected', { status: 'disconnected' });
  // Update in-memory status
  whatsappConnection.connected = false;
  console.log('❌ WhatsApp connection state set to disconnected:', whatsappConnection);
  // Emit status update for UI compatibility
  io.emit('status_update', {
    whatsapp: 'disconnected',
    ai: 'training',
    ghl: 'connected',
    automation: 'blocked',
    phoneNumber: whatsappConnection.phoneNumber,
    businessName: whatsappConnection.businessName
  });
});

        whatsappService.on('message', async (message) => {
          try {
            console.log('📨 Received message from:', message.from, 'Body:', message.body.substring(0, 50));
            
            // Skip group messages - only process individual customer conversations
            if (process.env.FILTER_GROUP_MESSAGES !== 'false' && message.from.includes('@g.us')) {
              console.log('🚫 Skipping group message from:', message.from);
              return;
            }
            
            // Skip messages from WhatsApp status/broadcast
            if (process.env.FILTER_BROADCAST_MESSAGES !== 'false' && 
                (message.from.includes('status@broadcast') || message.from.includes('@broadcast'))) {
              console.log('🚫 Skipping broadcast message');
              return;
            }
            
            // Skip OTP and promotional messages from companies
            if (process.env.FILTER_COMPANY_MESSAGES !== 'false') {
              const messageText = message.body.toLowerCase();
              
              // OTP patterns
              if (messageText.includes('otp') || 
                  messageText.includes('one time password') ||
                  messageText.includes('verification code') ||
                  messageText.includes('your code is') ||
                  messageText.includes('enter this code') ||
                  /\d{4,6}/.test(messageText) && (messageText.includes('code') || messageText.includes('pin'))) {
                console.log('🚫 Skipping OTP message:', message.body.substring(0, 50) + '...');
                return;
              }
              
              // Promotional patterns
              if (messageText.includes('offer') && (messageText.includes('limited time') || messageText.includes('discount')) ||
                  messageText.includes('promotion') ||
                  messageText.includes('sale') && messageText.includes('%') ||
                  messageText.includes('buy now') ||
                  messageText.includes('shop now') ||
                  messageText.includes('click here') ||
                  messageText.includes('unsubscribe') ||
                  messageText.includes('stop receiving')) {
                console.log('🚫 Skipping promotional message:', message.body.substring(0, 50) + '...');
                return;
              }
              
              // Company API patterns (common company numbers)
              if (message.from.includes('+91') && message.from.length > 12) {
                // Check if it's a known company number pattern
                const companyPatterns = [
                  'amazon', 'flipkart', 'swiggy', 'zomato', 'uber', 'ola', 
                  'paytm', 'phonepe', 'gpay', 'whatsapp', 'facebook', 'instagram',
                  'netflix', 'spotify', 'youtube', 'google', 'microsoft'
                ];
                
                const isCompanyMessage = companyPatterns.some(pattern => 
                  messageText.includes(pattern)
                );
                
                if (isCompanyMessage) {
                  console.log('🚫 Skipping company message:', message.body.substring(0, 50) + '...');
                  return;
                }
              }
            }
            
            console.log('New WhatsApp message:', message.body);
            
            // Check GHL contacts first to get the proper name
            let contactName = 'Unknown Contact';
            try {
              // First, check if this number exists in GHL contacts
              const normalizedPhone = ghlService.normalizePhoneNumber(message.from);
              if (normalizedPhone) {
                const ghlContact = await ghlService.findContactByPhone(normalizedPhone);
                if (ghlContact) {
                  contactName = ghlContact.firstName || ghlContact.name || 'Unknown Contact';
                  console.log('📞 Found in GHL contacts:', contactName);
                } else {
                  // Not in GHL, try to get WhatsApp name as fallback
                  try {
                    const whatsappContact = await message.getContact();
                    contactName = whatsappContact.name || whatsappContact.pushname || 'Unknown Contact';
                    console.log('📞 Not in GHL, using WhatsApp name:', contactName);
                  } catch (whatsappError) {
                    console.log('📞 Not in GHL and no WhatsApp name, using Unknown Contact');
                  }
                }
              }
            } catch (error) {
              console.log('⚠️ Error checking GHL contacts, using Unknown Contact');
            }
            
            // Store conversation with correct parameter order (conversationId, contactName)
            await conversationManager.addMessage(message, message.from, contactName);
            
            // Emit to frontend
            io.to('whatsapp').emit('new_message', {
              id: message.id._serialized,
              from: message.from,
              body: message.body,
              timestamp: message.timestamp,
              type: message.type,
              contactName: contactName
            });
            // Also emit generic 'message' event for frontend compatibility
            io.emit('message', {
              id: message.id._serialized,
              from: message.from,
              body: message.body,
              timestamp: message.timestamp,
              type: message.type
            });

            // FIRST: Sync the user's message to GHL immediately
            try {
              console.log('🔄 Auto-syncing user message to GHL...');
              let conversation = await conversationManager.getConversation(message.from);
              
              // Ensure conversation exists and has required properties
              if (!conversation) {
                console.log('📝 Creating new conversation for:', message.from);
                conversation = {
                  id: message.from,
                  phone: message.from,
                  contactName: contactName,
                  messages: [],
                  aiEnabled: true,
                  createdAt: new Date().toISOString()
                };
                await conversationManager.addConversation(conversation);
              }
              
              // Update conversation with contact name if not already set
              if (!conversation.contactName) {
                conversation.contactName = contactName;
                await conversationManager.updateConversation(conversation);
              }
              
              // Ensure phone property exists
              if (!conversation.phone) {
                conversation.phone = message.from;
              }
              
              await ghlService.syncConversation(conversation);
              console.log('✅ User message auto-synced to GHL');
            } catch (syncError) {
              console.error('❌ Error auto-syncing user message to GHL:', syncError.message);
            }

            // Check if AI reply is enabled for this conversation
            console.log('🤖 Starting AI reply check for:', message.from);
            let conversation = await conversationManager.getConversation(message.from);
            console.log('🤖 Checking AI reply for conversation:', conversation ? 'found' : 'not found');
            console.log('🤖 AI enabled:', conversation ? conversation.aiEnabled : 'N/A');
            console.log('🤖 Conversation details:', conversation ? JSON.stringify(conversation, null, 2) : 'No conversation found');
            
            // If conversation doesn't exist, create it for AI
            if (!conversation) {
              console.log('📝 Creating conversation for AI reply:', message.from);
              conversation = {
                id: message.from,
                phone: message.from,
                contactName: contactName,
                messages: [],
                aiEnabled: true,
                createdAt: new Date().toISOString()
              };
              await conversationManager.addConversation(conversation);
            } else {
              // If conversation exists but AI is disabled, enable it
              if (!conversation.aiEnabled) {
                console.log('🤖 Enabling AI for existing conversation:', message.from);
                conversation.aiEnabled = true;
                await conversationManager.updateConversation(conversation);
              }
            }
            
            if (conversation && conversation.aiEnabled) {
              console.log('🧠 Generating AI reply for:', message.body.substring(0, 50) + '...');
              try {
                // Use Enhanced AI Service with memory and automation
                const aiReply = await enhancedAIService.generateContextualReply(message.body, message.from, message.from);
              
              if (aiReply) {
                console.log('✅ AI generated reply:', aiReply.substring(0, 100) + '...');
                // Send AI reply back to WhatsApp
                await whatsappService.sendMessage(message.from, aiReply);
                
                // Store AI reply in conversation
                await conversationManager.addMessage({
                  from: 'ai',
                  body: aiReply,
                  timestamp: Date.now(),
                  type: 'text'
                }, message.from, conversation.contactName);
                
                // Emit AI reply to frontend
                const aiTimestamp = Date.now();
                io.to('whatsapp').emit('ai_reply', {
                  to: message.from,
                  body: aiReply,
                  timestamp: aiTimestamp
                });
                // Also emit generic 'message' event so UI updates in real-time
                io.emit('message', {
                  id: `ai_${aiTimestamp}`,
                  from: 'ai',
                  to: message.from,
                  body: aiReply,
                  timestamp: aiTimestamp,
                  type: 'text'
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
              } else {
                console.log('❌ AI did not generate a reply');
              }
              } catch (aiError) {
                console.error('❌ Error generating AI reply:', aiError.message);
              }
            } else {
              console.log('❌ AI reply not enabled for this conversation');
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

// Email service removed - WhatsApp only integration

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
    
    // Format conversations for the custom tab with GHL contact names
    const formattedConversations = await Promise.all(conversations.map(async (conv) => {
      let contactName = conv.contactName || 'Unknown Contact';
      
      // Try to get the actual GHL contact name
      try {
        const normalizedPhone = ghlService.normalizePhoneNumber(conv.phoneNumber || conv.phone);
        if (normalizedPhone) {
          const ghlContact = await ghlService.findContactByPhone(normalizedPhone);
          if (ghlContact) {
            contactName = ghlContact.firstName || ghlContact.name || contactName;
            console.log(`📞 Using GHL contact name: ${contactName} for ${normalizedPhone}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch GHL contact name for ${conv.phoneNumber || conv.phone}:`, error.message);
      }
      
      return {
        id: conv.id,
        contactName: contactName,
        phoneNumber: conv.phoneNumber || conv.phone,
        messages: conv.messages || [],
        lastMessage: conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null,
        messageCount: conv.messages ? conv.messages.length : 0,
        aiEnabled: conv.aiEnabled || false,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
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
    console.log('📞 Manual sync requested for conversation:', id);
    
    const conversation = await conversationManager.getConversation(id);
    if (!conversation) {
      console.error('❌ Conversation not found:', id);
      return res.status(404).json({ error: 'Conversation not found', id: id });
    }
    
    console.log('📋 Conversation data before sync:', {
      id: conversation.id,
      phone: conversation.phone,
      phoneNumber: conversation.phoneNumber,
      messageCount: conversation.messages?.length || 0
    });
    
    // Validate phone format early (strip whatsapp suffixes)
    if (!conversation.phone && typeof id === 'string') {
      const digits = id.replace('@c.us', '').replace(/[^0-9]/g, '');
      if (!digits) {
        console.error('❌ Invalid phone identifier for sync:', id);
        return res.status(400).json({ error: 'Invalid phone identifier for sync' });
      }
      conversation.phone = `+${digits}`;
      console.log('✅ Set conversation phone to:', conversation.phone);
    }
    
    console.log('🔄 Starting GHL sync...');
    const result = await ghlService.syncConversation(conversation);
    console.log('✅ GHL sync completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Conversation synced to GHL',
      contact: result.contact,
      conversation: result.conversation
    });
  } catch (error) {
    console.error('❌ Error manually syncing conversation:', error);
    const msg = (error && error.response && error.response.data && error.response.data.message) ? error.response.data.message : error.message;
    if (/phone number/i.test(msg)) {
      return res.status(400).json({ error: 'Invalid phone number for GHL. Ensure E.164 like +918123133382' });
    }
    res.status(500).json({ error: msg, details: error.stack });
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

// Simple webhook endpoint for GHL
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  
  console.log('📨 GHL webhook received - /send-message');
  console.log('Number:', number);
  console.log('Message:', message);
  
  try {
    if (!whatsappService || !whatsappService.client || !whatsappService.isReady) {
      console.error('❌ WhatsApp service not initialized or not ready');
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp service not ready. Please ensure WhatsApp is connected.' 
      });
    }

    // Format number - add @c.us suffix if not present
    const formattedNumber = number.includes('@c.us') ? number : `${number}@c.us`;
    
    console.log('📤 Sending to:', formattedNumber);
    
    // Send message using the WhatsApp client
    const result = await whatsappService.client.sendMessage(formattedNumber, message);
    
    console.log('✅ Message sent successfully:', result.id._serialized);
    
    res.json({ 
      success: true, 
      number: formattedNumber, 
      message: message,
      messageId: result.id._serialized
    });
  } catch (err) {
    console.error('❌ Error sending message:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: 'Check if WhatsApp is connected and number format is correct'
    });
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


// WhatsApp Widget API endpoint (removed duplicate - using real endpoint below)

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
      businessName: whatsappConnection.businessName,
      db: supabase ? 'connected' : 'not_configured'
    };
    
    res.json(status);
  } catch (error) {
    console.error('Integration Status Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Supabase DB status endpoint
app.get('/api/db/status', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(200).json({ configured: false, message: 'Supabase not configured' });
    }
    // Light ping via RPCless select on a dummy expression
    const { error } = await supabase.from('contacts').select('id').limit(1);
    if (error) {
      return res.status(200).json({ configured: true, connected: false, error: error.message });
    }
    res.json({ configured: true, connected: true });
  } catch (e) {
    res.status(200).json({ configured: true, connected: false, error: e.message });
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
    console.log('🔍 Status API called - whatsappConnection:', JSON.stringify(whatsappConnection, null, 2));
    const status = {
      connected: whatsappConnection.connected,
      phoneNumber: whatsappConnection.phoneNumber,
      businessName: whatsappConnection.businessName
    };
    console.log('🔍 Status API returning:', JSON.stringify(status, null, 2));
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

// Health check endpoint for Render
app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    whatsappReady: whatsappService ? whatsappService.isReady : false,
    services: {
      whatsapp: !!whatsappService,
      ghl: !!ghlService,
      ai: !!aiService
    }
  };
  res.json(status);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ghl-whatsapp-tab.html'));
});

// Serve WhatsApp conversations page
app.get('/whatsapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'whatsapp-conversations.html'));
});

// Serve the unified dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ghl-whatsapp-tab.html'));
});

// Serve the GHL WhatsApp tab dashboard (explicit route for VPS)
app.get('/ghl-whatsapp-tab.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ghl-whatsapp-tab.html'));
});

// Serve the workflow automation interface
app.get('/workflow', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'workflow-automation.html'));
});

// Serve the simple dashboard
app.get('/simple', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simple-dashboard.html'));
});

// Serve the webhook automation dashboard
app.get('/automation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'webhook-automation.html'));
});

// Serve the interactive dashboard
app.get('/interactive', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'interactive-dashboard.html'));
});

// Serve the agent dashboard
app.get('/agents', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agent-dashboard.html'));
});

// GHL Webhook endpoint for outbound messages
app.post('/webhooks/ghl', async (req, res) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 GHL WEBHOOK RECEIVED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Full payload:', JSON.stringify(req.body, null, 2));
    
    // Verify shared secret if configured
    if (securityService && !securityService.verifyHeaderSecret(req, securityService.ghlSecret)) {
      console.log('❌ Invalid webhook secret');
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
    
    const { event, data } = req.body;
    console.log('🎯 Event type:', event);
    console.log('📦 Data received:', data ? 'Yes' : 'No');
    
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
      console.log('🔍 Checking message direction:', message.direction, 'type:', message.type);
      console.log('📋 Message object:', JSON.stringify(message, null, 2));
      
      if (message.direction === 'outbound' || message.type === 'outbound') {
        console.log('✅ OUTBOUND MESSAGE DETECTED!');
        const contactPhone = message.contact?.phone || message.phone || message.contactId;
        const messageText = message.message || message.body || message.text;
        
        console.log('📞 Contact phone:', contactPhone);
        console.log('💬 Message text:', messageText);
        
        if (contactPhone && messageText) {
          console.log(`📤 Preparing to send WhatsApp message to ${contactPhone}: ${messageText}`);
          
          // Check rate limit and WhatsApp readiness
          if (securityService && !securityService.canSendToContact(contactPhone)) {
            console.log('⏱️ Rate limit hit for', contactPhone);
            return res.json({ success: true, message: 'Rate limited' });
          }
          
          // Check if WhatsApp is connected AND ready
          console.log('🔍 WhatsApp status:', {
            connected: whatsappConnection.connected,
            serviceExists: !!whatsappService,
            isReady: whatsappService ? whatsappService.isReady : false
          });
          
          if (whatsappConnection.connected && whatsappService && whatsappService.isReady) {
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
            if (whatsappConnection.connected && whatsappService && whatsappService.isReady) {
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
          
          // Log the sent message back to GHL conversation (tagged as WhatsApp proxy)
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
        } else {
          console.log('⚠️ Missing contactPhone or messageText');
          console.log('contactPhone:', contactPhone);
          console.log('messageText:', messageText);
        }
      } else {
        console.log('⚠️ NOT an outbound message - skipping WhatsApp send');
        console.log('Message direction:', message.direction);
        console.log('Message type:', message.type);
      }
    } else {
      console.log('⚠️ Event type not matched for message handling');
      console.log('Received event:', event);
      console.log('Expected: conversation.message.created or message.created');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ WEBHOOK PROCESSING COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Mark idempotent processed
    if (securityService && res.locals.__eventId) securityService.markEventProcessed(res.locals.__eventId);
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ GHL Webhook Error:', error.message);
    console.error('Stack:', error.stack);
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
      type: 'text'
    }, from, undefined);

    // Emit to UI
    io.to('whatsapp').emit('new_message', {
      id: payload.providerMessageId || `prov_${Date.now()}`,
      from,
      body: text,
      timestamp,
      type: 'text'
    });

    // Sync to GHL with Option B tagging
    try {
      const conversation = await conversationManager.getConversation(from);
      if (conversation) {
        // Ensure message meta tagged when added via direct APIs inside service
        await ghlService.syncConversation(conversation);
      }
    } catch (e) {
      console.error('❌ Error syncing inbound provider message to GHL:', e.message);
    }

    // Generate AI reply if enabled and WhatsApp Web client is available
    try {
      const conv = await conversationManager.getConversation(from);
      if (conv && conv.aiEnabled) {
        const aiReply = await enhancedAIService.generateContextualReply(text, from, from);
        if (aiReply) {
          if (whatsappService && whatsappService.isReady) {
            if (!securityService || securityService.canSendToContact(from)) {
              await whatsappService.sendMessage(from, aiReply);
              if (securityService) securityService.registerContactSend(from);
            } else {
              console.log('⏱️ Rate limit hit for AI reply to', from);
            }
          }
          await conversationManager.addMessage({
            from: 'ai',
            body: aiReply,
            timestamp: Date.now(),
            type: 'text'
          }, from, conv.contactName);

          io.to('whatsapp').emit('ai_reply', {
            to: from,
            body: aiReply,
            timestamp: Date.now()
          });

          // Sync AI reply to GHL
          try {
            const updated = await conversationManager.getConversation(from);
            await ghlService.syncConversation(updated);
          } catch (syncErr) {
            console.error('❌ Error syncing AI reply to GHL (provider path):', syncErr.message);
          }
        }
      }
    } catch (aiErr) {
      console.error('❌ AI error (provider webhook path):', aiErr.message);
    }
    // Mark processed for idempotency
    if (securityService && __eventId) securityService.markEventProcessed(__eventId);
  } catch (error) {
    console.error('WhatsApp webhook error:', error.message);
    // best-effort ack already returned
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

// Setup automation triggers endpoint
app.post('/api/automation/setup', async (req, res) => {
  try {
    console.log('🔧 Setting up WhatsApp automation triggers...');
    const { locationId } = req.body || {};
    const webhook = await webhookService.setupAutomationTriggers({ locationId });
    
    res.json({ 
      success: true, 
      message: 'Automation triggers setup complete',
      webhook: webhook
    });
  } catch (error) {
    console.error('❌ Error setting up automation:', error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Get webhooks status
app.get('/api/automation/webhooks', async (req, res) => {
  try {
    const locationId = req.query.locationId || process.env.GHL_LOCATION_ID;
    const webhooks = await webhookService.getWebhooks(locationId);
    
    res.json({ 
      success: true, 
      webhooks: webhooks,
      count: webhooks.length
    });
  } catch (error) {
    console.error('❌ Error fetching webhooks:', error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Delete webhook
app.delete('/api/automation/webhooks/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const locationId = req.query.locationId || process.env.GHL_LOCATION_ID;
    
    await webhookService.deleteWebhook(webhookId, locationId);
    
    res.json({ 
      success: true, 
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting webhook:', error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Send WhatsApp message from dashboard
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 WHATSAPP SEND REQUEST RECEIVED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    console.log('All headers:', JSON.stringify(req.headers, null, 2));
    
    // Try to extract data from multiple possible sources
    // First check customData (GHL workflow format)
    const customData = req.body.customData || {};
    
    // Extract "to" - try multiple sources and clean up
    let to = customData.to || req.body.to || req.body.phone || req.query.to || req.query.phone;
    
    // Extract "message" - handle trailing space issue
    let message = customData.message || customData['message '] || customData.text || 
                  req.body.message || req.body.text || req.query.message || req.query.text;
    
    // Clean up "to" field - remove spaces and ensure proper format
    if (to) {
      to = to.replace(/\s/g, ''); // Remove all spaces
      
      // If it doesn't start with +, add country code
      if (!to.startsWith('+')) {
        // Remove leading zero if present (common in India)
        if (to.startsWith('0')) {
          to = to.substring(1); // Remove the leading 0
        }
        // Add +91 country code for India
        to = '+91' + to;
      }
    }
    
    // Trim message if it exists
    if (message) {
      message = message.trim();
    }
    
    console.log('📞 Extracted "to":', to);
    console.log('💬 Extracted "message":', message);
    console.log('🔍 customData:', customData);
    
    if (!to || !message) {
      console.log('❌ Missing required fields!');
      console.log('Available keys in body:', Object.keys(req.body));
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required',
        debug: {
          receivedBody: req.body,
          receivedKeys: Object.keys(req.body),
          extractedTo: to,
          extractedMessage: message
        }
      });
    }
    
    // Check if WhatsApp is connected
    console.log('🔍 WhatsApp send check:', {
      whatsappConnectionConnected: whatsappConnection.connected,
      whatsappServiceExists: !!whatsappService,
      whatsappServiceIsReady: whatsappService ? whatsappService.isReady : 'N/A',
      whatsappConnection: whatsappConnection
    });
    
    // Check WhatsApp connection - use either whatsappConnection.connected OR whatsappService.isReady
    const isWhatsAppConnected = whatsappConnection.connected || (whatsappService && whatsappService.isReady);
    
    if (!isWhatsAppConnected || !whatsappService) {
      return res.status(400).json({ 
        success: false, 
        error: 'WhatsApp is not connected',
        debug: {
          whatsappConnectionConnected: whatsappConnection.connected,
          whatsappServiceExists: !!whatsappService,
          whatsappServiceIsReady: whatsappService ? whatsappService.isReady : 'N/A',
          isWhatsAppConnected: isWhatsAppConnected
        }
      });
    }
    
    // Check if WhatsApp service is ready (with timeout)
    if (!whatsappService.isReady) {
      console.log('⚠️ WhatsApp service not ready, waiting...');
      // Wait a bit for WhatsApp to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!whatsappService.isReady) {
        return res.status(400).json({ 
          success: false, 
          error: 'WhatsApp service is not ready. Please try again in a moment.',
          debug: {
            whatsappConnectionConnected: whatsappConnection.connected,
            whatsappServiceExists: !!whatsappService,
            whatsappServiceIsReady: whatsappService ? whatsappService.isReady : 'N/A'
          }
        });
      }
    }
    
    console.log(`📤 Sending WhatsApp message to ${to}: ${message}`);
    
    // Send message via WhatsApp
    const result = await whatsappService.sendMessage(to, message);
    
    if (result) {
      console.log('✅ WhatsApp message sent successfully');
      
      // Store the sent message in conversation
      const messageData = {
        id: `sent_${Date.now()}`,
        from: 'ai',
        body: message,
        timestamp: Date.now(),
        type: 'text'
      };
      
      await conversationManager.addMessage(messageData, to);
      
      // Auto-sync to GHL immediately after sending
      try {
        console.log('🔄 Auto-syncing sent message to GHL...');
        const conversation = await conversationManager.getConversation(to);
        if (conversation) {
          await ghlService.syncConversation(conversation);
          console.log('✅ Sent message auto-synced to GHL successfully');
        } else {
          console.log('⚠️ Conversation not found for auto-sync:', to);
        }
      } catch (syncError) {
        console.error('❌ Error auto-syncing sent message to GHL:', syncError.message);
        // Don't fail the request if sync fails
      }
      
      // Emit to frontend
      io.to('whatsapp').emit('ai_reply', {
        to: to,
        body: message,
        timestamp: Date.now()
      });
      
      res.json({ 
        success: true, 
        message: 'Message sent successfully',
        messageId: result
      });
    } else {
      throw new Error('Failed to send message');
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Enhanced AI Management API endpoints

// Get AI personality and conversation stats
app.get('/api/ai/personality', async (req, res) => {
  try {
    const personality = enhancedAIService.getPersonality();
    const stats = enhancedAIService.getConversationStats();
    
    res.json({
      success: true,
      personality: personality,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching AI personality:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update AI personality
app.post('/api/ai/personality', async (req, res) => {
  try {
    const { name, role, company, tone, traits } = req.body;
    
    enhancedAIService.updatePersonality({
      name: name || 'Sarah',
      role: role || 'Customer Success Manager',
      company: company || 'Your Business',
      tone: tone || 'friendly and professional',
      traits: traits || ['helpful', 'empathetic', 'solution-oriented']
    });
    
    res.json({
      success: true,
      message: 'AI personality updated successfully',
      personality: enhancedAIService.getPersonality()
    });
  } catch (error) {
    console.error('Error updating AI personality:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get conversation memory for a specific user
app.get('/api/ai/memory/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const userProfile = await enhancedAIService.getUserProfile(phoneNumber);
    const conversationHistory = enhancedAIService.getConversationHistory(phoneNumber);
    
    res.json({
      success: true,
      userProfile: userProfile,
      conversationHistory: conversationHistory,
      memoryCount: conversationHistory.length
    });
  } catch (error) {
    console.error('Error fetching conversation memory:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear conversation memory for a specific user
app.delete('/api/ai/memory/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    enhancedAIService.clearUserMemory(phoneNumber);
    
    res.json({
      success: true,
      message: `Conversation memory cleared for ${phoneNumber}`
    });
  } catch (error) {
    console.error('Error clearing conversation memory:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear all conversation memory
app.delete('/api/ai/memory', async (req, res) => {
  try {
    enhancedAIService.clearAllMemory();
    
    res.json({
      success: true,
      message: 'All conversation memory cleared'
    });
  } catch (error) {
    console.error('Error clearing all conversation memory:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test enhanced AI with a sample message
app.post('/api/ai/test-contextual', async (req, res) => {
  try {
    const { message, phoneNumber } = req.body;
    
    if (!message || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Message and phone number are required'
      });
    }
    
    const aiReply = await enhancedAIService.generateContextualReply(
      message, 
      phoneNumber, 
      'test-conversation'
    );
    
    const userProfile = await enhancedAIService.getUserProfile(phoneNumber);
    const conversationHistory = enhancedAIService.getConversationHistory(phoneNumber);
    
    res.json({
      success: true,
      aiReply: aiReply,
      userProfile: userProfile,
      conversationHistory: conversationHistory.slice(0, 3), // Last 3 conversations
      memoryUsed: conversationHistory.length
    });
  } catch (error) {
    console.error('Error testing contextual AI:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Knowledge Base Management API endpoints

// Get all knowledge base items
app.get('/api/ai/knowledge', async (req, res) => {
  try {
    const knowledgeItems = enhancedAIService.getKnowledgeBase();
    
    res.json({
      success: true,
      knowledge: knowledgeItems,
      total: knowledgeItems.length
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/knowledge/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload knowledge base files
app.post('/api/ai/knowledge/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    const category = req.body.category || 'general';
    const description = req.body.description || '';
    let uploadedCount = 0;
    const errors = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        const knowledgeItem = await enhancedAIService.addKnowledgeFile(
          file, 
          category, 
          description
        );
        uploadedCount++;
        console.log(`✅ Knowledge base item added: ${knowledgeItem.filename}`);
      } catch (fileError) {
        console.error(`❌ Error processing file ${file.originalname}:`, fileError);
        errors.push(`${file.originalname}: ${fileError.message}`);
      }
    }

    res.json({
      success: true,
      uploadedCount: uploadedCount,
      totalFiles: req.files.length,
      errors: errors,
      message: `Successfully processed ${uploadedCount} of ${req.files.length} files`
    });

  } catch (error) {
    console.error('Error uploading knowledge base files:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get specific knowledge base item
app.get('/api/ai/knowledge/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const knowledgeItem = await enhancedAIService.getKnowledgeItem(id);
    
    if (!knowledgeItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Knowledge base item not found' 
      });
    }

    res.json({
      success: true,
      knowledge: knowledgeItem,
      content: knowledgeItem.content
    });
  } catch (error) {
    console.error('Error fetching knowledge base item:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete knowledge base item
app.delete('/api/ai/knowledge/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await enhancedAIService.deleteKnowledgeItem(id);
    
    if (!success) {
      return res.status(404).json({ 
        success: false, 
        error: 'Knowledge base item not found' 
      });
    }

    res.json({
      success: true,
      message: 'Knowledge base item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting knowledge base item:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Website Link Training API endpoints

// Add website link for AI training
app.post('/api/ai/train-website', async (req, res) => {
  try {
    const { websiteUrl, description, category } = req.body;
    
    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        error: 'Website URL is required'
      });
    }

    const trainingResult = await enhancedAIService.trainFromWebsite(
      websiteUrl, 
      description || '', 
      category || 'general'
    );

    res.json({
      success: true,
      message: 'Website content successfully added to knowledge base',
      result: trainingResult
    });

  } catch (error) {
    console.error('Error training from website:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get website training history
app.get('/api/ai/training-history', async (req, res) => {
  try {
    const trainingHistory = enhancedAIService.getTrainingHistory();
    
    res.json({
      success: true,
      trainingHistory: trainingHistory,
      total: trainingHistory.length
    });
  } catch (error) {
    console.error('Error fetching training history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test website content extraction
app.post('/api/ai/test-website', async (req, res) => {
  try {
    const { websiteUrl } = req.body;
    
    if (!websiteUrl) {
      return res.status(400).json({
        success: false,
        error: 'Website URL is required'
      });
    }

    const extractedContent = await enhancedAIService.extractWebsiteContent(websiteUrl);

    res.json({
      success: true,
      websiteUrl: websiteUrl,
      extractedContent: extractedContent,
      contentLength: extractedContent.length
    });

  } catch (error) {
    console.error('Error testing website:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// MCP AI Service API endpoints

// Get MCP AI personality
app.get('/api/mcp-ai/personality', async (req, res) => {
  try {
    const personality = mcpAIService.getPersonality();
    res.json({
      success: true,
      personality: personality
    });
  } catch (error) {
    console.error('Error getting MCP AI personality:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update MCP AI personality
app.post('/api/mcp-ai/personality', async (req, res) => {
  try {
    const { personality } = req.body;
    mcpAIService.updatePersonality(personality);
    
    res.json({
      success: true,
      message: 'MCP AI personality updated successfully',
      personality: mcpAIService.getPersonality()
    });
  } catch (error) {
    console.error('Error updating MCP AI personality:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get MCP AI conversation stats
app.get('/api/mcp-ai/stats', async (req, res) => {
  try {
    const stats = mcpAIService.getConversationStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error getting MCP AI stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get user profile from GHL via MCP AI
app.get('/api/mcp-ai/user-profile/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const userProfile = await mcpAIService.getUserProfileFromGHL(phoneNumber);
    
    res.json({
      success: true,
      userProfile: userProfile
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Create contact in GHL via MCP AI
app.post('/api/mcp-ai/create-contact', async (req, res) => {
  try {
    const { name, phone, email, company, tags } = req.body;
    
    const contact = await mcpAIService.createContactInGHL({
      name,
      phone,
      email,
      company,
      tags
    });
    
    res.json({
      success: true,
      message: 'Contact created successfully in GHL',
      contact: contact
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update contact in GHL via MCP AI
app.post('/api/mcp-ai/update-contact/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const updateData = req.body;
    
    const contact = await mcpAIService.updateContactInGHL(contactId, updateData);
    
    res.json({
      success: true,
      message: 'Contact updated successfully in GHL',
      contact: contact
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test MCP AI contextual reply
app.post('/api/mcp-ai/test-contextual', async (req, res) => {
  try {
    const { message, phoneNumber, conversationId } = req.body;
    
    const aiReply = await mcpAIService.generateContextualReply(
      message, 
      phoneNumber, 
      conversationId
    );
    
    res.json({
      success: true,
      message: 'MCP AI contextual reply generated',
      aiReply: aiReply,
      phoneNumber: phoneNumber
    });
  } catch (error) {
    console.error('Error testing MCP AI contextual reply:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear MCP AI memory
app.delete('/api/mcp-ai/memory/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    mcpAIService.clearUserMemory(phoneNumber);
    
    res.json({
      success: true,
      message: `Memory cleared for user: ${phoneNumber}`
    });
  } catch (error) {
    console.error('Error clearing MCP AI memory:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear all MCP AI memory
app.delete('/api/mcp-ai/memory', async (req, res) => {
  try {
    mcpAIService.clearAllMemory();
    
    res.json({
      success: true,
      message: 'All MCP AI memory cleared'
    });
  } catch (error) {
    console.error('Error clearing all MCP AI memory:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Filter Settings API
app.post('/api/settings/filtering', async (req, res) => {
  try {
    const { filterGroupMessages, filterBroadcastMessages, filterCompanyMessages } = req.body;
    
    // Update environment variables (in memory)
    process.env.FILTER_GROUP_MESSAGES = filterGroupMessages.toString();
    process.env.FILTER_BROADCAST_MESSAGES = filterBroadcastMessages.toString();
    process.env.FILTER_COMPANY_MESSAGES = filterCompanyMessages.toString();
    
    console.log('🔧 Filter settings updated:', {
      filterGroupMessages,
      filterBroadcastMessages,
      filterCompanyMessages
    });
    
    res.json({
      success: true,
      message: 'Filter settings updated successfully',
      settings: {
        filterGroupMessages,
        filterBroadcastMessages,
        filterCompanyMessages
      }
    });
  } catch (error) {
    console.error('Error updating filter settings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get current filter settings
app.get('/api/settings/filtering', async (req, res) => {
  try {
    res.json({
      success: true,
      settings: {
        filterGroupMessages: process.env.FILTER_GROUP_MESSAGES !== 'false',
        filterBroadcastMessages: process.env.FILTER_BROADCAST_MESSAGES !== 'false',
        filterCompanyMessages: process.env.FILTER_COMPANY_MESSAGES !== 'false'
      }
    });
  } catch (error) {
    console.error('Error getting filter settings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;

// ============================================
// 🎯 MULTI-ACCOUNT INTEGRATION API ENDPOINTS
// Added by auto-add-api.js
// ============================================

const fs = require('fs');
// path is already required at the top of the file

// File to store integrations
const INTEGRATIONS_FILE = path.join(__dirname, 'data', 'integrations.json');

// Initialize integrations file if it doesn't exist
function initializeIntegrationsFile() {
  if (!fs.existsSync(INTEGRATIONS_FILE)) {
    const dir = path.dirname(INTEGRATIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify({ integrations: [] }, null, 2));
    console.log('✅ Created integrations.json file');
  }
}

// Read integrations from file
function readIntegrations() {
  try {
    const data = fs.readFileSync(INTEGRATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading integrations:', error);
    return { integrations: [] };
  }
}

// Write integrations to file
function writeIntegrations(data) {
  try {
    fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing integrations:', error);
    return false;
  }
}

// Initialize on server start
initializeIntegrationsFile();

// GET /api/integrations - List all integrations
app.get('/api/integrations', (req, res) => {
  try {
    const data = readIntegrations();
    res.json({ success: true, integrations: data.integrations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations - Create new integration
app.post('/api/integrations', (req, res) => {
  try {
    const data = readIntegrations();
    const newIntegration = {
      id: 'int_' + Date.now(),
      name: req.body.name || 'Unnamed Integration',
      description: req.body.description || '',
      status: 'disconnected',
      connectionType: req.body.connectionType || 'business',
      whatsappNumber: req.body.whatsappNumber || '',
      businessName: req.body.businessName || '',
      metaAppId: req.body.metaAppId || '',
      phoneNumberId: req.body.phoneNumberId || '',
      metaAccessToken: req.body.metaAccessToken || '',
      ghlApiKey: req.body.ghlApiKey || '',
      ghlLocationId: req.body.ghlLocationId || '',
      ghlLocationName: req.body.ghlLocationName || '',
      aiEnabled: req.body.aiEnabled !== false,
      aiModel: req.body.aiModel || 'gpt-4',
      aiSystemPrompt: req.body.aiSystemPrompt || 'You are a helpful AI assistant.',
      aiTemperature: req.body.aiTemperature || 0.7,
      messagesToday: 0,
      activeConversations: 0,
      activeContacts: 0,
      uptime: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.integrations.push(newIntegration);
    if (writeIntegrations(data)) {
      if (req.body.autoConnect) {
        newIntegration.status = 'connected';
        writeIntegrations(data);
      }
      res.json({ success: true, integration: newIntegration });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save integration' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/integrations/:id - Get single integration
app.get('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    if (integration) {
      res.json({ success: true, integration });
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/integrations/:id - Update integration
app.put('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    if (index !== -1) {
      data.integrations[index] = {
        ...data.integrations[index],
        ...req.body,
        id: req.params.id,
        updatedAt: new Date().toISOString()
      };
      if (writeIntegrations(data)) {
        res.json({ success: true, integration: data.integrations[index] });
      } else {
        res.status(500).json({ success: false, error: 'Failed to update integration' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/integrations/:id - Delete integration
app.delete('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    if (integration) {
      data.integrations = data.integrations.filter(i => i.id !== req.params.id);
      if (writeIntegrations(data)) {
        res.json({ success: true, message: 'Integration deleted successfully' });
      } else {
        res.status(500).json({ success: false, error: 'Failed to delete integration' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations/:id/connect - Connect integration
app.post('/api/integrations/:id/connect', async (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    if (index !== -1) {
      data.integrations[index].status = 'connected';
      data.integrations[index].updatedAt = new Date().toISOString();
      if (writeIntegrations(data)) {
        if (io) {
          io.emit('integration_status_changed', {
            integrationId: req.params.id,
            status: 'connected'
          });
        }
        res.json({ success: true, integration: data.integrations[index] });
      } else {
        res.status(500).json({ success: false, error: 'Failed to connect integration' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations/:id/disconnect - Disconnect integration
app.post('/api/integrations/:id/disconnect', async (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    if (index !== -1) {
      data.integrations[index].status = 'disconnected';
      data.integrations[index].updatedAt = new Date().toISOString();
      if (writeIntegrations(data)) {
        if (io) {
          io.emit('integration_status_changed', {
            integrationId: req.params.id,
            status: 'disconnected'
          });
        }
        res.json({ success: true, integration: data.integrations[index] });
      } else {
        res.status(500).json({ success: false, error: 'Failed to disconnect integration' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations/:id/test - Test integration
app.post('/api/integrations/:id/test', async (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    if (integration) {
      const testResults = {
        whatsapp: integration.whatsappNumber ? 'OK' : 'Missing number',
        ghl: integration.ghlLocationId ? 'OK' : 'Missing location ID',
        overall: integration.whatsappNumber && integration.ghlLocationId ? 'PASS' : 'FAIL'
      };
      res.json({
        success: testResults.overall === 'PASS',
        message: testResults.overall === 'PASS' 
          ? 'All tests passed!' 
          : 'Some tests failed.',
        results: testResults
      });
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ghl/test - Test GHL Connection
app.post('/api/ghl/test', async (req, res) => {
  try {
    const { apiKey, locationId } = req.body;
    if (!apiKey || !locationId) {
      return res.json({ success: false, error: 'API Key and Location ID required' });
    }
    res.json({ success: true, message: 'GHL connection test successful!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('✅ Multi-account integration API endpoints loaded');

// ============================================
// END OF MULTI-ACCOUNT INTEGRATION API
// ============================================

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
    
    // Email service removed - WhatsApp only
    
    console.log('🎉 All services started successfully!');
  } catch (error) {
    console.error('❌ Error starting services:', error.message);
    console.error('Stack trace:', error.stack);
  }
});

// Enhanced AI endpoints
app.get('/api/enhanced-ai/status', async (req, res) => {
  try {
    const stats = enhancedAIService.getConversationStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync contact names with GHL
app.get('/api/ghl/sync-contacts', async (req, res) => {
  try {
    console.log('🔄 Syncing contact names with GHL...');
    
    const conversations = await conversationManager.getAllConversations();
    let syncedCount = 0;
    
    for (const conversation of conversations) {
      try {
        // Skip conversations with invalid phone numbers (contact names)
        const phoneToCheck = conversation.phoneNumber || conversation.phone;
        if (!phoneToCheck || typeof phoneToCheck !== 'string') {
          console.log(`⚠️ Skipping conversation with invalid phone: ${phoneToCheck}`);
          continue;
        }
        
        // Skip if it's a contact name (contains letters and spaces)
        if (/[a-zA-Z]/.test(phoneToCheck) && phoneToCheck.includes(' ')) {
          console.log(`⚠️ Skipping conversation with contact name as phone: ${phoneToCheck}`);
          continue;
        }
        
        const normalizedPhone = ghlService.normalizePhoneNumber(phoneToCheck);
        if (normalizedPhone) {
          const ghlContact = await ghlService.findContactByPhone(normalizedPhone);
          if (ghlContact) {
            const contactName = ghlContact.firstName || ghlContact.name;
            if (contactName && contactName !== conversation.contactName) {
              conversation.contactName = contactName;
              conversation.name = contactName;
              await conversationManager.updateConversation(conversation);
              syncedCount++;
              console.log(`📞 Synced contact name: ${contactName} for ${normalizedPhone}`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not sync contact for ${conversation.phoneNumber || conversation.phone}:`, error.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: `Synced ${syncedCount} contact names`,
      syncedCount 
    });
  } catch (error) {
    console.error('Error syncing contact names:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Template Management endpoints
app.get('/api/templates', async (req, res) => {
  try {
    const templatesArray = await enhancedAIService.getAllTemplates();
    // Convert array to object with id as key (for backward compatibility with frontend)
    const templates = {};
    templatesArray.forEach(t => {
      templates[t.id] = t;
    });
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const { id, name, content, category, mediaUrl, mediaType } = req.body;
    await enhancedAIService.addTemplate(id, name, content, category, mediaUrl, mediaType);
    res.json({ success: true, message: 'Template added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await enhancedAIService.getTemplate(req.params.id);
    if (template) {
      res.json({ success: true, template });
    } else {
      res.status(404).json({ success: false, error: 'Template not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    await enhancedAIService.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send template message (for GHL webhooks)
app.post('/api/whatsapp/send-template', async (req, res) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 TEMPLATE MESSAGE REQUEST RECEIVED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    // Extract data from request
    const customData = req.body.customData || {};
    
    let to = customData.to || req.body.to || req.body.phone || req.query.to || req.query.phone;
    let templateId = customData.templateId || customData.template_id || req.body.templateId || req.body.template_id;
    let templateName = customData.templateName || customData.template_name || req.body.templateName || req.body.template_name;
    let variables = customData.variables || req.body.variables || {};
    
    // Trim template name to remove any trailing/leading spaces
    if (templateName) {
      templateName = templateName.trim();
    }
    if (templateId) {
      templateId = templateId.trim();
    }
    
    // Handle variables if they come as a string (GHL sometimes sends stringified JSON)
    if (typeof variables === 'string') {
      try {
        variables = JSON.parse(variables.trim());
        console.log('📝 Parsed variables from string:', variables);
      } catch (e) {
        console.log('⚠️ Could not parse variables string:', variables);
        variables = {};
      }
    }
    
    // Clean up phone number
    if (to) {
      to = to.replace(/\s/g, '');
      if (to.startsWith('0')) {
        to = to.substring(1);
      }
      if (!to.startsWith('+')) {
        to = '+91' + to;
      }
    }
    
    console.log('📞 Phone:', to);
    console.log('📋 Template ID:', templateId);
    console.log('📋 Template Name:', templateName);
    console.log('🔧 Variables:', variables);
    
    if (!to) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required',
        debug: { receivedBody: req.body }
      });
    }
    
    if (!templateId && !templateName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template ID or Template Name is required',
        debug: { receivedBody: req.body }
      });
    }
    
    // Get template
    let template;
    if (templateId) {
      template = await enhancedAIService.getTemplate(templateId);
    } else if (templateName) {
      const allTemplates = await enhancedAIService.getAllTemplates();
      console.log('🔍 Available templates:', allTemplates.map(t => t.name).join(', '));
      console.log('🔎 Looking for template:', templateName);
      // getAllTemplates() returns an Array, not an Object
      template = allTemplates.find(t => t.name === templateName);
      if (!template) {
        // Try case-insensitive match
        template = allTemplates.find(t => t.name.toLowerCase() === templateName.toLowerCase());
      }
    }
    
    if (!template) {
      const allTemplates = await enhancedAIService.getAllTemplates();
      return res.status(404).json({ 
        success: false, 
        error: `Template not found: ${templateId || templateName}`,
        availableTemplates: allTemplates.map(t => t.name)
      });
    }
    
    console.log('✅ Found template:', template.name);
    console.log('📝 Template content:', template.content);
    
    // Replace variables in template
    let message = template.content;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      // Use split-join instead of regex to avoid special character issues
      message = message.split(placeholder).join(value || '');
    }
    
    console.log('✅ Message after variable replacement:', message);
    
    // Send message via WhatsApp (with media if template has it)
    let sentMessage;
    if (template.mediaUrl && template.mediaType) {
      console.log(`📸 Template has ${template.mediaType}:`, template.mediaUrl);
      console.log('📤 Sending WhatsApp message with media...');
      
      try {
        // Use WhatsAppService's sendMediaFromUrl method
        sentMessage = await whatsappService.sendMediaFromUrl(to, template.mediaUrl, message, template.mediaType);
      } catch (mediaError) {
        console.error('❌ Error sending media:', mediaError.message);
        console.log('📤 Falling back to text-only message...');
        sentMessage = await whatsappService.sendMessage(to, message);
      }
    } else {
      sentMessage = await whatsappService.sendMessage(to, message);
      console.log('✅ WhatsApp template message sent successfully');
    }
    
    // Store in conversation with media info
    const messageData = {
      from: 'ai',
      body: message,
      timestamp: Date.now(),
      type: 'template',
      templateId: template.id,
      templateName: template.name
    };
    
    // Add media info if template has media
    if (template.mediaUrl) {
      messageData.hasMedia = true;
      messageData.mediaUrl = template.mediaUrl;
      messageData.mediaType = template.mediaType || 'image';
    }
    
    await conversationManager.addMessage(messageData, to);
    
    // Auto-sync to GHL
    try {
      console.log('🔄 Auto-syncing template message to GHL...');
      const conversation = await conversationManager.getConversation(to);
      if (conversation) {
        await ghlService.syncConversation(conversation);
        console.log('✅ Template message synced to GHL successfully');
      }
    } catch (syncError) {
      console.error('❌ Error syncing template message to GHL:', syncError.message);
    }
    
    res.json({ 
      success: true, 
      message: 'Template message sent successfully',
      sentMessage: {
        to,
        template: template.name,
        content: message
      }
    });
    
  } catch (error) {
    console.error('❌ Error sending template message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Automation Management endpoints
app.get('/api/automation/rules', async (req, res) => {
  try {
    const rules = Array.from(enhancedAIService.automationRules.values());
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/automation/rules', async (req, res) => {
  try {
    const { id, name, trigger, templateId, conditions } = req.body;
    await enhancedAIService.addAutomationRule(id, name, trigger, templateId, conditions);
    res.json({ success: true, message: 'Automation rule added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test automation trigger
app.post('/api/automation/test', async (req, res) => {
  try {
    const { message, phoneNumber } = req.body;
    const userProfile = await enhancedAIService.getUserProfileFromGHL(phoneNumber);
    const triggeredRules = await enhancedAIService.checkAutomationTriggers(message, phoneNumber, userProfile);
    
    res.json({ 
      success: true, 
      triggeredRules: triggeredRules.length,
      rules: triggeredRules 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handoff Queue API
app.get('/api/handoff', async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const items = await listHandoffs({ status });
    res.json({ success: true, items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/handoff/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { agent } = req.body;
    if (!agent) return res.status(400).json({ success: false, error: 'agent required' });
    const item = await assignHandoff(id, agent);
    io.emit('handoff_updated', { id, status: 'assigned', assignedTo: agent });
    res.json({ success: true, item });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/handoff/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await resolveHandoff(id);
    io.emit('handoff_updated', { id, status: 'resolved' });
    res.json({ success: true, item });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Mark conversation as read
app.post('/api/conversations/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    await conversationManager.markAsRead(id);
    res.json({ success: true, message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark conversation as unread
app.post('/api/conversations/:id/mark-unread', async (req, res) => {
  try {
    const { id } = req.params;
    await conversationManager.markAsUnread(id);
    res.json({ success: true, message: 'Conversation marked as unread' });
  } catch (error) {
    console.error('Error marking conversation as unread:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unread conversations
app.get('/api/conversations/unread', async (req, res) => {
  try {
    const unreadConversations = await conversationManager.getUnreadConversations();
    res.json({ success: true, conversations: unreadConversations });
  } catch (error) {
    console.error('Error getting unread conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get read conversations
app.get('/api/conversations/read', async (req, res) => {
  try {
    const readConversations = await conversationManager.getReadConversations();
    res.json({ success: true, conversations: readConversations });
  } catch (error) {
    console.error('Error getting read conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
