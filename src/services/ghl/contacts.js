const axios = require('axios');
const ghlOAuth = require('./oauth');
const logger = require('../../utils/logger');

const GHL_API_BASE_V2 = 'https://services.leadconnectorhq.com';
const GHL_API_BASE_V1 = 'https://rest.gohighlevel.com/v1';
const API_VERSION = '2021-07-28';

class GHLContactsService {
    async _makeRequest(locationId, method, endpoint, data = null, params = {}) {
        try {
            // Use getAccessToken to ensure automatic refresh
            const accessToken = await ghlOAuth.getAccessToken(locationId);
            if (!accessToken) throw new Error(`No access token found for location ${locationId}`);

            // Fetch full token metadata for userType check (legacy fallback)
            const tokenData = await ghlOAuth.getTokens(locationId);

            // Check if using Legacy API Key
            if (tokenData && (tokenData.user_type === 'ApiKey' || tokenData.type === 'ApiKey')) {
                return this._makeRequestV1(accessToken, method, endpoint, data, params);
            }

            const config = {
                method,
                url: `${GHL_API_BASE_V2}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Version': API_VERSION,
                    'Content-Type': 'application/json'
                },
                params: { locationId, ...params }
            };

            if (data) config.data = data;

            logger.info(`📡 GHL Request (V2): ${method} ${endpoint}`, { locationId });
            const response = await axios(config);
            return response.data;

        } catch (error) {
            this._handleError(error, locationId, endpoint);
            throw error;
        }
    }

    async _makeRequestV1(apiKey, method, endpoint, data, params) {
        // Map V2 endpoints to V1 if necessary, or assume caller knows V1 structure?
        // For simplicity, we'll try to map common ones or just pass through.
        // V1 Contacts: /contacts

        // Remove leading slash for consistency if needed, but V1 base has no trailing slash
        const url = `${GHL_API_BASE_V1}${endpoint}`;

        const config = {
            method,
            url,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            params // V1 usually doesn't need locationId in params if API Key is location-specific
        };

        if (data) config.data = data;

        logger.info(`📡 GHL Request (V1): ${method} ${endpoint}`);
        const response = await axios(config);
        return response.data;
    }

    _handleError(error, locationId, endpoint) {
        logger.error('GHL Contacts API Error', {
            endpoint,
            locationId,
            error: error.message,
            response: error.response?.data
        });
    }

    /**
     * Get contact by ID
     */
    async getContact(locationId, contactId) {
        logger.info('Getting contact by ID', { locationId, contactId });
        try {
            const data = await this._makeRequest(locationId, 'GET', `/contacts/${contactId}`);
            return data.contact;
        } catch (error) {
            logger.error('Failed to get contact', { locationId, contactId, error: error.message });
            // If 404, maybe return null? For now throw to let caller handle
            throw error;
        }
    }

    /**
     * Search for contact by phone number with fallbacks
     */
    async searchContactByPhone(locationId, phone) {
        logger.info('Searching for contact', { locationId, phone });

        try {
            // 1. Try raw search (usually starts with +)
            let data = await this._makeRequest(locationId, 'GET', '/contacts/', null, { query: phone });
            if (data.contacts && data.contacts.length > 0) return data.contacts[0];

            // 2. Try without '+' (GHL sometimes stores numbers without prefix)
            const withoutPlus = phone.replace('+', '');
            if (withoutPlus !== phone) {
                data = await this._makeRequest(locationId, 'GET', '/contacts/', null, { query: withoutPlus });
                if (data.contacts && data.contacts.length > 0) return data.contacts[0];
            }

            // 3. Try normalized (digits only)
            const digitsOnly = phone.replace(/\D/g, '');
            if (digitsOnly && digitsOnly !== phone && digitsOnly !== withoutPlus) {
                data = await this._makeRequest(locationId, 'GET', '/contacts/', null, { query: digitsOnly });
                if (data.contacts && data.contacts.length > 0) return data.contacts[0];
            }

            return null;
        } catch (error) {
            logger.error('Failed to search contact by phone', { locationId, phone, error: error.message });
            return null;
        }
    }

    /**
     * Create a new contact
     */
    async createContact(locationId, contactData) {
        logger.info('Creating contact', { locationId, phone: contactData.phone });

        const payload = {
            firstName: contactData.firstName || contactData.name || 'Unknown',
            lastName: contactData.lastName || '',
            phone: contactData.phone,
            source: 'WhatsApp Integration',
            tags: contactData.tags || ['whatsapp'],
            customFields: contactData.customFields || [],
            locationId: locationId
        };

        if (contactData.email) {
            payload.email = contactData.email;
        }

        try {
            const data = await this._makeRequest(locationId, 'POST', '/contacts/', payload);
            logger.info('✅ Contact created', { contactId: data.contact?.id, locationId });
            return data.contact;
        } catch (error) {
            logger.error('Failed to create contact', { locationId, error: error.message });
            throw error;
        }
    }

    /**
     * Update existing contact
     */
    async updateContact(locationId, contactId, updates) {
        logger.info('Updating contact', { locationId, contactId });

        try {
            const data = await this._makeRequest(locationId, 'PUT', `/contacts/${contactId}`, updates);
            logger.info('✅ Contact updated', { contactId, locationId });
            return data.contact;
        } catch (error) {
            logger.error('Failed to update contact', { locationId, contactId, error: error.message });
            throw error;
        }
    }

    /**
     * Get or create contact by phone
     */
    async getOrCreateContact(locationId, phone, name = null) {
        // Search for existing contact
        let contact = await this.searchContactByPhone(locationId, phone);

        if (contact) {
            logger.info('Contact found', { contactId: contact.id, locationId, phone });
            return contact;
        }

        // Create new contact
        logger.info('Contact not found, creating new', { locationId, phone });
        contact = await this.createContact(locationId, {
            phone,
            name: name || phone,
            firstName: name || phone
        });

        return contact;
    }
}

module.exports = new GHLContactsService();
