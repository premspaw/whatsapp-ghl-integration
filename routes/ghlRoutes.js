const express = require('express');
console.log('[ghlRoutes] module loading');
// Try to load optional services; provide safe fallbacks if missing so server can start
let GHLOAuthService;
try {
  GHLOAuthService = require('../services/ghlOAuthService');
} catch (e) {
  console.warn('⚠️ ghlOAuthService not found, using no-op fallback:', e.message);
  GHLOAuthService = class {
    isConfigured() { return false; }
    getAuthorizeUrl() { throw new Error('OAuth not configured'); }
    exchangeCodeForToken() { throw new Error('OAuth not configured'); }
    refreshToken() { throw new Error('OAuth not configured'); }
    getStatus() { return { configured: false, locations: [] }; }
  };
}

module.exports = (ghlService) => {
  const router = express.Router();
  const oauthService = new GHLOAuthService();
  // Lazy-load Supabase repos for context assembly
  let contactRepo, messageRepo;
  try {
    contactRepo = require('../services/db/contactRepo');
    messageRepo = require('../services/db/messageRepo');
  } catch (_) {
    contactRepo = null;
    messageRepo = null;
  }

  // Minimal health endpoint to prevent startup crash
  router.get('/health', (req, res) => {
    res.json({ success: true, service: 'ghl', timestamp: Date.now() });
  });

  // OAuth: get authorize URL
  router.get('/oauth/authorize', (req, res) => {
    console.log('[ghlRoutes] /oauth/authorize mounted');
    try {
      if (!oauthService.isConfigured()) {
        return res.status(400).json({ success: false, error: 'OAuth not configured' });
      }
      const state = req.query.state || '';
      const versionId = req.query.version_id || req.query.versionId || '';
      const url = oauthService.getAuthorizeUrl({ state, versionId });
      res.json({ success: true, authorizeUrl: url });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // OAuth: callback to exchange code for token
  router.get('/oauth/callback', async (req, res) => {
    console.log('[ghlRoutes] /oauth/callback mounted');
    try {
      const code = req.query.code;
      const state = req.query.state || '';
      if (!code) {
        return res.status(400).json({ success: false, error: 'Missing code' });
      }
      if (typeof oauthService.verifyState === 'function') {
        const ok = oauthService.verifyState(state);
        if (!ok) {
          return res.status(400).json({ success: false, error: 'Invalid state' });
        }
      }
      const userType = String(req.query.user_type || 'Location');
      const result = await oauthService.exchangeCodeForToken(code, userType);
      const accept = String(req.headers['accept'] || '');
      if (accept.includes('text/html')) {
        return res.redirect('/oauth-status.html');
      }
      res.json({ success: true, token: { locationId: result.locationId, access_token: result.access_token, refresh_token: result.refresh_token, token_type: result.token_type, expires_in: result.expires_in } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // OAuth: status
  router.get('/oauth/status', (req, res) => {
    console.log('[ghlRoutes] /oauth/status mounted');
    try {
      const status = oauthService.getStatus();
      res.json({ success: true, status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/oauth/token', (req, res) => {
    try {
      const locationId = req.query?.locationId || process.env.GHL_LOCATION_ID || 'default';
      const token = typeof oauthService.getToken === 'function' ? oauthService.getToken(locationId) : null;
      if (!token) return res.status(404).json({ success: false, error: 'Token not found for location' });
      res.json({ success: true, token });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

   // OAuth: list installed locations (Agency token required)
  router.get('/oauth/installedLocations', async (req, res) => {
    try {
      const { companyId, appId, skip, limit, query, isInstalled, versionId, onTrial, planId } = req.query || {};
      if (!companyId || !appId) {
        return res.status(400).json({ success: false, error: 'companyId and appId are required' });
      }
      const authHeader = req.headers['authorization'] || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const data = await ghlService.getInstalledLocations({ companyId, appId, skip, limit, query, isInstalled, versionId, onTrial, planId }, bearer);
      res.json({ success: true, ...data });
    } catch (err) {
      const status = err.response?.status || 500;
      res.status(status).json({ success: false, error: err.response?.data || err.message });
    }
  });

  // OAuth: proxy token endpoint (pass-through to LeadConnector)
  router.post('/oauth/token', async (req, res) => {
    try {
      const GHLOAuthService = require('../services/ghlOAuthService');
      const oauth = new GHLOAuthService();
      const url = oauth.tokenUrl || 'https://services.leadconnectorhq.com/oauth/token';
      const body = req.body || {};
      const params = new URLSearchParams();
      Object.keys(body).forEach((k) => {
        const v = body[k];
        if (v !== undefined && v !== null) params.append(k, String(v));
      });
      const axios = require('axios');
      const resp = await axios.post(url, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' } });
      res.json(resp.data);
    } catch (err) {
      const status = err.response?.status || 500;
      res.status(status).json({ success: false, error: err.response?.data || err.message });
    }
  });

  // OAuth: refresh token
  router.post('/oauth/refresh', async (req, res) => {
    console.log('[ghlRoutes] /oauth/refresh mounted');
    try {
      const locationId = req.body?.locationId || process.env.GHL_LOCATION_ID || 'default';
      const result = await oauthService.refreshToken(locationId);
      res.json({ success: true, token: { locationId: result.locationId, token_type: result.token_type, expires_in: result.expires_in } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Contacts: safe fallback route
  // Returns an empty list when GHL is not configured to avoid 404s in dashboards/tests
  router.get('/contacts', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const isConfigured = !!(ghlService && typeof ghlService.isConfigured === 'function' && ghlService.isConfigured());
      if (!isConfigured && !bearer) {
        return res.json({ success: true, contacts: [], configured: false });
      }
      const contacts = await ghlService.getContacts(bearer);
      res.json({ success: true, contacts, configured: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Optional: Knowledge Base proxy endpoints (use env-configured URLs)
  let GHLKnowledgeService;
  try {
    GHLKnowledgeService = require('../services/ghlKnowledgeService');
    // Normalize different export shapes (CommonJS vs ESM or named export)
    if (GHLKnowledgeService && typeof GHLKnowledgeService !== 'function') {
      if (typeof GHLKnowledgeService.default === 'function') {
        GHLKnowledgeService = GHLKnowledgeService.default;
      } else if (typeof GHLKnowledgeService.GHLKnowledgeService === 'function') {
        GHLKnowledgeService = GHLKnowledgeService.GHLKnowledgeService;
      }
    }
  } catch (e) {
    console.warn('⚠️ ghlKnowledgeService not found, using no-op fallback:', e.message);
    GHLKnowledgeService = class {
      constructor() { this.kbSearchUrl = null; this.kbListUrl = null; }
      isConfigured() { return false; }
      async search() { return []; }
      async list() { return []; }
    };
  }
  let kbService;
  try {
    console.log('[ghlRoutes] typeof GHLKnowledgeService =', typeof GHLKnowledgeService);
    kbService = new GHLKnowledgeService(ghlService);
  } catch (err) {
    console.warn('⚠️ GHLKnowledgeService not constructible, using no-op fallback:', err.message);
    const FallbackKB = class {
      constructor() { this.kbSearchUrl = null; this.kbListUrl = null; }
      isConfigured() { return false; }
      async search() { return []; }
      async list() { return []; }
    };
    kbService = new FallbackKB();
  }
  console.log('[ghlRoutes] GHLKnowledgeService initialized, isConfigured:', typeof kbService.isConfigured === 'function' ? kbService.isConfigured() : false);
  // Simple test endpoint to verify router wiring under /api/ghl/kb/test
  router.get('/kb/test', (req, res) => {
    console.log('[ghlRoutes] /kb/test hit');
    res.json({ success: true, message: 'kb test ok' });
  });
  // Debug KB adapter config
  router.get('/kb/debug', (req, res) => {
    res.json({
      success: true,
      kbSearchUrl: kbService.kbSearchUrl,
      kbListUrl: kbService.kbListUrl,
      isConfigured: kbService.isConfigured()
    });
  });
  // Search KB
  router.post('/kb/search', async (req, res) => {
    console.log('[ghlRoutes] /kb/search mounted');
    try {
      console.log('[ghlRoutes] KB config (search):', {
        kbSearchUrl: kbService.kbSearchUrl,
        kbListUrl: kbService.kbListUrl,
        configured: kbService.isConfigured()
      });
      const query = String(req.body?.query || '').trim();
      if (!query) return res.status(400).json({ success: false, error: 'Query required' });
      if (!kbService.kbSearchUrl) return res.status(400).json({ success: false, error: 'KB search URL not configured' });
      const items = await kbService.search(query, { locationId: req.body?.locationId || process.env.GHL_LOCATION_ID });
      res.json({ success: true, count: items.length, items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  // List KB items
  router.get('/kb/list', async (req, res) => {
    console.log('[ghlRoutes] /kb/list mounted');
    try {
      console.log('[ghlRoutes] KB config (list):', {
        kbSearchUrl: kbService.kbSearchUrl,
        kbListUrl: kbService.kbListUrl,
        configured: kbService.isConfigured()
      });
      if (!kbService.kbListUrl) return res.status(400).json({ success: false, error: 'KB list URL not configured' });
      const items = await kbService.list({ locationId: req.query?.locationId || process.env.GHL_LOCATION_ID });
      res.json({ success: true, count: Array.isArray(items) ? items.length : 0, items });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Upload website into KB (GHL endpoint if configured, else local fallback)
  router.post('/kb/website', async (req, res) => {
    console.log('[ghlRoutes] /kb/website mounted');
    try {
      const url = String(req.body?.url || req.body?.websiteUrl || '').trim();
      const maxDepth = req.body?.maxDepth;
      const category = req.body?.category || 'website';
      const tags = req.body?.tags || [];
      const locationId = req.body?.locationId || process.env.GHL_LOCATION_ID;

      if (!url) return res.status(400).json({ success: false, error: 'URL required' });

      const result = await kbService.uploadWebsite(url, { maxDepth, category, tags, locationId });
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error || 'Upload failed' });
      }
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Upload PDF into KB (by URL) — uses GHL endpoint if configured, else local fallback
  router.post('/kb/pdf', async (req, res) => {
    console.log('[ghlRoutes] /kb/pdf mounted');
    try {
      const url = String(req.body?.url || req.body?.pdfUrl || '').trim();
      const category = req.body?.category || 'documents';
      const tags = req.body?.tags || [];
      const description = req.body?.description || '';
      const locationId = req.body?.locationId || process.env.GHL_LOCATION_ID;

      if (!url) return res.status(400).json({ success: false, error: 'PDF URL required' });

      const result = await kbService.uploadPdf(url, { category, tags, description, locationId });
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error || 'PDF upload failed' });
      }
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Contact metadata by phone (normalized). Includes basic GHL details.
  router.get('/contact/:phone', async (req, res) => {
    try {
      const rawPhone = req.params.phone;
      const normalized = ghlService && typeof ghlService.normalizePhoneNumber === 'function'
        ? ghlService.normalizePhoneNumber(rawPhone)
        : rawPhone;

      if (!normalized) {
        return res.status(400).json({ success: false, error: 'Invalid phone' });
      }

      // Find contact via GHL when configured
      let ghlContact = null;
      let details = null;
      let tags = [];
      let pipelineStage = null;
      const configured = !!(ghlService && typeof ghlService.isConfigured === 'function' && ghlService.isConfigured());
      if (configured && ghlService && typeof ghlService.findContactByPhone === 'function') {
        try {
          ghlContact = await ghlService.findContactByPhone(normalized);
          if (ghlContact && typeof ghlService.getContactDetails === 'function') {
            details = await ghlService.getContactDetails(ghlContact.id);
          }
          tags = (details && details.tags) || (ghlContact && ghlContact.tags) || [];
          pipelineStage = (details && (details.stage || details.pipelineStage)) || null;
        } catch (e) {
          console.warn('⚠️ GHL contact lookup failed:', e.message);
        }
      }

      res.json({
        success: true,
        phone: normalized,
        configured,
        contact: ghlContact,
        details,
        tags,
        pipelineStage
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Context endpoint: assemble GHL metadata + last 3–5 messages from Supabase
  router.get('/context/:phone', async (req, res) => {
    try {
      const rawPhone = req.params.phone;
      const normalized = ghlService && typeof ghlService.normalizePhoneNumber === 'function'
        ? ghlService.normalizePhoneNumber(rawPhone)
        : rawPhone;
      if (!normalized) return res.status(400).json({ success: false, error: 'Invalid phone' });

      const limit = Math.max(3, Math.min(5, Number(req.query.limit || 5)));

      // GHL
      let ghlContact = null;
      let details = null;
      let tags = [];
      let pipelineStage = null;
      const configured = !!(ghlService && typeof ghlService.isConfigured === 'function' && ghlService.isConfigured());
      if (configured && ghlService && typeof ghlService.findContactByPhone === 'function') {
        try {
          ghlContact = await ghlService.findContactByPhone(normalized);
          if (ghlContact && typeof ghlService.getContactDetails === 'function') {
            details = await ghlService.getContactDetails(ghlContact.id);
          }
          tags = (details && details.tags) || (ghlContact && ghlContact.tags) || [];
          pipelineStage = (details && (details.stage || details.pipelineStage)) || null;
        } catch (_) {}
      }

      // Supabase recent messages
      let recent = [];
      let contactRow = null;
      if (contactRepo && messageRepo && typeof contactRepo.findByPhone === 'function') {
        try {
          const phoneE164 = String(normalized).replace('@c.us','');
          contactRow = await contactRepo.findByPhone(phoneE164);
          if (contactRow && typeof messageRepo.getRecentMessagesByContact === 'function') {
            recent = await messageRepo.getRecentMessagesByContact(contactRow.id, limit);
          }
        } catch (e) {
          console.warn('⚠️ Supabase context fetch failed:', e.message);
        }
      }

      res.json({
        success: true,
        phone: normalized,
        configured,
        contact: ghlContact,
        details,
        tags,
        pipelineStage,
        supabase: {
          contact: contactRow,
          lastMessages: recent
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
