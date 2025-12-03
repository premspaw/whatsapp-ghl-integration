const fs = require('fs');
const path = require('path');
const axios = require('axios');

class GHLOAuthService {
  constructor() {
    this.clientId = process.env.GHL_OAUTH_CLIENT_ID || '';
    this.clientSecret = process.env.GHL_OAUTH_CLIENT_SECRET || '';
    this.redirectUri = process.env.GHL_OAUTH_REDIRECT_URI || '';
    this.scopes = (process.env.GHL_OAUTH_SCOPES || 'contacts.read conversations.write knowledgebase.read').split(/\s+/).filter(Boolean);
    // Allow overriding endpoints via env if needed
    this.authBase = process.env.GHL_OAUTH_AUTH_BASE || 'https://marketplace.gohighlevel.com/oauth/authorize';
    this.tokenUrl = process.env.GHL_OAUTH_TOKEN_URL || 'https://marketplace.gohighlevel.com/oauth/token';
    this.versionId = process.env.GHL_OAUTH_VERSION_ID || '';
    this.extraParams = process.env.GHL_OAUTH_EXTRA_PARAMS || '';
    this.storageFile = path.join(__dirname, '..', 'data', 'ghl-oauth.json');
    this.tokens = this._loadTokens();
  }

  isConfigured() {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  _loadTokens() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        return JSON.parse(raw || '{}');
      }
    } catch (e) {}
    return {};
  }

  _saveTokens() {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.tokens, null, 2));
    } catch (e) {
      console.warn('⚠️ Failed to persist GHL OAuth tokens:', e.message);
    }
  }

  getAuthorizeUrl({ state = '', scopes = null } = {}) {
    const scopeStr = (scopes && scopes.length ? scopes : this.scopes).join(' ');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopeStr,
      state: state || ''
    });
    if (this.versionId) {
      params.set('version_id', this.versionId);
    }
    const baseUrl = `${this.authBase}?${params.toString()}`;
    // Append any extra params if provided (pre-encoded key=value pairs joined by &)
    const extra = String(this.extraParams || '').trim();
    const url = extra ? `${baseUrl}&${extra}` : baseUrl;
    // Some providers use query params on base authorize URL; keep flexible
    return url;
  }

  async exchangeCodeForToken(code) {
    const payload = {
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri
    };
    const resp = await axios.post(this.tokenUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    const tokenData = resp.data || {};
    // Store by locationId if provided, else use 'default'
    const locationId = tokenData.locationId || process.env.GHL_LOCATION_ID || 'default';
    this.tokens[locationId] = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || null,
      obtained_at: Date.now()
    };
    this._saveTokens();
    return { locationId, ...this.tokens[locationId] };
  }

  async refreshToken(locationId) {
    const entry = this.tokens[locationId];
    if (!entry || !entry.refresh_token) {
      throw new Error('No refresh token found for location');
    }
    const payload = {
      grant_type: 'refresh_token',
      refresh_token: entry.refresh_token,
      client_id: this.clientId,
      client_secret: this.clientSecret
    };
    const resp = await axios.post(this.tokenUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    const tokenData = resp.data || {};
    this.tokens[locationId] = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || entry.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || null,
      obtained_at: Date.now()
    };
    this._saveTokens();
    return { locationId, ...this.tokens[locationId] };
  }

  getStatus() {
    const locations = Object.keys(this.tokens);
    return {
      configured: this.isConfigured(),
      clientId: this.clientId ? `***${String(this.clientId).slice(-4)}` : null,
      redirectUri: this.redirectUri || null,
      scopes: this.scopes,
      locations: locations.map(locId => ({
        locationId: locId,
        hasAccessToken: !!this.tokens[locId]?.access_token,
        obtainedAt: this.tokens[locId]?.obtained_at || null,
        expiresIn: this.tokens[locId]?.expires_in || null
      }))
    };
  }
}

module.exports = GHLOAuthService;
