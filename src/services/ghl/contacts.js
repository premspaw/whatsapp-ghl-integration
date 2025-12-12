const axios = require('axios');
const ghlOAuth = require('./oauth');
const logger = require('../../utils/logger');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

class GHLContactsService {
    constructor() {
        this.locationId = process.env.GHL_LOCATION_ID || 'dXh04Cd8ixM9hnk1IS5b';
    }

    async _makeRequest(method, endpoint, data = null, params = {}) {
        try {
            const accessToken = await ghlOAuth.getAccessToken(this.locationId);

            const config = {
                method,
                url: `${GHL_API_BASE}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Version': API_VERSION,
                    'Content-Type': 'application/json'
                },
                params: { locationId: this.locationId, ...params }
            };

            if (data) {
                config.data = data;
            }

            logger.info(`📡 GHL Request: ${method} ${endpoint}`, {
                locationId: this.locationId,
                params: config.params,
                url: config.url
            });

            const response = await axios(config);
            return response.data;

        } catch (error) {
            logger.error('GHL Contacts API Error', {
                endpoint,
                error: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Search for contact by phone number
     */
    async searchContactByPhone(phone) {
        logger.info('Searching for contact', { phone });

        try {
            // 1. Try searching with exact phone (e.g. +91...)
            let data = await this._makeRequest('GET', '/contacts/', null, {
                query: phone
            });

            if (data.contacts && data.contacts.length > 0) {
                return data.contacts[0];
            }

            // 2. If not found, try normalized (remove +, spaces, dashes)
            const normalizedPhone = phone.replace(/[\s\-+]/g, '');
            if (normalizedPhone !== phone) {
                data = await this._makeRequest('GET', '/contacts/', null, {
                    query: normalizedPhone
                });

                if (data.contacts && data.contacts.length > 0) {
                    return data.contacts[0];
                }
            }

            return null;
        } catch (error) {
            logger.error('Failed to search contact by phone', { phone, error: error.message });
            return null;
        }
    }

    /**
     * Create a new contact
     */
    async createContact(contactData) {
        logger.info('Creating contact', { phone: contactData.phone });

        const payload = {
            firstName: contactData.firstName || contactData.name || 'Unknown',
            lastName: contactData.lastName || '',
            phone: contactData.phone,
            email: contactData.email || '',
            source: 'WhatsApp Integration',
            tags: contactData.tags || ['whatsapp'],
            customFields: contactData.customFields || [],
            locationId: this.locationId
        };

        try {
            const data = await this._makeRequest('POST', '/contacts/', payload);
            logger.info('✅ Contact created', { contactId: data.contact?.id });
            return data.contact;
        } catch (error) {
            logger.error('Failed to create contact', { error: error.message });
            throw error;
        }
    }

    /**
     * Update existing contact
     */
    async updateContact(contactId, updates) {
        logger.info('Updating contact', { contactId });

        try {
            const data = await this._makeRequest('PUT', `/contacts/${contactId}`, updates);
            logger.info('✅ Contact updated', { contactId });
            return data.contact;
        } catch (error) {
            logger.error('Failed to update contact', { contactId, error: error.message });
            throw error;
        }
    }

    /**
     * Get or create contact by phone
     */
    async getOrCreateContact(phone, name = null) {
        // Search for existing contact
        let contact = await this.searchContactByPhone(phone);

        if (contact) {
            logger.info('Contact found', { contactId: contact.id, phone });
            return contact;
        }

        // Create new contact
        logger.info('Contact not found, creating new', { phone });
        contact = await this.createContact({
            phone,
            name: name || phone,
            firstName: name || phone
        });

        return contact;
    }
}

module.exports = new GHLContactsService();
