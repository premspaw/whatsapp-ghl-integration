const axios = require('axios');
const ghlOAuth = require('./oauth');
const logger = require('../../utils/logger');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

class GHLContactsService {
    async _makeRequest(locationId, method, endpoint, data = null, params = {}) {
        try {
            const accessToken = await ghlOAuth.getAccessToken(locationId);

            const config = {
                method,
                url: `${GHL_API_BASE}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Version': API_VERSION,
                    'Content-Type': 'application/json'
                },
                params: { locationId, ...params }
            };

            if (data) {
                config.data = data;
            }

            logger.info(`📡 GHL Request: ${method} ${endpoint}`, {
                locationId,
                params: config.params,
                url: config.url
            });

            const response = await axios(config);
            return response.data;

        } catch (error) {
            logger.error('GHL Contacts API Error', {
                endpoint,
                locationId,
                error: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Search for contact by phone number
     */
    async searchContactByPhone(locationId, phone) {
        logger.info('Searching for contact', { locationId, phone });

        try {
            // 1. Try searching with exact phone (e.g. +91...)
            let data = await this._makeRequest(locationId, 'GET', '/contacts/', null, {
                query: phone
            });

            if (data.contacts && data.contacts.length > 0) {
                return data.contacts[0];
            }

            // 2. If not found, try normalized (remove +, spaces, dashes)
            const normalizedPhone = phone.replace(/[\s\-+]/g, '');
            if (normalizedPhone !== phone) {
                data = await this._makeRequest(locationId, 'GET', '/contacts/', null, {
                    query: normalizedPhone
                });

                if (data.contacts && data.contacts.length > 0) {
                    return data.contacts[0];
                }
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
            email: contactData.email || '',
            source: 'WhatsApp Integration',
            tags: contactData.tags || ['whatsapp'],
            customFields: contactData.customFields || [],
            locationId: locationId
        };

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
