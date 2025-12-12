const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');

class GHLOAuthService {
    constructor() {
        this.storageFile = path.join(process.cwd(), 'data', 'ghl-oauth.json');
        this.tokens = this._loadTokens();
    }

    _loadTokens() {
        try {
            if (fs.existsSync(this.storageFile)) {
                return JSON.parse(fs.readFileSync(this.storageFile, 'utf8') || '{}');
            }
        } catch (error) {
            logger.error('Failed to load GHL tokens', { error: error.message });
        }
        return {};
    }

    _saveTokens() {
        try {
            fs.writeFileSync(this.storageFile, JSON.stringify(this.tokens, null, 2));
        } catch (error) {
            logger.error('Failed to save GHL tokens', { error: error.message });
        }
    }

    getAuthorizeUrl(state = '') {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.ghl.clientId,
            redirect_uri: config.ghl.redirectUri,
            scope: 'contacts.readonly contacts.write conversations.write conversations.readonly conversations/message.write locations.readonly', // Scopes matching GHL app config
        });
        if (state) params.append('state', state);

        return `https://marketplace.leadconnectorhq.com/oauth/chooselocation?${params.toString()}`;
    }

    async exchangeCodeForToken(code) {
        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: config.ghl.clientId,
                client_secret: config.ghl.clientSecret,
                redirect_uri: config.ghl.redirectUri,
            });

            const response = await axios.post(
                'https://services.leadconnectorhq.com/oauth/token',
                params.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const data = response.data;
            const locationId = data.locationId || config.ghl.locationId || 'default';

            this.tokens[locationId] = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                obtained_at: Date.now(),
            };

            this._saveTokens();
            logger.info(`✅ GHL Token exchanged for location: ${locationId}`);

            return this.tokens[locationId];
        } catch (error) {
            logger.error('❌ GHL Token Exchange Failed', {
                error: error.message,
                data: error.response?.data
            });
            throw error;
        }
    }

    async getAccessToken(locationId) {
        const token = this.tokens[locationId];
        if (!token) return null;

        // Check if expired (give 5 min buffer)
        const now = Date.now();
        const expiresAt = token.obtained_at + (token.expires_in * 1000);

        if (now > expiresAt - 300000) {
            logger.info(`🔄 Refreshing GHL token for ${locationId}`);
            return await this.refreshToken(locationId);
        }

        return token.access_token;
    }

    async refreshToken(locationId) {
        const token = this.tokens[locationId];
        if (!token || !token.refresh_token) throw new Error('No refresh token available');

        try {
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refresh_token,
                client_id: config.ghl.clientId,
                client_secret: config.ghl.clientSecret,
            });

            const response = await axios.post(
                'https://services.leadconnectorhq.com/oauth/token',
                params.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const data = response.data;
            this.tokens[locationId] = {
                ...this.tokens[locationId],
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                obtained_at: Date.now(),
            };

            this._saveTokens();
            return data.access_token;
        } catch (error) {
            logger.error('❌ GHL Token Refresh Failed', { error: error.message });
            
            if (error.response?.data?.error === 'invalid_grant') {
                logger.error('🚨 CRITICAL: GHL REFRESH TOKEN INVALID. PLEASE RE-AUTHENTICATE USING THE LINK.');
            }
            
            throw error;
        }
    }
}

module.exports = new GHLOAuthService();
