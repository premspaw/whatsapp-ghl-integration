const fs = require('fs');
const path = require('path');
const axios = require('axios');

class GHLOAuthService {
  constructor() {
    const clean = (v) => String(v || '').trim().replace(/["'`]/g, '');
    this.clientId = clean(process.env.GHL_OAUTH_CLIENT_ID);
    this.clientSecret = clean(process.env.GHL_OAUTH_CLIENT_SECRET);
    this.redirectUri = clean(process.env.GHL_OAUTH_REDIRECT_URI);
    this.scopes = (clean(process.env.GHL_OAUTH_SCOPES) || 'contacts.read conversations.write knowledgebase.read').replace(/,/g, ' ').split(/\s+/).filter(Boolean);
    this.authBase = clean(process.env.GHL_OAUTH_AUTH_BASE) || 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
    this.tokenUrl = clean(process.env.GHL_OAUTH_TOKEN_URL) || 'https://marketplace.leadconnectorhq.com/oauth/token';
    this.versionId = clean(process.env.GHL_OAUTH_VERSION_ID);
    this.extraParams = clean(process.env.GHL_OAUTH_EXTRA_PARAMS);
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
      fs.mkdirSync(path.dirname(this.storageFile), { recursive: true });
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
      scope: scopeStr
    });
    if (state && String(state).length > 0) {
      params.set('state', state);
    }
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

  getAuthorizeAlternates({ state = '', scopes = null } = {}) {
    const scopeStr = (scopes && scopes.length ? scopes : this.scopes).join(' ');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopeStr
    });
    if (state && String(state).length > 0) params.set('state', state);
    if (this.versionId) params.set('version_id', this.versionId);
    const extra = String(this.extraParams || '').trim();
    const bases = [
      'https://marketplace.gohighlevel.com/oauth/authorize',
      'https://marketplace.leadconnectorhq.com/oauth/authorize'
    ];
    const urls = bases.map(b => {
      const u = `${b}?${params.toString()}`;
      return extra ? `${u}&${extra}` : u;
    });
    return urls;
  }

  async exchangeCodeForToken(code) {
    const payload = {
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri
    };
    if (this.versionId) payload.version_id = this.versionId;
    const params = new URLSearchParams(payload);
    const postForm = async (url) => axios.post(url, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 });
    let resp;
    try {
      resp = await postForm(this.tokenUrl);
    } catch (e) {
      const alts = [];
      const tu = String(this.tokenUrl || '');
      if (tu.includes('marketplace.leadconnectorhq.com')) {
        alts.push('https://marketplace.gohighlevel.com/oauth/token');
        alts.push('https://services.leadconnectorhq.com/oauth/token');
      } else if (tu.includes('marketplace.gohighlevel.com')) {
        alts.push('https://marketplace.leadconnectorhq.com/oauth/token');
        alts.push('https://services.leadconnectorhq.com/oauth/token');
      } else {
        alts.push('https://marketplace.leadconnectorhq.com/oauth/token');
        alts.push('https://marketplace.gohighlevel.com/oauth/token');
      }
      let success = false;
      for (const alt of alts) {
        try {
          resp = await postForm(alt);
          success = true;
          break;
        } catch (_) {}
      }
      if (!success) throw e;
    }
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
    if (this.versionId) payload.version_id = this.versionId;
    const params = new URLSearchParams(payload);
    const postForm = async (url) => axios.post(url, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 });
    let resp;
    try {
      resp = await postForm(this.tokenUrl);
    } catch (e) {
      const alts = [];
      const tu = String(this.tokenUrl || '');
      if (tu.includes('marketplace.leadconnectorhq.com')) {
        alts.push('https://marketplace.gohighlevel.com/oauth/token');
        alts.push('https://services.leadconnectorhq.com/oauth/token');
      } else if (tu.includes('marketplace.gohighlevel.com')) {
        alts.push('https://marketplace.leadconnectorhq.com/oauth/token');
        alts.push('https://services.leadconnectorhq.com/oauth/token');
      } else {
        alts.push('https://marketplace.leadconnectorhq.com/oauth/token');
        alts.push('https://marketplace.gohighlevel.com/oauth/token');
      }
      let success = false;
      for (const alt of alts) {
        try {
          resp = await postForm(alt);
          success = true;
          break;
        } catch (_) {}
      }
      if (!success) throw e;
    }
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
      authBase: this.authBase,
      tokenUrl: this.tokenUrl,
      locations: locations.map(locId => ({
        locationId: locId,
        hasAccessToken: !!this.tokens[locId]?.access_token,
        obtainedAt: this.tokens[locId]?.obtained_at || null,
        expiresIn: this.tokens[locId]?.expires_in || null
      }))
    };
  }

  ping() {
    return 'ok';
  }
}

module.exports = GHLOAuthService;
