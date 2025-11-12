const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
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
const phoneNormalizer = require('./utils/phoneNormalizer');
const TenantService = require('./services/tenantService');

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
let tenantService;
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
  // Initialize TenantService
  try {
    tenantService = new TenantService(supabase);
    console.log('✅ TenantService initialized');
  } catch (e) {
    console.warn('⚠️ TenantService initialization failed:', e.message);
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

  // Enforce GHL configuration when required
  const requireGHL = String(process.env.REQUIRE_GHL || '').toLowerCase() === 'true';
  if (requireGHL) {
    if (!ghlService || typeof ghlService.isConfigured !== 'function' || !ghlService.isConfigured()) {
      console.error('❌ GHL is required but not configured. Set GHL_API_KEY and GHL_LOCATION_ID, then restart.');
      process.exit(1);
    } else {
      console.log('✅ GHL is configured and required: continuing with full sync.');
    }
  }
  
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
console.log('=== SERVER BOOT: registering routes ===');
app.use('/api/whatsapp', require('./routes/whatsappRoutes')(whatsappService, ghlService, enhancedAIService, conversationManager));
// System metrics endpoint (simple health and code metrics)
app.use('/api/system', require('./routes/metricsRoutes')());
// Debug middleware to trace KB route handling order
app.use('/api/ghl/kb', (req, res, next) => {
  console.log(`[server.js] KB route hit: ${req.method} ${req.originalUrl}`);
  next();
});
// Server-level aliases for GHL KB endpoints to ensure availability even if router gating fails
app.get('/api/ghl/kb/list', async (req, res) => {
  try {
    const items = enhancedAIService.getKnowledgeBase();
    const stats = enhancedAIService.getKnowledgeBaseStats();
    res.json({ success: true, count: Array.isArray(items) ? items.length : 0, items, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post('/api/ghl/kb/search', async (req, res) => {
  try {
    const { query, limit = 5, minSimilarity = 0.35, tenantId } = req.body || {};
    const resolvedTenant = tenantId || req.headers['x-tenant-id'] || null;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }
    const results = await enhancedAIService.embeddings.retrieve({
      query,
      topK: Number(limit) || 5,
      minSimilarity: Number(minSimilarity) || 0.35,
      tenantId: resolvedTenant,
    });
    res.json({ success: true, count: Array.isArray(results) ? results.length : 0, items: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Server-level KB website upload alias to minimize confusion; falls back to local ingestion
app.post('/api/ghl/kb/website', async (req, res) => {
  try {
    const { url, websiteUrl, category = 'website', description = '', tenantId } = req.body || {};
    const targetUrl = (url || websiteUrl || '').trim();
    let resolvedTenant = tenantId || null;
    try { resolvedTenant = resolvedTenant || (tenantService ? await tenantService.resolveTenantId({ req }) : null); } catch (_) {}

    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'URL required' });
    }

    const result = await enhancedAIService.trainFromWebsite(
      targetUrl,
      description,
      category || 'general',
      resolvedTenant
    );

    if (result && result.success) {
      return res.json({
        success: true,
        result: {
          pagesProcessed: result.pagesProcessed || 0,
          chunks: Array.isArray(result.chunks) ? result.chunks.length : (result.chunkCount || 0)
        }
      });
    }
    return res.status(500).json({ success: false, error: (result && result.error) || 'Website training failed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Server-level KB PDF upload alias: accepts { url, category, description, tenantId }
app.post('/api/ghl/kb/pdf', async (req, res) => {
  try {
    const { url, category = 'documents', description = '', tenantId } = req.body || {};
    const targetUrl = String(url || '').trim();
    let resolvedTenant = tenantId || null;
    try { resolvedTenant = resolvedTenant || (tenantService ? await tenantService.resolveTenantId({ req }) : null); } catch (_) {}

    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'PDF URL required' });
    }

    // Download the PDF to a temporary file
    const tempDir = path.join(__dirname, 'uploads', 'kb');
    await fs.promises.mkdir(tempDir, { recursive: true });
    const baseName = path.basename(new URL(targetUrl).pathname) || 'document.pdf';
    const tempPath = path.join(tempDir, `${Date.now()}-${baseName}`);

    const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });
    await fs.promises.writeFile(tempPath, response.data);

    // Process and index PDF via pdfProcessingService if available
    if (!pdfProcessingService || typeof pdfProcessingService.addPDFToKnowledgeBase !== 'function') {
      try { await fs.promises.unlink(tempPath); } catch (_) {}
      return res.status(501).json({ success: false, error: 'PDF processing service unavailable' });
    }

    const meta = { source: targetUrl, category, description, tenantId: resolvedTenant };
    const result = await pdfProcessingService.addPDFToKnowledgeBase(tempPath, category, description);

    // Clean up temp file
    try { await fs.promises.unlink(tempPath); } catch (_) {}

    return res.json({ success: true, mode: 'local_fallback', result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.use('/api/ghl', require('./routes/ghlRoutes')(ghlService));
// Debug: ensure /api/ghl path is reachable beyond router
app.get('/api/ghl/server-test', (req, res) => {
  res.json({ success: true, message: 'server test ok' });
});
app.use('/api/ai', require('./routes/aiRoutes')(aiService, mcpAIService, enhancedAIService, tenantService));
app.use('/api/analytics', require('./routes/analyticsRoutes')(analyticsService, securityService));
  app.use('/api/knowledge', require('./routes/knowledgeRoutes')(enhancedAIService, pdfProcessingService, websiteScraperService));
// Simple ping for debugging
app.get('/api/ping', (req, res) => {
  res.json({ success: true, message: 'pong' });
});
// Root health endpoint for unified checks
app.get('/api/health', (req, res) => {
  try {
    const status = {
      success: true,
      services: {
        whatsapp: { connected: true },
        ai: { ready: true },
        knowledge: { items: (enhancedAIService.getKnowledgeBase()?.length) || 0 }
      },
      timestamp: Date.now()
    };
    res.json(status);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
  // Root alias for RAG knowledge search to mirror rag-dashboard route
  app.post('/api/knowledge/search', async (req, res) => {
    try {
      const { query, limit = 5, minSimilarity = 0.35, tenantId } = req.body || {};
      const resolvedTenant = tenantId || req.headers['x-tenant-id'] || null;
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Query required' });
      }
      const results = await enhancedAIService.embeddings.retrieve({
        query,
        topK: Number(limit) || 5,
        minSimilarity: Number(minSimilarity) || 0.35,
        tenantId: resolvedTenant,
      });
      res.json({ success: true, count: results.length, items: results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || 'Search failed' });
    }
  });
app.use('/api/handoff-rules', require('./routes/handoffRulesRoutes')(enhancedAIService));
app.use('/api/integrations', require('./routes/integrationsRoutes')());
// Alias: allow front-end to call /rag-dashboard/api/knowledge/* and reuse /api/knowledge/*
app.use('/rag-dashboard/api/knowledge', (req, res) => {
  const target = '/api/knowledge' + (req.url || '');
  // Preserve method and body with 307 redirect
  res.redirect(307, target);
});

// === Compatibility aliases for external AI Management dashboard ===
// Many dashboards expect these root-level paths; map them to existing routes.
// Tenants list
app.get('/api/tenants', (req, res) => {
  const target = '/rag-dashboard/api/tenants' + (req.url || '');
  res.redirect(307, target);
});

// AI personality
app.get('/api/personality', (req, res) => {
  const target = '/api/ai/personality';
  res.redirect(307, target);
});

// Knowledge base list
app.get('/api/knowledge', (req, res) => {
  const target = '/api/knowledge/list';
  res.redirect(307, target);
});

// Knowledge search (GET) – reuse RAG dashboard implementation
app.get('/api/knowledge/search', (req, res) => {
  const target = '/rag-dashboard/api/knowledge/search' + (req.url || '');
  res.redirect(307, target);
});

// System status (return JSON directly)
app.get('/api/system/status', (req, res) => {
  try {
    const status = {
      success: true,
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      port: process.env.PORT || 3000,
    };
    res.json(status);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message || 'Status error' });
  }
});

// Training history/logs
app.get('/api/training/history', (req, res) => {
  const target = '/rag-dashboard/api/system/logs' + (req.url || '');
  res.redirect(307, target);
});

app.use('/rag-dashboard', require('./routes/ragDashboard')(enhancedAIService)); // RAG Dashboard routes (use existing EnhancedAIService)

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

// Send a WhatsApp template with variables (for GHL webhook or direct use)
app.post('/api/whatsapp/send-template', async (req, res) => {
  try {
    const body = req.body || {};
    const to = body.to || body.phone || body.contact?.phone;
    const templateName = body.templateName || body.template || body.name;
    const templateId = body.templateId;
    const variables = body.variables || {};
    const mediaUrl = body.mediaUrl || body.imageUrl || '';
    const mediaType = body.mediaType || (mediaUrl ? 'image' : '');

    if (!to || (!templateName && !templateId)) {
      return res.status(400).json({ success: false, error: 'Required: phone/to and templateName or templateId' });
    }

    if (!whatsappService || typeof whatsappService.sendMessage !== 'function') {
      return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
    }

    // Resolve the template by id or name
    let template = null;
    try {
      if (templateId && enhancedAIService && typeof enhancedAIService.getTemplate === 'function') {
        template = await enhancedAIService.getTemplate(templateId);
      }
      if (!template && templateName && enhancedAIService && typeof enhancedAIService.getAllTemplates === 'function') {
        const all = await enhancedAIService.getAllTemplates();
        const nameLower = String(templateName).toLowerCase();
        template = (all || []).find(t => String(t.name || '').toLowerCase() === nameLower);
      }
    } catch (_) {}

    if (!template) {
      // Provide available template names to aid debugging
      let available = [];
      try {
        const all = await enhancedAIService.getAllTemplates();
        available = (all || []).map(t => t.name).filter(Boolean);
      } catch (_) {}
      return res.status(404).json({ success: false, error: `Template not found: ${templateName || templateId}`, availableTemplates: available });
    }

    // Build user profile for variable replacement
    const vars = (typeof variables === 'string') ? (() => { try { return JSON.parse(variables); } catch (_) { return {}; } })() : (variables || {});
    const userProfile = {
      name: vars.name || `${vars.first_name || ''} ${vars.last_name || ''}`.trim(),
      first_name: vars.first_name || vars.firstName || '',
      last_name: vars.last_name || vars.lastName || '',
      email: vars.email || '',
      phone: vars.phone || to,
      tags: vars.tags || [],
      customFields: vars // allow arbitrary keys via {cf.key} or {cf_key}
    };

    // Perform generic replacement pass for any {key} present in variables
    let text = String(template.content || '');
    try {
      for (const [k, v] of Object.entries(vars)) {
        const re = new RegExp(`\\{${k}\\}`, 'g');
        text = text.replace(re, String(v));
      }
    } catch (_) {}

    // Apply known GHL-style variables (name, first_name, email, cf.*) and arbitrary {key}
    try {
      text = enhancedAIService.applyTemplateVariables(text, userProfile, vars);
    } catch (_) {}

    // Format WhatsApp chat ID
    let chatId = String(to);
    if (!chatId.includes('@c.us')) {
      chatId = chatId.replace(/[^\d+]/g, '');
      if (chatId.startsWith('+')) chatId = chatId.substring(1);
      chatId = chatId + '@c.us';
    }

    // Send with optional media
    let result;
    if ((mediaUrl || template.mediaUrl) && typeof whatsappService.sendMediaFromUrl === 'function') {
      const url = mediaUrl || template.mediaUrl;
      const mType = (mediaType || template.mediaType || 'image');
      result = await whatsappService.sendMediaFromUrl(chatId, url, text, mType);
    } else {
      result = await whatsappService.sendMessage(chatId, text);
    }

    // Best-effort GHL conversation sync
    try {
      if (ghlService && typeof ghlService.addOutboundMessage === 'function') {
        const normalized = ghlService.normalizePhoneNumber(to);
        const contact = await ghlService.findContactByPhone(normalized);
        if (contact) {
          await ghlService.addOutboundMessage(contact.id, { message: text, type: 'text', direction: 'outbound' });
        }
      }
    } catch (_) {}

    res.json({ success: true, message: 'Template message sent successfully', sentMessage: { to, template: template.name || template.id, content: text, id: result?.id?._serialized } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

// Debug endpoint to check service status
app.get('/api/debug/services', async (req, res) => {
  try {
    const status = {
      useMockWhatsApp,
      whatsappService: {
        exists: !!whatsappService,
        type: whatsappService ? whatsappService.constructor.name : 'undefined',
        isReady: !!(whatsappService && whatsappService.isReady)
      },
      enhancedAIService: {
        exists: !!enhancedAIService,
        personalityLoaded: !!(enhancedAIService && enhancedAIService._personalityLoaded),
        knowledgeItems: enhancedAIService ? enhancedAIService.getKnowledgeBase().length : 0
      },
      ghlService: {
        exists: !!ghlService
      }
    };
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Root alias for knowledge list (mirrors RAG dashboard endpoint)
app.get('/api/knowledge/list', async (req, res) => {
  try {
    const items = enhancedAIService.getKnowledgeBase();
    const stats = enhancedAIService.getKnowledgeBaseStats();
    res.json({ success: true, items, count: items ? items.length : 0, stats, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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
        // Resolve tenant by location or phone for context
        try {
          const locId = message.locationId || data?.locationId || message.contact?.locationId || null;
          const resolved = tenantService ? await tenantService.resolveTenantId({ phone: contactPhone, locationId: locId, req }) : null;
          if (resolved) res.locals.tenantId = resolved;
        } catch (e) { /* noop */ }
        
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

// Alias webhook for template send (for simple testing payloads)
app.post('/webhook/ghl/template-send', async (req, res) => {
  try {
    const body = req.body || {};
    const to = body.to || body.contact?.phone || body.phone;
    const templateName = body.templateName || body.template || body.name;
    const templateId = body.templateId || null;
    const variables = body.variables || body.data?.variables || {};
    const mediaUrl = body.imageUrl || body.mediaUrl || null;
    const mediaType = body.mediaType || (mediaUrl ? 'image' : null);

    // Delegate to existing handler logic by constructing request shape
    if (!to || (!templateName && !templateId)) {
      return res.status(400).json({ success: false, error: 'Required: to and templateName or templateId' });
    }

    // Resolve template
    let template = null;
    if (templateId && enhancedAIService?.getTemplate) {
      template = await enhancedAIService.getTemplate(templateId);
    }
    if (!template && templateName && enhancedAIService?.getAllTemplates) {
      const all = await enhancedAIService.getAllTemplates();
      const nameLower = String(templateName).toLowerCase();
      template = (all || []).find(t => String(t.name || '').toLowerCase() === nameLower);
    }
    if (!template) {
      return res.status(404).json({ success: false, error: `Template not found: ${templateName || templateId}` });
    }

    // Build profile and render text
    const vars = (typeof variables === 'string') ? (() => { try { return JSON.parse(variables); } catch (_) { return {}; } })() : (variables || {});
    const contact = body.contact || body.data?.contact || body.data?.message?.contact || {};
    const resolvedFirst = vars.first_name || vars.firstName || contact.first_name || contact.firstName || '';
    const resolvedLast = vars.last_name || vars.lastName || contact.last_name || contact.lastName || '';
    const resolvedName = (vars.name || contact.name || `${resolvedFirst} ${resolvedLast}`.trim()).trim();
    const varsAugmented = { ...vars, name: resolvedName, first_name: resolvedFirst, last_name: resolvedLast };
    const userProfile = {
      name: varsAugmented.name || 'there',
      first_name: varsAugmented.first_name || '',
      last_name: varsAugmented.last_name || '',
      email: varsAugmented.email || '',
      phone: varsAugmented.phone || to,
      tags: varsAugmented.tags || [],
      customFields: varsAugmented
    };
    let text = String(template.content || '');
    try {
      for (const [k, v] of Object.entries(varsAugmented)) {
        const re = new RegExp(`\\{${k}\\}`, 'g');
        text = text.replace(re, String(v));
      }
    } catch (_) {}
    try {
      text = enhancedAIService.applyTemplateVariables(text, userProfile, varsAugmented);
    } catch (_) {}

    // Format WhatsApp JID
    let chatId = String(to);
    if (!chatId.includes('@c.us')) {
      chatId = chatId.replace(/[^\d+]/g, '');
      if (chatId.startsWith('+')) chatId = chatId.substring(1);
      chatId = chatId + '@c.us';
    }

    // Send with optional media
    let result;
    const finalMediaUrl = mediaUrl || template.mediaUrl;
    const finalMediaType = mediaType || template.mediaType || 'image';
    if (finalMediaUrl && whatsappService?.sendMediaFromUrl) {
      result = await whatsappService.sendMediaFromUrl(chatId, finalMediaUrl, text, finalMediaType);
    } else {
      result = await whatsappService.sendMessage(chatId, text);
    }

    // Optional GHL sync
    try {
      if (ghlService && typeof ghlService.addOutboundMessage === 'function') {
        const normalized = ghlService.normalizePhoneNumber(to);
        const contact = await ghlService.findContactByPhone(normalized);
        if (contact) {
          await ghlService.addOutboundMessage(contact.id, { message: text, type: 'text', direction: 'outbound' });
        }
      }
    } catch (_) {}

    return res.json({ success: true, message: 'Template sent', sentMessage: { to, template: template.name || template.id, content: text, id: result?.id?._serialized } });
  } catch (error) {
    console.error('❌ Template webhook error:', error.message);
    res.status(500).json({ success: false, error: error.message });
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

    // Normalize phone number for GHL integration
    const normalizedPhone = phoneNormalizer.normalize(from);
    if (!normalizedPhone) {
      console.warn(`⚠️ Could not normalize phone number: ${from}. Skipping GHL integration.`);
      // Still store the message locally but skip GHL processing
      return;
    }

    console.log(`📞 Normalized phone: ${from} -> ${normalizedPhone}`);

    // Get or create GHL contact
    let contact;
    try {
      contact = await ghlService.findContactByPhone(normalizedPhone);
      if (!contact) {
        contact = await ghlService.createContact({
          phone: normalizedPhone,
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
      const tenantId = tenantService ? await tenantService.resolveTenantId({ phone: normalizedPhone, locationId: contact?.locationId, tags: contact?.tags || [], req }) : null;
      console.log('🏷️ Tenant resolution (webhook):', {
        phone: normalizedPhone,
        locationId: contact?.locationId || null,
        tags: contact?.tags || [],
        tenantId
      });
      const aiResponse = await enhancedAIService.generateContextualReply(text, normalizedPhone, contact.id, tenantId);
      
      if (aiResponse && aiResponse.trim()) {
        console.log(`🤖 AI Response: ${aiResponse}`);
        
        // Send AI response back via WhatsApp
        if (whatsappService && whatsappService.isReady) {
          await whatsappService.sendMessage(normalizedPhone, aiResponse);
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
    // Resolve tenantId based on locationId or contact phone
    let tenantId = null;
    try {
      const body = req.body || {};
      const locId = body.data?.locationId || body.locationId || process.env.GHL_LOCATION_ID || null;
      const phone = body.data?.message?.contact?.phone || body.data?.contact?.phone || body.contact?.phone || null;
      tenantId = tenantService ? await tenantService.resolveTenantId({ phone, locationId: locId, req }) : null;
      if (tenantId) res.locals.tenantId = tenantId;
    } catch (_) {}

    // If webhook explicitly requests template sending, process here
    const evt = req.body?.event || '';
    const d = req.body?.data || req.body || {};
    const shouldSendTemplate = (
      evt === 'automation.template.send' || evt === 'template.send' ||
      !!(d.templateName || d.templateId || (d.custom && (d.custom.templateName || d.custom.templateId)))
    );

    if (shouldSendTemplate) {
      try {
        const to = d.to || d.contact?.phone || d.message?.contact?.phone || req.body?.to;
        const templateName = d.templateName || (d.custom && d.custom.templateName) || req.body?.templateName;
        const templateId = d.templateId || (d.custom && d.custom.templateId) || req.body?.templateId;
        const variables = d.variables || (d.custom && d.custom.variables) || req.body?.variables || {};
        const mediaUrl = d.mediaUrl || (d.custom && d.custom.mediaUrl) || req.body?.mediaUrl || '';
        const mediaType = d.mediaType || (d.custom && d.custom.mediaType) || req.body?.mediaType || '';

        // Delegate to the same logic as /api/whatsapp/send-template
        req.body = { to, templateName, templateId, variables, mediaUrl, mediaType };
        // Reuse handler by calling directly
        const fakeRes = {
          status: (code) => ({ json: (obj) => res.status(code).json(obj) }),
          json: (obj) => res.json(obj)
        };
        // Call our handler function inline by requiring the app context
        // Since we cannot easily invoke route handler, replicate minimal call here
        const { to: _to, templateName: _tplName, templateId: _tplId, variables: _vars, mediaUrl: _mUrl, mediaType: _mType } = req.body;
        if (!_to || (!_tplName && !_tplId)) {
          return res.status(400).json({ success: false, error: 'Required: to and templateName or templateId' });
        }

        // Resolve template
        let template = null;
        if (_tplId && enhancedAIService?.getTemplate) {
          template = await enhancedAIService.getTemplate(_tplId);
        }
        if (!template && _tplName && enhancedAIService?.getAllTemplates) {
          const all = await enhancedAIService.getAllTemplates();
          const nameLower = String(_tplName).toLowerCase();
          template = (all || []).find(t => String(t.name || '').toLowerCase() === nameLower);
        }
        if (!template) {
          return res.status(404).json({ success: false, error: `Template not found: ${_tplName || _tplId}` });
        }

        // Build profile and render
        const vars = (typeof _vars === 'string') ? (() => { try { return JSON.parse(_vars); } catch (_) { return {}; } })() : (_vars || {});
        const contact = d.contact || d.message?.contact || {};
        const resolvedFirst = vars.first_name || vars.firstName || contact.first_name || contact.firstName || '';
        const resolvedLast = vars.last_name || vars.lastName || contact.last_name || contact.lastName || '';
        const resolvedName = (vars.name || contact.name || `${resolvedFirst} ${resolvedLast}`.trim()).trim();
        const varsAugmented = { ...vars, name: resolvedName, first_name: resolvedFirst, last_name: resolvedLast };
        const userProfile = {
          name: varsAugmented.name || 'there',
          first_name: varsAugmented.first_name || '',
          last_name: varsAugmented.last_name || '',
          email: varsAugmented.email || '',
          phone: varsAugmented.phone || _to,
          tags: varsAugmented.tags || [],
          customFields: varsAugmented
        };
        let text = String(template.content || '');
        for (const [k, v] of Object.entries(varsAugmented)) {
          const re = new RegExp(`\\{${k}\\}`, 'g');
          text = text.replace(re, String(v));
        }
        text = enhancedAIService.applyTemplateVariables(text, userProfile, varsAugmented);

        // WhatsApp JID formatting
        let chatId = String(_to);
        if (!chatId.includes('@c.us')) {
          chatId = chatId.replace(/[^\d+]/g, '');
          if (chatId.startsWith('+')) chatId = chatId.substring(1);
          chatId = chatId + '@c.us';
        }

        let result;
        if ((_mUrl || template.mediaUrl) && whatsappService?.sendMediaFromUrl) {
          const url = _mUrl || template.mediaUrl;
          const mType = (_mType || template.mediaType || 'image');
          result = await whatsappService.sendMediaFromUrl(chatId, url, text, mType);
        } else {
          result = await whatsappService.sendMessage(chatId, text);
        }

        // Best-effort GHL sync
        try {
          if (ghlService && typeof ghlService.addOutboundMessage === 'function') {
            const normalized = ghlService.normalizePhoneNumber(_to);
            const contact = await ghlService.findContactByPhone(normalized);
            if (contact) {
              await ghlService.addOutboundMessage(contact.id, { message: text, type: 'text', direction: 'outbound' });
            }
          }
        } catch (_) {}

        return res.json({ success: true, message: 'Automation template sent', sentMessage: { to: _to, template: template.name || template.id, content: text, id: result?.id?._serialized } });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // Process the webhook through our webhook service with tenant context
    await webhookService.processGHLWebhook(req.body, tenantId);
    
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

// List all knowledge base items (used by AI Management Dashboard)
app.get('/api/ai/knowledge', async (req, res) => {
  try {
    const knowledgeItems = enhancedAIService.getKnowledgeBase();
    res.json({ success: true, knowledge: knowledgeItems, total: knowledgeItems.length });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ success: false, error: error.message });
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
      content: knowledgeItem.content || ''
    });
  } catch (error) {
    console.error('Error getting knowledge base item:', error);
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
      return res.status(404).json({ success: false, error: 'Knowledge base item not found' });
    }
    res.json({ success: true, message: 'Knowledge base item deleted successfully' });
  } catch (error) {
    console.error('Error deleting knowledge base item:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test AI chat with knowledge base (RAG)
app.post('/api/ai/test-chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    console.log(`🧪 Testing AI chat with message: "${message}"`);
    
    // Generate AI response using Enhanced AI Service with RAG
    const testConversationId = conversationId || `test-${Date.now()}`;
    const aiReply = await enhancedAIService.generateContextualReply(
      message, 
      testConversationId, 
      testConversationId
    );

    if (aiReply) {
      // Persist test chat to conversations so analytics reflect test flows
      try {
        const now = Date.now();
        // Store inbound user message
        await conversationManager.addMessage({
          from: testConversationId,
          body: message,
          timestamp: now,
          type: 'text'
        }, testConversationId, 'Test Chat');
        // Store outbound AI reply
        await conversationManager.addMessage({
          from: 'ai',
          body: aiReply,
          timestamp: Date.now(),
          type: 'text'
        }, testConversationId, 'Test Chat');
        console.log(`🧪 Persisted test chat for ${testConversationId}`);
      } catch (persistErr) {
        console.warn('Test-chat persistence warning:', persistErr.message);
      }
      console.log(`✅ AI generated reply: ${aiReply.substring(0, 100)}...`);
      res.json({
        success: true,
        query: message,
        reply: aiReply,
        conversationId: testConversationId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'AI did not generate a reply'
      });
    }

  } catch (error) {
    console.error('Error in AI test chat:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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

// Enhanced AI status endpoint (used by Automation Dashboard overview)
app.get('/api/enhanced-ai/status', async (req, res) => {
  try {
    const stats = enhancedAIService.getConversationStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lightweight webview click tracker to avoid frontend timeouts
app.post('/api/webviewClick', (req, res) => {
  try {
    const { page, element, ts } = req.body || {};
    // Log minimal info without blocking
    if (page || element) {
      console.log('🖱️ WebviewClick', { page, element, ts });
    }
    res.json({ success: true });
  } catch (_) {
    // Always return quickly to prevent timeouts
    res.json({ success: true });
  }
});

app.get('/api/webviewClick', (req, res) => {
  res.json({ success: true });
});

// Templates management endpoints
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await enhancedAIService.getAllTemplates();
    res.json({ success: true, templates });
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

app.post('/api/templates', async (req, res) => {
  try {
    const { id, name, category, mediaType } = req.body || {};
    const content = (req.body && (req.body.content || req.body.text)) || '';
    // Accept both mediaUrl and imageUrl for convenience
    const mediaUrl = (req.body && (req.body.mediaUrl ?? req.body.imageUrl)) || '';

    if (!name || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name, content/text' });
    }

    await enhancedAIService.addTemplate(id, name, content, category, mediaUrl, mediaType);
    res.json({ success: true, message: 'Template added successfully' });
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

// JSON error handler to avoid HTML error pages on parse errors
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isBodyParseError = err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err);
  res.status(status).json({ success: false, error: isBodyParseError ? 'Invalid JSON payload' : (err.message || 'Internal Server Error') });
});

// 404 handler returning JSON (placed before server start)
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found', path: req.originalUrl });
});

// Start server
const PORT = process.env.PORT || 3000;
if (require.main === module) {
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize WhatsApp service after server starts
  if (whatsappService && whatsappService.initialize) {
    console.log('🔄 Initializing WhatsApp service...');
    
    // Set up event handlers
    whatsappService.on('qr', (qr) => {
      console.log('📱 QR Code received - scan with WhatsApp');
      // Broadcast QR to frontend via Socket.IO for web display
      try {
        io.emit('qr_code', qr);
      } catch (e) {
        console.warn('Socket emit qr_code failed:', e && e.message ? e.message : e);
      }
    });

    whatsappService.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      // Notify frontend that WhatsApp is ready
      try {
        io.emit('whatsapp_ready', { ready: true });
      } catch (e) {
        console.warn('Socket emit whatsapp_ready failed:', e && e.message ? e.message : e);
      }
    });

    whatsappService.on('disconnected', () => {
      console.log('❌ WhatsApp client disconnected');
      try {
        io.emit('whatsapp_disconnected', { ready: false });
      } catch (e) {
        console.warn('Socket emit whatsapp_disconnected failed:', e && e.message ? e.message : e);
      }
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
            // Fix: avoid referencing undefined `req` in event context
            // Enrich with contact tags to improve tenant resolution
            let contactForTags = null;
            try { contactForTags = await ghlService.findContactByPhone(message.from); } catch (_) {}
            const tId = tenantService ? await tenantService.resolveTenantId({ phone: message.from, locationId: contactForTags?.locationId, tags: contactForTags?.tags || [] }) : null;
            console.log('🏷️ Tenant resolution (device):', {
              phone: message.from,
              locationId: contactForTags?.locationId || null,
              tags: contactForTags?.tags || [],
              tenantId: tId
            });
            const aiReply = await enhancedAIService.generateContextualReply(message.body, message.from, message.from, tId);
          
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
        console.error('❌ Error handling WhatsApp message:', error);
      }
    });

    // Initialize the service
    whatsappService.initialize();
  }
});
}
