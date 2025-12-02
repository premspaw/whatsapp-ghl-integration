const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

class GHLOAuthService {
  constructor() {
    this.clientId = process.env.GHL_OAUTH_CLIENT_ID || '';
    this.clientSecret = process.env.GHL_OAUTH_CLIENT_SECRET || '';
    this.redirectUri = process.env.GHL_OAUTH_REDIRECT_URI || '';
    this.scopes = (process.env.GHL_OAUTH_SCOPES || 'contacts.read conversations.write knowledgebase.read').split(/\s+/).filter(Boolean);
    this.appSharedSecret = process.env.GHL_APP_SHARED_SECRET || '';
    this.versionId = process.env.GHL_OAUTH_VERSION_ID || '';

    // Respect env auth base as-is; default to GoHighLevel marketplace if not provided
    const envAuthBase = process.env.GHL_OAUTH_AUTH_BASE;
    this.authBase = envAuthBase || 'https://marketplace.gohighlevel.com/oauth/authorize';

    // Fix: Force correct API endpoint if env var has the old marketplace URL or is missing
    const envTokenUrl = process.env.GHL_OAUTH_TOKEN_URL;
    if (envTokenUrl && envTokenUrl.includes('marketplace.gohighlevel.com/oauth/token')) {
      console.log('Fixing incorrect GHL_OAUTH_TOKEN_URL from env');
      this.tokenUrl = 'https://services.leadconnectorhq.com/oauth/token';
    } else {
      this.tokenUrl = envTokenUrl || 'https://services.leadconnectorhq.com/oauth/token';
    }

    console.log('GHLOAuthService config:', { clientId: this.clientId, redirectUri: this.redirectUri, tokenUrl: this.tokenUrl });
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
    } catch (e) { }
    return {};
  }

  _saveTokens() {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.tokens, null, 2));
    } catch (e) {
      console.warn('⚠️ Failed to persist GHL OAuth tokens:', e.message);
    }
  }

  getAuthorizeUrl({ state = '', scopes = null, versionId = '' } = {}) {
    const scopeStr = (scopes && scopes.length ? scopes : this.scopes).join(' ');
    const finalState = state || this._generateState();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopeStr,
      state: finalState || ''
    });
    const vid = versionId || this.versionId;
    if (vid) params.append('version_id', vid);
    const url = `${this.authBase}?${params.toString()}`;
    return url;
  }

  async exchangeCodeForToken(code, userType = 'Location') {
    const payload = {
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      user_type: userType
    };

    // DEBUG LOGGING
    try {
      const logData = `\n[${new Date().toISOString()}] Token Exchange:\nURL: ${this.tokenUrl}\nPayload: ${JSON.stringify(payload, null, 2)}\n`;
      fs.appendFileSync(path.join(__dirname, '..', 'oauth-debug.log'), logData);
    } catch (_) { }

    try {
      // Send as application/x-www-form-urlencoded
      const params = new URLSearchParams(payload);
      const resp = await axios.post(this.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const tokenData = resp.data || {};

      // DEBUG LOGGING
      try {
        fs.appendFileSync(path.join(__dirname, '..', 'oauth-debug.log'), `Success: ${JSON.stringify(tokenData, null, 2)}\n`);
      } catch (_) { }

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
    } catch (error) {
      // DEBUG LOGGING
      try {
        const errInfo = {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        };
        fs.appendFileSync(path.join(__dirname, '..', 'oauth-debug.log'), `Error: ${JSON.stringify(errInfo, null, 2)}\n`);
      } catch (_) { }
      throw error;
    }
  }

  _generateState() {
    try {
      if (!this.appSharedSecret) return '';
      const ts = Date.now();
      const nonce = crypto.randomBytes(8).toString('hex');
      const base = `${this.clientId}|${this.redirectUri}|${ts}|${nonce}`;
      const sig = crypto.createHmac('sha256', this.appSharedSecret).update(base).digest('hex');
      return Buffer.from(JSON.stringify({ ts, nonce, sig })).toString('base64url');
    } catch (_) {
      return '';
    }
  }

  verifyState(state) {
    try {
      if (!this.appSharedSecret) return true; // disabled
      if (!state) return true; // allow provider flows without state
      const raw = Buffer.from(state, 'base64url').toString('utf8');
      const parsed = JSON.parse(raw);
      const { ts, nonce, sig } = parsed || {};
      if (!ts || !nonce || !sig) return false;
      // Allow 10 minutes clock skew
      if (Math.abs(Date.now() - Number(ts)) > 10 * 60 * 1000) return false;
      const base = `${this.clientId}|${this.redirectUri}|${ts}|${nonce}`;
      const expected = crypto.createHmac('sha256', this.appSharedSecret).update(base).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)));
    } catch (_) {
      return false;
    }
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

  getToken(locationId) {
    const lid = locationId || process.env.GHL_LOCATION_ID || 'default';
    const entry = this.tokens[lid] || null;
    if (!entry) return null;
    return { locationId: lid, ...entry };
  }
}

module.exports = GHLOAuthService;
