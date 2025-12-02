const axios = require('axios');
const GHLOAuthService = require('./ghlOAuthService');

class GHLKnowledgeService {
  constructor(ghlService) {
    this.ghlService = ghlService;
    this.oauth = new GHLOAuthService();
    this.baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
    // Optional explicit endpoints for KB operations (recommended until official KB API is confirmed)
    this.kbSearchUrl = process.env.GHL_KB_SEARCH_URL || '';
    this.kbListUrl = process.env.GHL_KB_LIST_URL || '';
    this.kbUploadUrl = process.env.GHL_KB_UPLOAD_URL || '';
    this.kbUploadPdfUrl = process.env.GHL_KB_UPLOAD_PDF_URL || '';
    this.locationId = process.env.GHL_LOCATION_ID || 'default';
    this.versionHeader = process.env.GHL_API_VERSION || '2021-07-28';

    // Fallback to local knowledge endpoints if explicit GHL KB endpoints are not provided
    // This allows the adapter to function against the server's own KB until GHL KB is wired
    if (!this.kbSearchUrl || !this.kbListUrl) {
      const port = process.env.PORT || 3000;
      const localBase = process.env.LOCAL_BASE_URL || `http://localhost:${port}`;
      if (!this.kbSearchUrl) this.kbSearchUrl = `${localBase}/api/knowledge/search`;
      if (!this.kbListUrl) this.kbListUrl = `${localBase}/api/knowledge/list`;
      // Local upload fallback endpoint
      this.localKbUploadUrl = `${localBase}/api/knowledge/website`;
      // Local PDF upload fallback endpoint (server-level alias that supports URL ingestion)
      this.localKbUploadPdfUrl = `${localBase}/api/ghl/kb/pdf`;
    }
  }

  isConfigured() {
    // Consider configured if we have endpoints available (local fallback or GHL)
    // Auth is optional for local fallback endpoints; GHL endpoints may require it
    const hasEndpoints = !!(this.kbSearchUrl || this.kbListUrl);
    return hasEndpoints;
  }

  _getAuthHeaders() {
    // Prefer OAuth token if available for location
    let token = null;
    if (this.oauth && this.oauth.tokens && this.oauth.tokens[this.locationId]?.access_token) {
      token = this.oauth.tokens[this.locationId].access_token;
    } else if (this.ghlService && this.ghlService.apiKey) {
      token = this.ghlService.apiKey;
    }
    return {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
      Version: this.versionHeader,
    };
  }

  async search(query, options = {}) {
    try {
      const q = String(query || '').trim();
      if (!q) return [];
      if (!this.kbSearchUrl) return [];
      const headers = this._getAuthHeaders();
      const resp = await axios.post(this.kbSearchUrl, { query: q, locationId: options.locationId || this.locationId }, { headers });
      const items = Array.isArray(resp.data?.items) ? resp.data.items : [];
      return items.map(i => ({
        title: i.title || i.name || 'KB Item',
        content: i.content || i.text || '',
        source: i.url || i.source || 'ghl-kb',
      }));
    } catch (e) {
      // Fail softly; adapter is optional
      return [];
    }
  }

  async list(options = {}) {
    try {
      if (!this.kbListUrl) return [];
      const headers = this._getAuthHeaders();
      const resp = await axios.get(this.kbListUrl, { headers, params: { locationId: options.locationId || this.locationId } });
      const items = Array.isArray(resp.data?.items) ? resp.data.items : [];
      return items;
    } catch (e) {
      return [];
    }
  }

  // Upload or scrape a website into the Knowledge Base
  async uploadWebsite(url, options = {}) {
    try {
      const u = String(url || '').trim();
      if (!u) return { success: false, error: 'URL required' };

      // Prefer explicit GHL KB upload endpoint if provided, else fallback to local
      const targetUrl = this.kbUploadUrl || this.localKbUploadUrl;
      if (!targetUrl) return { success: false, error: 'KB upload endpoint not configured' };

      const headers = this.kbUploadUrl ? this._getAuthHeaders() : { 'Content-Type': 'application/json' };
      const body = this.kbUploadUrl
        ? {
            url: u,
            category: options.category || 'website',
            tags: options.tags || [],
            locationId: options.locationId || this.locationId,
            maxDepth: Number(options.maxDepth || 2)
          }
        : {
            url: u,
            category: options.category || 'website',
            // Local endpoint accepts comma-separated tags or array; send comma-separated for simplicity
            tags: Array.isArray(options.tags) ? options.tags.join(',') : (options.tags || ''),
            maxDepth: Number(options.maxDepth || 2)
          };

      const resp = await axios.post(targetUrl, body, { headers });
      // Normalize response
      const data = resp.data || {};
      if (this.kbUploadUrl) {
        // Assume GHL returns a status object; pass through minimal fields
        return {
          success: !!(data.success ?? true),
          result: data,
        };
      } else {
        // Local upload returns pagesProcessed and chunks
        return {
          success: !!data.success,
          message: data.message,
          pagesProcessed: data.pagesProcessed || 0,
          chunks: data.chunks || 0
        };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Upload a PDF into the Knowledge Base (by URL)
  async uploadPdf(url, options = {}) {
    try {
      const u = String(url || '').trim();
      if (!u) return { success: false, error: 'PDF URL required' };

      // Prefer explicit GHL KB PDF upload endpoint if provided, else fallback to local server alias
      const targetUrl = this.kbUploadPdfUrl || this.localKbUploadPdfUrl;
      if (!targetUrl) return { success: false, error: 'KB PDF upload endpoint not configured' };

      const headers = this.kbUploadPdfUrl ? this._getAuthHeaders() : { 'Content-Type': 'application/json' };
      const body = this.kbUploadPdfUrl
        ? {
            url: u,
            category: options.category || 'documents',
            tags: options.tags || [],
            locationId: options.locationId || this.locationId,
            description: options.description || ''
          }
        : {
            url: u,
            category: options.category || 'documents',
            // Local endpoint accepts JSON, tags as array is fine; normalize to comma-separated if given
            tags: Array.isArray(options.tags) ? options.tags.join(',') : (options.tags || ''),
            description: options.description || ''
          };

      const resp = await axios.post(targetUrl, body, { headers });
      const data = resp.data || {};
      if (this.kbUploadPdfUrl) {
        return {
          success: !!data.success,
          mode: 'ghl',
          result: data.result || data,
        };
      }
      return {
        success: !!data.success,
        mode: 'local_fallback',
        result: data.result || data
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = GHLKnowledgeService;