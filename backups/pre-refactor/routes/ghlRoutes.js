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
      const url = oauthService.getAuthorizeUrl({ state });
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
      if (!code) {
        return res.status(400).json({ success: false, error: 'Missing code' });
      }
      const result = await oauthService.exchangeCodeForToken(code);
      res.json({ success: true, token: { locationId: result.locationId, token_type: result.token_type, expires_in: result.expires_in } });
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

  router.post('/test', async (req, res) => {
    try {
      const apiKey = (req.body?.apiKey || '').trim();
      const locationId = (req.body?.locationId || '').trim();
      if (!apiKey || !locationId) {
        return res.status(400).json({ success: false, error: 'API key and locationId required' });
      }
      const axios = require('axios');
      const baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
      const client = axios.create({
        baseURL: baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
          Authorization: `Bearer ${apiKey}`
        }
      });
      try {
        const response = await client.get('/contacts/', { params: { locationId } });
        const count = Array.isArray(response.data?.contacts) ? response.data.contacts.length : 0;
        return res.json({ success: true, reachable: true, sampleCount: count });
      } catch (e) {
        const msg = (e.response && (e.response.data?.message || e.response.data?.error)) || e.message;
        return res.json({ success: false, reachable: false, error: msg });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Contacts: safe fallback route
  // Returns an empty list when GHL is not configured to avoid 404s in dashboards/tests
  router.get('/contacts', async (req, res) => {
    try {
      if (!ghlService || typeof ghlService.isConfigured !== 'function' || !ghlService.isConfigured()) {
        return res.json({ success: true, contacts: [], configured: false });
      }
      const contacts = await ghlService.getContacts();
      res.json({ success: true, contacts, configured: true });
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
