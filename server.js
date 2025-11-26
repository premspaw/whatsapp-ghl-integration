const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

// ===== N8N Integration Flags =====
const AI_MODE = process.env.AI_MODE || 'local';
const N8N_ENABLED = (process.env.N8N_ENABLED === 'true') || AI_MODE === 'n8n';
const N8N_AI_REPLY_URL = (process.env.N8N_AI_REPLY_URL || '').trim();
const N8N_API_KEY = (process.env.N8N_API_KEY || '').trim();

/**
 * Forward an inbound WhatsApp text to n8n for AI reply.
 * Returns the reply text or null if disabled/failed.
 */
async function forwardToN8nAIReply({ text, from, contactName, tenantId, conversationId, messageType = 'text', fromMe = false }) {
  try {
    if (!N8N_ENABLED || !N8N_AI_REPLY_URL) return null;
    const payload = {
      phone: from,
      text,
      contactName: contactName || 'Unknown Contact',
      tenantId: tenantId || null,
      conversationId: conversationId || from,
      messageType,
      fromMe
    };
    const headers = {
      'Content-Type': 'application/json'
    };
    if (N8N_API_KEY) headers['X-Api-Key'] = N8N_API_KEY;
    const resp = await axios.post(N8N_AI_REPLY_URL, payload, { headers, timeout: 15000 });
    const data = resp && resp.data ? resp.data : {};
    // Accept common shapes: {reply}, {message}, {text}, or raw string
    const reply = typeof data === 'string' ? data : (data.reply || data.message || data.text || null);
    if (reply && String(reply).trim().length > 0) return String(reply);
    return null;
  } catch (err) {
    console.warn('⚠️ n8n forward failed:', err && err.message ? err.message : err);
    return null;
  }
}

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
const InboundWebhookRelay = require('./services/inboundWebhookRelay');
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
// Accept application/x-www-form-urlencoded bodies (GHL webhook key–value pairs)
app.use(express.urlencoded({ extended: true }));

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
let inboundRelay;

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
  // Initialize inbound webhook relay (external integrations like n8n)
  try {
    inboundRelay = new InboundWebhookRelay();
    console.log('✅ InboundWebhookRelay initialized');
  } catch (e) {
    console.warn('⚠️ InboundWebhookRelay initialization failed:', e.message);
  }
  
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
app.use('/api/analytics', require('./routes/analyticsRoutes')(analyticsService, securityService));
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
app.use('/api/handoff-rules', require('./routes/handoffRulesRoutes')(enhancedAIService));
app.use('/api/integrations', require('./routes/integrationsRoutes')());
// Alias: allow front-end to call /rag-dashboard/api/knowledge/* and reuse /api/knowledge/*
// Remove redirect alias so RAG dashboard routes handle knowledge endpoints directly
// This prevents 307 redirects and ensures JSON responses from routes/ragDashboard.js

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
    // Some GHL payloads send customData as a JSON string; parse safely
    if (body.customData && typeof body.customData === 'string') {
      try { body.customData = JSON.parse(body.customData); } catch (_) {}
    }
    // Accept broader GHL payload shapes for phone
    let to = (
      body.to ||
      body.phone ||
      body.customData?.to ||
      body.customData?.recipient ||
      body.customData?.phone ||
      body.recipient ||
      body.to_number ||
      body.phoneNumber ||
      body.contact?.phone ||
      body.contact?.phoneNumber ||
      body.contact?.phone?.number ||
      body.message?.contact?.phone ||
      body.message?.phone ||
      body.data?.to ||
      body.data?.phone ||
      body.data?.contact?.phone ||
      body.data?.message?.contact?.phone ||
      body.data?.message?.phone ||
      body.custom?.to ||
      req.query?.to ||
      req.query?.phone
    );
    if (typeof to === 'string') to = to.trim();
    // Accept multiple keys for template name/id
    let templateName = (
      body.templateName ||
      body.template ||
      body.name ||
      body.customData?.templateName ||
      body.message?.templateName ||
      body.data?.templateName ||
      body.data?.template ||
      body.custom?.templateName ||
      req.query?.templateName ||
      req.query?.template
    );
    if (typeof templateName === 'string') templateName = templateName.trim();
    const templateId = body.templateId || body.customData?.templateId || body.data?.templateId || body.custom?.templateId;
    // Variables may arrive as string or nested in data/custom
    const rawVariables = (
      body.variables !== undefined ? body.variables :
      body.customData?.variables !== undefined ? body.customData.variables :
      body.data?.variables !== undefined ? body.data.variables :
      body.custom?.variables !== undefined ? body.custom.variables :
      req.query?.variables !== undefined ? req.query.variables :
      {}
    );
    const mediaUrl = body.mediaUrl || body.imageUrl || body.customData?.imageUrl || body.custom?.imageUrl || '';
    const mediaType = body.mediaType || (mediaUrl ? 'image' : '');

    // Debug: show resolved, computed fields before validation
    try {
      console.log('🧩 send-template resolved fields:', {
        to,
        templateName,
        templateId,
        variablesType: typeof rawVariables,
        hasMedia: !!mediaUrl
      });
    } catch (_) {}

    if (!to || (!templateName && !templateId)) {
      // Log body to help diagnose missing fields during configuration
      try {
        console.warn('⚠️ send-template missing required fields.', {
          resolved: { to, templateName, templateId },
          incoming: body
        });
      } catch (_) {}
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
    const vars = (typeof rawVariables === 'string') ? (() => { try { return JSON.parse(rawVariables); } catch (_) { return {}; } })() : (rawVariables || {});
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

    // Normalize phone to E.164 when possible (e.g., '081231 33382' -> '+918123133382')
    let normalizedTo = to;
    try {
      const { normalize } = require('./utils/phoneNormalizer');
      normalizedTo = normalize(String(to)) || to;
    } catch (_) {}
    // Format WhatsApp chat ID
    let chatId = String(normalizedTo || to);
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

    // Store sent message locally and emit to frontend
    try {
      const messageData = {
        id: `sent_${Date.now()}`,
        from: 'ai',
        body: text,
        timestamp: Date.now(),
        type: (mediaUrl || template.mediaUrl) ? 'media' : 'text',
        direction: 'outbound',
        template: template.name || template.id
      };
      await conversationManager.addMessage(messageData, chatId);
      res.app?.locals?.io?.to?.('whatsapp')?.emit?.('ai_reply', { to: chatId, body: text, timestamp: messageData.timestamp });
    } catch (_) {}

    // Best-effort GHL conversation sync
    try {
      if (ghlService && typeof ghlService.addOutboundMessage === 'function') {
        const normalized = ghlService.normalizePhoneNumber(to);
        const contact = await ghlService.findContactByPhone(normalized);
        if (contact) {
          await ghlService.addOutboundMessage(contact.id, { message: text, type: 'SMS', direction: 'outbound' });
        }
      }
    } catch (_) {}

    res.json({ success: true, message: 'Template message sent successfully', sentMessage: { to, template: template.name || template.id, content: text, id: result?.id?._serialized } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const activitiesFile = path.join(__dirname, 'data', 'activities.json');
const linksFile = path.join(__dirname, 'data', 'tracked_links.json');
function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (_) { return []; }
}
function writeJsonSafe(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch (_) {}
}
app.get('/api/activity/:conversationId', (req, res) => {
  const id = String(req.params.conversationId || '').trim();
  const list = readJsonSafe(activitiesFile).filter(a => a.conversationId === id).sort((a,b)=>b.timestamp-a.timestamp);
  res.json({ success: true, items: list, count: list.length });
});
app.post('/api/activity/log', (req, res) => {
  const body = req.body || {};
  const item = { conversationId: String(body.conversationId||'').trim(), type: String(body.type||'').trim(), meta: body.meta||{}, timestamp: Date.now() };
  if (!item.conversationId || !item.type) return res.status(400).json({ success:false, error:'conversationId and type required' });
  const list = readJsonSafe(activitiesFile);
  list.push(item);
  writeJsonSafe(activitiesFile, list);
  res.json({ success:true, item });
});
app.post('/api/activity/create-link', (req, res) => {
  const body = req.body || {};
  const url = String(body.url||'').trim();
  const conversationId = String(body.conversationId||'').trim();
  if (!url || !conversationId) return res.status(400).json({ success:false, error:'url and conversationId required' });
  const token = Math.random().toString(36).slice(2,10)+Date.now().toString(36);
  const links = readJsonSafe(linksFile);
  links.push({ token, url, conversationId, createdAt: Date.now() });
  writeJsonSafe(linksFile, links);
  res.json({ success:true, link: `/r/${token}` });
});
app.get('/r/:token', (req, res) => {
  const token = String(req.params.token||'').trim();
  const links = readJsonSafe(linksFile);
  const found = links.find(l => l.token === token);
  if (!found) return res.status(404).send('Not found');
  const list = readJsonSafe(activitiesFile);
  list.push({ conversationId: found.conversationId, type:'link_clicked', meta:{ url: found.url, token }, timestamp: Date.now() });
  writeJsonSafe(activitiesFile, list);
  res.redirect(found.url);
});
app.get('/api/activity/recent', (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
  const list = readJsonSafe(activitiesFile).sort((a,b)=>b.timestamp-a.timestamp).slice(0, limit);
  res.json({ success:true, items:list, count:list.length });
});

app.get('/api/analytics/counters', (req, res) => {
  try {
    const file = path.join(__dirname, 'data', 'conversations.json');
    const all = readJsonSafe(file);
    let messagesSent = 0;
    let templatesSent = 0;
    let aiReplies = 0;
    (all || []).forEach(conv => {
      const msgs = Array.isArray(conv.messages) ? conv.messages : [];
      msgs.forEach(m => {
        const isOutbound = (m.direction === 'outbound') || (m.from === 'me') || (m.from === 'ai');
        if (isOutbound) messagesSent++;
        const isTemplate = (m.meta && m.meta.isTemplate) || (typeof m.id === 'string' && m.id.startsWith('tpl_')) || (m.source === 'template');
        if (isTemplate) templatesSent++;
        if ((m.from === 'ai') && isOutbound) aiReplies++;
      });
    });
    const pricePerReplyInr = 0.20;
    const aiCostInr = Number((aiReplies * pricePerReplyInr).toFixed(2));
    res.json({ success:true, messagesSent, templatesSent, aiReplies, pricePerReplyInr, aiCostInr });
  } catch (e) {
    res.status(500).json({ success:false, error:e.message });
  }
});

// GHL webhook to trigger template sends and reflect in tab + GHL sync
app.post('/webhook/ghl/template-send', async (req, res) => {
  try {
    const body = req.body || {};
    // Parse flexible shapes
    let to = (
      body.to || body.phone || body.recipient || body.contact?.phone || body.contact?.phoneNumber || body.message?.phone || body.data?.phone || ''
    );
    if (typeof to === 'string') to = to.trim();
    const templateName = (body.templateName || body.template || body.name || '').trim();
    const variables = body.variables || body.data?.variables || {};
    const imageUrl = body.imageUrl || body.data?.imageUrl || body.mediaUrl || '';
    const text = body.text || body.message?.text || body.content || body.message || (templateName ? `[${templateName}]` : '');

    // Normalize number
    const { normalize } = require('./utils/phoneNormalizer');
    const normalized = normalize(String(to || ''));
    if (!normalized) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    // Send media if provided, else text
    let result;
    try {
      if (imageUrl && whatsappService && typeof whatsappService.sendMediaFromUrl === 'function') {
        result = await whatsappService.sendMediaFromUrl(normalized, imageUrl, text || '', 'image');
      } else if (whatsappService && typeof whatsappService.sendMessage === 'function') {
        const chatId = normalized.replace('+','') + '@c.us';
        result = await whatsappService.sendMessage(chatId, text || '');
      } else {
        return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
      }
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message || 'Send failed' });
    }

    // Persist to conversation and emit to UI
    try {
      if (conversationManager && typeof conversationManager.addMessage === 'function') {
        await conversationManager.addMessage(normalized, {
          id: result?.id?._serialized || `tpl_${Date.now()}`,
          from: 'ai',
          direction: 'outbound',
          body: text || '',
          timestamp: Date.now(),
          type: imageUrl ? 'image' : 'text',
          hasMedia: !!imageUrl,
          mediaUrl: imageUrl || undefined,
          mediaType: imageUrl ? 'image' : undefined
        });
      }
    } catch (_) {}

    try {
      io.emit('ai_reply', { to: normalized, body: text || '', timestamp: Date.now(), id: result?.id?._serialized || `tpl_${Date.now()}` });
    } catch (_) {}

    // Sync to GHL for consistency
    try {
      const conv = await conversationManager.getConversation(normalized);
      if (conv && ghlService && typeof ghlService.syncConversation === 'function') {
        await ghlService.syncConversation(conv);
      }
    } catch (_) {}

    return res.json({ success: true, delivered: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Alias endpoint to avoid 404s when using '/api/whatsapp/template-send'
app.post('/api/whatsapp/template-send', async (req, res) => {
  try {
    const body = req.body || {};
    if (body.customData && typeof body.customData === 'string') {
      try { body.customData = JSON.parse(body.customData); } catch (_) {}
    }
    let to = (
      body.to ||
      body.phone ||
      body.customData?.to ||
      body.customData?.recipient ||
      body.customData?.phone ||
      body.recipient ||
      body.to_number ||
      body.phoneNumber ||
      body.contact?.phone ||
      body.contact?.phoneNumber ||
      body.contact?.phone?.number ||
      body.message?.contact?.phone ||
      body.message?.phone ||
      body.data?.to ||
      body.data?.phone ||
      body.data?.contact?.phone ||
      body.data?.message?.contact?.phone ||
      body.data?.message?.phone ||
      body.custom?.to ||
      req.query?.to ||
      req.query?.phone
    );
    if (typeof to === 'string') to = to.trim();
    let templateName = (
      body.templateName ||
      body.template ||
      body.name ||
      body.customData?.templateName ||
      body.message?.templateName ||
      body.data?.templateName ||
      body.data?.template ||
      body.custom?.templateName ||
      req.query?.templateName ||
      req.query?.template
    );
    if (typeof templateName === 'string') templateName = templateName.trim();
    const templateId = body.templateId || body.customData?.templateId || body.data?.templateId || body.custom?.templateId;
    const rawVariables = (
      body.variables !== undefined ? body.variables :
      body.customData?.variables !== undefined ? body.customData.variables :
      body.data?.variables !== undefined ? body.data.variables :
      body.custom?.variables !== undefined ? body.custom.variables :
      req.query?.variables !== undefined ? req.query.variables :
      {}
    );
    const mediaUrl = body.mediaUrl || body.imageUrl || body.customData?.imageUrl || body.custom?.imageUrl || '';
    const mediaType = body.mediaType || (mediaUrl ? 'image' : '');

    try {
      console.log('🧩 template-send resolved fields:', {
        to,
        templateName,
        templateId,
        variablesType: typeof rawVariables,
        hasMedia: !!mediaUrl
      });
    } catch (_) {}

    if (!to || (!templateName && !templateId)) {
      try {
        console.warn('⚠️ template-send missing required fields.', {
          resolved: { to, templateName, templateId },
          incoming: body
        });
      } catch (_) {}
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
      let available = [];
      try {
        const all = await enhancedAIService.getAllTemplates();
        available = (all || []).map(t => t.name).filter(Boolean);
      } catch (_) {}
      return res.status(404).json({ success: false, error: `Template not found: ${templateName || templateId}`, availableTemplates: available });
    }

    // Build user profile for variable replacement
    const vars = (typeof rawVariables === 'string') ? (() => { try { return JSON.parse(rawVariables); } catch (_) { return {}; } })() : (rawVariables || {});
    const userProfile = {
      name: vars.name || `${vars.first_name || ''} ${vars.last_name || ''}`.trim(),
      first_name: vars.first_name || vars.firstName || '',
      last_name: vars.last_name || vars.lastName || '',
      email: vars.email || '',
      phone: vars.phone || to,
      tags: vars.tags || [],
      customFields: vars
    };

    // Variable replacement
    let text = String(template.content || '');
    try {
      for (const [k, v] of Object.entries(vars)) {
        const re = new RegExp(`\\{${k}\\}`, 'g');
        text = text.replace(re, String(v));
      }
    } catch (_) {}
    try { text = enhancedAIService.applyTemplateVariables(text, userProfile, vars); } catch (_) {}

    // Normalize phone and build chatId
    let normalizedTo = to;
    try { const { normalize } = require('./utils/phoneNormalizer'); normalizedTo = normalize(String(to)) || to; } catch (_) {}
    let chatId = String(normalizedTo || to);
    if (!chatId.includes('@c.us')) {
      chatId = chatId.replace(/[^\d+]/g, '');
      if (chatId.startsWith('+')) chatId = chatId.substring(1);
      chatId = chatId + '@c.us';
    }

    // Send message or media
    let result;
    if ((mediaUrl || template.mediaUrl) && typeof whatsappService.sendMediaFromUrl === 'function') {
      const url = mediaUrl || template.mediaUrl;
      const mType = (mediaType || template.mediaType || 'image');
      result = await whatsappService.sendMediaFromUrl(chatId, url, text, mType);
    } else {
      result = await whatsappService.sendMessage(chatId, text);
    }

    // Store sent message locally and emit to frontend
    try {
      const messageData = {
        id: `sent_${Date.now()}`,
        from: 'ai',
        body: text,
        timestamp: Date.now(),
        type: (mediaUrl || template.mediaUrl) ? 'media' : 'text',
        direction: 'outbound',
        template: template.name || template.id
      };
      await conversationManager.addMessage(messageData, chatId);
      res.app?.locals?.io?.to?.('whatsapp')?.emit?.('ai_reply', { to: chatId, body: text, timestamp: messageData.timestamp });
    } catch (_) {}

    // Optional GHL sync
    try {
      if (ghlService && typeof ghlService.addOutboundMessage === 'function') {
        const normalized = ghlService.normalizePhoneNumber(to);
        const contact = await ghlService.findContactByPhone(normalized);
        if (contact) {
          await ghlService.addOutboundMessage(contact.id, { message: text, type: 'SMS', direction: 'outbound' });
        }
      }
    } catch (_) {}

    return res.json({ success: true, message: 'Template sent', sentMessage: { to, template: template.name || template.id, content: text, id: result?.id?._serialized } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message || 'Alias error' });
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

// Generic WhatsApp send endpoint with auto-sync to GHL
async function sendWhatsappMessageHandler(req, res) {
  try {
    const body = req.body || {};
    let to = body.to || body.phone || body.contact?.phone;
    const text = body.message || body.text || '';
    const mediaUrl = body.mediaUrl || '';
    const mediaType = body.mediaType || (mediaUrl ? 'image' : '');

    if (!to || !text) {
      return res.status(400).json({ success: false, error: 'Required: to/phone and message' });
    }

    // Normalize to WhatsApp chat ID
    let normalizedTo = to;
    try { const { normalize } = require('./utils/phoneNormalizer'); normalizedTo = normalize(String(to)) || to; } catch (_) {}
    let chatId = String(normalizedTo || to);
    if (!chatId.includes('@c.us')) {
      // Strip all non-digit characters to form WhatsApp JID
      chatId = chatId.replace(/\D/g, '');
      chatId = chatId + '@c.us';
    }

    // Send message or media via WhatsApp service
    let result;
    if (mediaUrl && typeof whatsappService.sendMediaFromUrl === 'function') {
      const mType = mediaType || 'image';
      result = await whatsappService.sendMediaFromUrl(chatId, mediaUrl, text, mType);
    } else {
      result = await whatsappService.sendMessage(chatId, text);
    }

    // Store sent message in local conversation
    try {
      const messageData = {
        id: `sent_${Date.now()}`,
        from: 'ai',
        body: text,
        timestamp: Date.now(),
        type: mediaUrl ? 'media' : 'text',
        direction: 'outbound'
      };
      await conversationManager.addMessage(messageData, chatId);
      // Emit to frontend so live UI updates
      res.app?.locals?.io?.to?.('whatsapp')?.emit?.('ai_reply', { to: chatId, body: text, timestamp: messageData.timestamp });
    } catch (_) {}

    // Auto-sync the conversation to GHL
    try {
      const conversation = await conversationManager.getConversation(chatId);
      if (conversation && ghlService && typeof ghlService.syncConversation === 'function') {
        await ghlService.syncConversation(conversation);
        console.log('✅ Sent message auto-synced to GHL');
      }
    } catch (syncError) {
      console.error('❌ Error auto-syncing sent message to GHL:', syncError.message || syncError);
    }

    return res.json({ success: true, message: 'Message sent', sentMessage: { to, content: text, id: result?.id?._serialized || result?.id || null } });
  } catch (error) {
    console.error('❌ Send message error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Primary endpoint used by the tab
app.post('/api/whatsapp/send', sendWhatsappMessageHandler);
// Alias used by legacy UI
app.post('/api/send-message', sendWhatsappMessageHandler);

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

// Removed legacy RAG knowledge list alias

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
                type: 'TYPE_SMS',
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

    // Normalize phone (e.g., local '081231 33382' -> '+918123133382')
    let normalizedTo = to;
    try {
      const { normalize } = require('./utils/phoneNormalizer');
      normalizedTo = normalize(String(to)) || to;
    } catch (_) {}
    // Format WhatsApp JID
    let chatId = String(normalizedTo || to);
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

    // Store sent message locally and emit to frontend
    try {
      const messageData = {
        id: `sent_${Date.now()}`,
        from: 'ai',
        body: text,
        timestamp: Date.now(),
        type: finalMediaUrl ? 'media' : 'text',
        direction: 'outbound',
        template: template.name || template.id
      };
      await conversationManager.addMessage(messageData, chatId);
      res.app?.locals?.io?.to?.('whatsapp')?.emit?.('ai_reply', { to: chatId, body: text, timestamp: messageData.timestamp });
    } catch (_) {}

    // Optional GHL sync
    try {
      if (ghlService && typeof ghlService.addOutboundMessage === 'function') {
        const normalized = ghlService.normalizePhoneNumber(to);
        const contact = await ghlService.findContactByPhone(normalized);
        if (contact) {
          await ghlService.addOutboundMessage(contact.id, { message: text, type: 'TYPE_SMS', direction: 'outbound' });
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

    // Generate AI response (n8n-first with local fallback)
    try {
      const tenantId = tenantService ? await tenantService.resolveTenantId({ phone: normalizedPhone, locationId: contact?.locationId, tags: contact?.tags || [], req }) : null;
      console.log('🏷️ Tenant resolution (webhook):', { phone: normalizedPhone, locationId: contact?.locationId || null, tags: contact?.tags || [], tenantId });
      let aiResponse = '';

      if (N8N_ENABLED && N8N_AI_REPLY_URL) {
        try {
          const n8nResult = await forwardToN8nAIReply({
            text,
            from: normalizedPhone,
            contactName: contact?.name || '',
            tenantId,
            conversationId: contact?.id || '',
            messageType: 'text',
            fromMe: false
          });
          aiResponse = n8nResult?.text || '';
          if (aiResponse) {
            console.log('🤖 AI Response (n8n):', aiResponse);
          }
        } catch (n8nErr) {
          console.error('⚠️ n8n forwarding failed (webhook path), falling back:', n8nErr.message || n8nErr);
        }
      }

      if (!aiResponse) {
        aiResponse = await enhancedAIService.generateContextualReply(text, normalizedPhone, contact.id, tenantId);
        if (aiResponse) console.log('🤖 AI Response (local):', aiResponse);
      }

      if (aiResponse && aiResponse.trim()) {
        if (whatsappService && whatsappService.isReady) {
          await whatsappService.sendMessage(normalizedPhone, aiResponse);
          console.log('✅ AI response sent via WhatsApp');
          await ghlService.addOutboundMessage(contact.id, {
            message: aiResponse,
            type: 'TYPE_SMS',
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
          await ghlService.addOutboundMessage(contact.id, { message: text, type: 'TYPE_SMS', direction: 'outbound' });
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


// Media upload endpoint for WhatsApp tab (images/videos)
// Saves to public/uploads/media so files are directly accessible via static hosting
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, 'public', 'uploads', 'media');
    try {
      fs.mkdirSync(dest, { recursive: true });
    } catch (e) {}
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

app.post('/api/media/upload', mediaUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const isImage = req.file.mimetype && req.file.mimetype.startsWith('image/');
    const isVideo = req.file.mimetype && req.file.mimetype.startsWith('video/');
    const mediaType = isImage ? 'image' : isVideo ? 'video' : 'file';
    const relativePath = req.file.path.replace(path.join(__dirname, 'public'), '').replace(/\\/g, '/');
    const url = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
    return res.json({ success: true, url, mediaType });
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ success: false, error: error.message });
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

// Settings API to manage AI via n8n toggle and pricing
app.get('/api/settings/ai-enabled', (req, res) => {
  try {
    // Load the latest settings from disk
    loadSettingsFromDisk();
    res.json({ success: true, enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings/ai-enabled', (req, res) => {
  try {
    const { enabled, webhookUrl, pricing } = req.body || {};
    saveSettings({ enabled, webhookUrl, pricing });
    res.json({ success: true, message: 'Settings saved', enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward-compatible alias: '/api/settings/ai-enable' (without trailing 'd')
app.get('/api/settings/ai-enable', (req, res) => {
  try {
    loadSettingsFromDisk();
    res.json({ success: true, enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings/ai-enable', (req, res) => {
  try {
    const { enabled, webhookUrl, pricing } = req.body || {};
    saveSettings({ enabled, webhookUrl, pricing });
    res.json({ success: true, message: 'Settings saved', enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook to receive final WhatsApp reply payloads from n8n (moved before 404)
app.post('/webhook/n8n/whatsapp-reply', async (req, res) => {
  try {
    const body = req.body || {};
    let to = body.to || body.phone || body.contact?.phone || body.chatId;
    const text = body.message || body.text || '';
    const mediaUrl = body.mediaUrl || '';
    const mediaType = body.mediaType || (mediaUrl ? 'image' : '');
    const tenantId = body.tenantId || null;
    const contactName = body.contactName || body.name || 'Unknown Contact';

    if (!to || (!text && !mediaUrl)) {
      return res.status(400).json({ success: false, error: 'Required: to/phone and message or mediaUrl' });
    }

    // Normalize to WhatsApp chat ID
    let chatId = String(to);
    try { const { normalize } = require('./utils/phoneNormalizer'); chatId = normalize(String(to)) || String(to); } catch (_) {}
    if (!chatId.includes('@c.us')) {
      chatId = chatId.replace(/\D/g, '') + '@c.us';
    }

    // Send message or media
    let result;
    if (mediaUrl && typeof whatsappService.sendMediaFromUrl === 'function') {
      const mType = mediaType || 'image';
      result = await whatsappService.sendMediaFromUrl(chatId, mediaUrl, text, mType);
    } else {
      result = await whatsappService.sendMessage(chatId, text);
    }

    // Store sent message locally and emit to frontend
    try {
      const messageData = {
        id: `sent_${Date.now()}`,
        from: 'ai',
        body: text,
        timestamp: Date.now(),
        type: mediaUrl ? 'media' : 'text',
        direction: 'outbound'
      };
      await conversationManager.addMessage(messageData, chatId, contactName);
      res.app?.locals?.io?.to?.('whatsapp')?.emit?.('ai_reply', { to: chatId, body: text, timestamp: messageData.timestamp });
    } catch (_) {}

    // Optional GHL sync
    try {
      if (ghlService && typeof ghlService.addOutboundMessage === 'function') {
        const normalized = ghlService.normalizePhoneNumber(to);
        const contact = await ghlService.findContactByPhone(normalized);
        if (contact && contact.id) {
          await ghlService.addOutboundMessage(contact.id, { message: text, type: 'SMS', direction: 'outbound' });
        }
      }
    } catch (syncErr) {
      console.warn('GHL sync after n8n reply failed:', syncErr && syncErr.message);
    }

    res.json({ success: true, message: 'Reply delivered', messageId: result });
  } catch (error) {
    console.error('Error handling n8n reply webhook:', error);
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
// Global AI (n8n) toggle state loaded from settings file
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
let aiN8nEnabled = false;
let n8nWebhookUrlFromSettings = '';
let aiN8nPricing = { pricePerReply: 0, currency: 'INR', freeReplies: 0, billingNote: '' };

function sanitizeUrl(u) {
  const s = String(u || '').trim();
  return s.replace(/^`+|`+$/g, '');
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const json = JSON.parse(raw);
    aiN8nEnabled = Boolean(json.aiN8nEnabled);
    n8nWebhookUrlFromSettings = sanitizeUrl(json.n8nWebhookUrl || '');
    const p = json.pricing || {};
    aiN8nPricing = {
      pricePerReply: Number(p.pricePerReply || 0),
      currency: String(p.currency || 'INR'),
      freeReplies: Number(p.freeReplies || 0),
      billingNote: String(p.billingNote || '')
    };
  } catch (e) {
    // Defaults if settings not present
    aiN8nEnabled = false;
    n8nWebhookUrlFromSettings = '';
    aiN8nPricing = { pricePerReply: 0, currency: 'INR', freeReplies: 0, billingNote: '' };
  }
}

function saveSettings({ enabled = aiN8nEnabled, webhookUrl = n8nWebhookUrlFromSettings, pricing = aiN8nPricing } = {}) {
  const data = {
    aiN8nEnabled: Boolean(enabled),
    n8nWebhookUrl: sanitizeUrl(webhookUrl || ''),
    pricing: {
      pricePerReply: Number((pricing && pricing.pricePerReply) || 0),
      currency: String((pricing && pricing.currency) || 'INR'),
      freeReplies: Number((pricing && pricing.freeReplies) || 0),
      billingNote: String((pricing && pricing.billingNote) || '')
    },
    updatedAt: Date.now()
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
  aiN8nEnabled = data.aiN8nEnabled;
  n8nWebhookUrlFromSettings = data.n8nWebhookUrl;
  aiN8nPricing = data.pricing;
}

// Load settings from disk if present, otherwise fall back to environment
function loadSettingsFromDisk() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const json = JSON.parse(raw);
      aiN8nEnabled = Boolean(json.aiN8nEnabled);
      n8nWebhookUrlFromSettings = sanitizeUrl(json.n8nWebhookUrl || '');
      aiN8nPricing = {
        pricePerReply: Number((json.pricing && json.pricing.pricePerReply) || 0),
        currency: String((json.pricing && json.pricing.currency) || 'INR'),
        freeReplies: Number((json.pricing && json.pricing.freeReplies) || 0),
        billingNote: String((json.pricing && json.pricing.billingNote) || '')
      };
    } else {
      // Initialize from environment defaults
      aiN8nEnabled = N8N_ENABLED;
      n8nWebhookUrlFromSettings = N8N_AI_REPLY_URL;
      aiN8nPricing = aiN8nPricing || { pricePerReply: 0, currency: 'INR', freeReplies: 0, billingNote: '' };
      // Persist defaults once so UI can read them
      saveSettings({ enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
    }
    console.log('[settings] Settings loaded', { enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings });
  } catch (e) {
    console.warn('[settings] Failed to load settings, using defaults:', e.message);
  }
}

// Initialize settings at startup
loadSettingsFromDisk();

// Settings API to manage AI via n8n toggle and pricing
// Place BEFORE error/404 handlers so routes are reachable
app.get('/api/settings/ai-enabled', (req, res) => {
  try {
    loadSettingsFromDisk();
    res.json({ success: true, enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings/ai-enabled', (req, res) => {
  try {
    const { enabled, webhookUrl, pricing } = req.body || {};
    saveSettings({ enabled, webhookUrl, pricing });
    res.json({ success: true, message: 'Settings saved', enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Load settings at startup
loadSettings();
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
        
        // Suppress AI if this is our own outbound message (initiated by us)
        if (message.fromMe === true) {
          console.log('🤝 Handoff: Suppressing AI reply because message is fromMe (outbound initiated).');
          return; // Do not store or respond to outbound echoes
        }

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

        // Media suppression: if message contains media or non-chat type, we will store and sync but skip AI reply
        const msgType = (message.type || '').toLowerCase();
        const isMediaInbound = !!message.hasMedia || (msgType && msgType !== 'chat' && msgType !== 'text');

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
        
        // If inbound has media, download and attach data URL for UI
        let mediaFields = {};
        try {
          if (message.hasMedia && typeof message.downloadMedia === 'function') {
            const media = await message.downloadMedia();
            if (media && media.data) {
              const mime = media.mimetype || 'application/octet-stream';
              const kind = mime.startsWith('image') ? 'image' : (mime.startsWith('video') ? 'video' : 'file');
              mediaFields = {
                hasMedia: true,
                mediaUrl: `data:${mime};base64,${media.data}`,
                mediaType: kind,
                mimeType: mime,
                fileName: media.filename || undefined,
                caption: message.caption || undefined
              };
            }
          }
        } catch (mediaErr) {
          console.warn('⚠️ Failed to download inbound media:', mediaErr && mediaErr.message);
        }

        // Store conversation with correct parameter order (conversationId, contactName)
        await conversationManager.addMessage({
          id: (message.id && message.id._serialized) || message.id,
          from: message.from,
          body: message.body,
          timestamp: message.timestamp,
          type: message.type,
          ...mediaFields
        }, message.from, contactName);
        
        // Emit to frontend (include media fields for immediate display)
        io.to('whatsapp').emit('new_message', {
          id: (message.id && message.id._serialized) || message.id,
          from: message.from,
          body: message.body,
          timestamp: message.timestamp,
          type: message.type,
          contactName: contactName,
          ...mediaFields
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

        // External webhook relay to n8n only when AI toggle enabled
        if (aiN8nEnabled) {
          try {
            const { normalize } = require('./utils/phoneNormalizer');
            const normalizedPhone = normalize(message.from) || message.from;
            const relayType = (() => {
              const t = (message.type || '').toLowerCase();
              if (isMediaInbound) return 'media';
              if (t === 'chat' || t === 'text') return 'text';
              if (t.includes('location')) return 'location';
              if (t.includes('button')) return 'button';
              if (t.includes('template')) return 'template';
              return 'text';
            })();
            const attachments = (mediaFields && mediaFields.mediaUrl) ? [{
              type: mediaFields.mediaType || 'document',
              url: mediaFields.mediaUrl,
              filename: mediaFields.fileName || undefined
            }] : [];
            const result = await inboundRelay.send({
              phone: normalizedPhone,
              fromName: contactName || 'Unknown Contact',
              message: message.body || '',
              messageType: relayType,
              messageId: (message.id && message.id._serialized) || message.id || '',
              integration: process.env.GHL_LOCATION_ID || 'default',
              timestamp: message.timestamp || Date.now(),
              replyToken: null,
              attachments,
              overrideUrl: n8nWebhookUrlFromSettings || undefined
            });
            if (result.delivered) {
              console.log('📡 Inbound webhook delivered to n8n:', result.status, result.url || n8nWebhookUrlFromSettings);
            } else {
              console.warn('⚠️ Inbound webhook to n8n failed:', result.error, result.url || n8nWebhookUrlFromSettings);
            }
          } catch (relayErr) {
            console.error('❌ Inbound webhook relay error:', relayErr && relayErr.message);
          }
          // Do not generate local AI, n8n will respond via webhook
          return;
        }

        // If media was received or non-text content, do not generate AI reply
        if (isMediaInbound) {
          console.log('🤝 Handoff: Suppressing AI reply due to inbound media/non-text type:', message.type);
          return;
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
            // Helper: structured AI executor
            async function generateStructuredAIReplyLocal({ text, from, contactName, tenantId }) {
              try {
                const PineconeMcpClient = require('./services/pineconeMcpClient');
                const account = { location_id: tenantId || null, namespace: 'default' };
                // Build conversation history
                let conversation_history = [];
                try {
                  const convLocal = await conversationManager.getConversation(from);
                  const msgs = Array.isArray(convLocal?.messages) ? convLocal.messages.slice(-5) : [];
                  conversation_history = msgs.map(m => ({ from: m.from || 'user', body: m.body || '' }));
                } catch (_) {}
                // Plan
                const plan = enhancedAIService.buildStructuredPlan({
                  incoming_message: text,
                  contact: { phone: from },
                  account,
                  conversation_history,
                  pinecone_top_k: 5,
                  ghl_lookup_result: null,
                  uploaded_file_paths: []
                });
                // Execute: GHL lookup
                let contactSummary = { name: contactName || 'Unknown', lead_stage: '', tags: [], last_interaction: '' };
                try {
                  if (ghlService && typeof ghlService.findContactByPhone === 'function') {
                    const ghlContact = await ghlService.findContactByPhone(from);
                    if (ghlContact) {
                      contactSummary = {
                        name: ghlContact.firstName || ghlContact.name || contactSummary.name,
                        lead_stage: ghlContact?.leadStage || ghlContact?.leadStatus || '',
                        tags: Array.isArray(ghlContact?.tags) ? ghlContact.tags : [],
                        last_interaction: ghlContact?.lastActivity || ''
                      };
                    }
                  }
                } catch (e) { console.warn('GHL lookup failed in structured flow:', e.message); }
                // Execute: Pinecone/Embeddings
                let snippets = [];
                try {
                  const pc = new PineconeMcpClient();
                  if (pc && pc.isConfigured()) {
                    const items = await pc.getContext(text, { topK: 5, tenantId });
                    snippets = (items || []).map(it => ({ text: it.content || '', source: it.source || 'pinecone', url_or_path: it.source || '' }));
                  } else {
                    const results = await enhancedAIService.embeddings.retrieve({ query: text, topK: 5, minSimilarity: 0.35, tenantId });
                    snippets = (results || []).map(r => ({ text: r.content || r.text || '', source: r.source || r.category || 'kb', url_or_path: r.source || '' }));
                  }
                } catch (e) { console.warn('Pinecone/Embeddings retrieval failed:', e.message); }
                // Compose
                const businessName = enhancedAIService?.aiPersonality?.company || 'Your Business';
                const ragPrompt = enhancedAIService.composeRagPrompt({
                  incoming_message: text,
                  business_name: businessName,
                  account,
                  snippets,
                  contact_summary: contactSummary,
                  conversation_history
                });
                // LLM
                const context = { messages: conversation_history, type: 'support', llmTag: tenantId ? { tag: tenantId } : undefined };
                const aiReplyLocal = await enhancedAIService.aiService.generateCustomReply(text, ragPrompt, context);
                return aiReplyLocal || null;
              } catch (err) {
                console.error('❌ Structured AI executor error:', err.message);
                return null;
              }
            }
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
            // n8n-first, then local EnhancedAI as fallback
            let aiReply = await forwardToN8nAIReply({
              text: message.body,
              from: message.from,
              contactName,
              tenantId: tId,
              conversationId: message.from,
              messageType: 'text',
              fromMe: false
            });
            if (!aiReply) {
              aiReply = await generateStructuredAIReplyLocal({ text: message.body, from: message.from, contactName, tenantId: tId });
              if (!aiReply) {
                aiReply = await enhancedAIService.generateContextualReply(message.body, message.from, message.from, tId);
              }
            }
          
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

// Settings endpoints for AI toggle (n8n integration)
app.get('/api/settings/ai-enabled', (req, res) => {
  try {
    loadSettings();
    res.json({ success: true, enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/settings/ai-enabled', (req, res) => {
  try {
    const enabled = Boolean(req.body?.enabled);
    const webhookUrl = String(req.body?.webhookUrl || n8nWebhookUrlFromSettings || '').trim();
    const pricingInput = req.body?.pricing || {};
    const pricing = {
      pricePerReply: Number(pricingInput.pricePerReply || 0),
      currency: String(pricingInput.currency || 'INR'),
      freeReplies: Number(pricingInput.freeReplies || 0),
      billingNote: String(pricingInput.billingNote || '')
    };
    saveSettings({ enabled, webhookUrl, pricing });
    res.json({ success: true, enabled: aiN8nEnabled, webhookUrl: n8nWebhookUrlFromSettings, pricing: aiN8nPricing });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
