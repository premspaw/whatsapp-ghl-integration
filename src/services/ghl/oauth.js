const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const supabase = require('../../config/supabase');

class GHLOAuthService {
    constructor() {
        this.storageFile = path.join(process.cwd(), 'data', 'ghl-oauth.json');
        this.tokens = this._loadLocalTokens();
    }

    _loadLocalTokens() {
        try {
            if (fs.existsSync(this.storageFile)) {
                return JSON.parse(fs.readFileSync(this.storageFile, 'utf8') || '{}');
            }
        } catch (error) {
            logger.error('Failed to load GHL tokens locally', { error: error.message });
        }
        return {};
    }

    _saveLocalTokens() {
        try {
            // Ensure dir exists
            if (!fs.existsSync(path.dirname(this.storageFile))) {
                fs.mkdirSync(path.dirname(this.storageFile), { recursive: true });
            }
            fs.writeFileSync(this.storageFile, JSON.stringify(this.tokens, null, 2));
        } catch (error) {
            logger.error('Failed to save GHL tokens locally', { error: error.message });
        }
    }

    /**
     * Save tokens to DB (Supabase) and Local File
     */
    async saveTokens(locationId, data) {
        if (!locationId) locationId = 'default';

        const expiresAt = Date.now() + (data.expires_in * 1000);

        // Update local memory & file
        this.tokens[locationId] = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            obtained_at: Date.now(),
            user_type: data.userType,
            company_id: data.companyId
        };
        this._saveLocalTokens();

        // Update Supabase
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('ghl_integrations')
                    .upsert({
                        location_id: locationId,
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        expires_at: expiresAt,
                        user_type: data.userType || 'Location',
                        company_id: data.companyId,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'location_id' });

                if (error) {
                    logger.error('Supabase DB Error saving tokens', error);
                } else {
                    logger.info(`✅ Tokens saved to Database for location ${locationId}`);
                }
            } catch (dbErr) {
                logger.error('Supabase Exception saving tokens', dbErr);
            }
        }
    }

    /**
     * Get tokens with DB priority
     */
    async getTokens(locationId) {
        // 1. Try Supabase
        if (supabase) {
            const { data, error } = await supabase
                .from('ghl_integrations')
                .select('*')
                .eq('location_id', locationId)
                .single();

            if (!error && data) {
                return {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_in: Math.floor((data.expires_at - Date.now()) / 1000), // Approx
                    expires_at: parseInt(data.expires_at),
                    obtained_at: parseInt(data.expires_at) - (86400 * 1000) // Mock obtained_at
                };
            }
        }

        // 2. Fallback to local
        return this.tokens[locationId];
    }

    getAuthorizeUrl(state = '') {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.ghl.clientId,
            redirect_uri: config.ghl.redirectUri,
            scope: 'contacts.readonly contacts.write conversations.write conversations.readonly conversations/message.write locations.readonly',
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

            const { data } = await axios.post(
                'https://services.leadconnectorhq.com/oauth/token',
                params.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const locationId = data.locationId || config.ghl.locationId || 'default';

            await this.saveTokens(locationId, data);

            logger.info(`✅ GHL Token exchanged & saved for location: ${locationId}`);
            return data;
        } catch (error) {
            logger.error('❌ GHL Token Exchange Failed', {
                error: error.message,
                data: error.response?.data
            });
            throw error;
        }
    }

    async getAccessToken(locationId) {
        const token = await this.getTokens(locationId);
        if (!token) {
            // Try default from env if specific location not found
            if (locationId !== 'default' && locationId === config.ghl.locationId) {
                return await this.getAccessToken('default');
            }
            return null;
        }

        // Check if expired (give 5 min buffer)
        // Note: DB stores expires_at (ms), Local stores expires_in + obtained_at
        let expiresAt;
        if (token.expires_at) {
            expiresAt = token.expires_at;
        } else {
            expiresAt = token.obtained_at + (token.expires_in * 1000);
        }

        const now = Date.now();
        if (now > expiresAt - 300000) { // 5 minutes buffer
            logger.info(`🔄 Refreshing GHL token for ${locationId}`);
            return await this.refreshToken(locationId, token.refresh_token);
        }

        return token.access_token;
    }

    async refreshToken(locationId, refreshTokenOverride = null) {
        let refreshToken = refreshTokenOverride;
        if (!refreshToken) {
            const token = await this.getTokens(locationId);
            if (!token) throw new Error(`No token record for ${locationId}`);
            refreshToken = token.refresh_token;
        }

        if (!refreshToken) throw new Error('No refresh token available');

        try {
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: config.ghl.clientId,
                client_secret: config.ghl.clientSecret,
                user_type: 'Location' // Default
            });

            const { data } = await axios.post(
                'https://services.leadconnectorhq.com/oauth/token',
                params.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            // Response usually contains new access_token, refresh_token, etc.
            // locationId might be missing in refresh response, reuse existing
            await this.saveTokens(locationId, data);

            return data.access_token;
        } catch (error) {
            logger.error('❌ GHL Token Refresh Failed', { error: error.message });

            if (error.response?.data?.error === 'invalid_grant') {
                logger.error('🚨 CRITICAL: GHL REFRESH TOKEN INVALID. PLEASE RE-AUTHENTICATE.');
            }

            throw error;
        }
    }
}

module.exports = new GHLOAuthService();
