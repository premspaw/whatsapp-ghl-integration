const axios = require('axios');
const ghlOAuth = require('./oauth');
const logger = require('../../utils/logger');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

class GHLConversationsService {
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

            const response = await axios(config);
            return response.data;

        } catch (error) {
            logger.error('GHL Conversations API Error', {
                endpoint,
                locationId,
                error: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Create a new conversation for a contact
     */
    async createConversation(locationId, contactId) {
        logger.info('Creating conversation', { locationId, contactId });

        try {
            const data = await this._makeRequest(locationId, 'POST', '/conversations/', {
                contactId,
                locationId: locationId
            });

            logger.info('✅ Conversation created', { conversationId: data.conversation?.id, locationId });
            return data.conversation;
        } catch (error) {
            logger.error('Failed to create conversation', { contactId, locationId, error: error.message });
            throw error;
        }
    }

    /**
     * Send a message to a conversation
     */
    async sendMessage(locationId, conversationId, message, type = 'SMS', contactId = null, direction = 'outbound', timestamp = null, conversationProviderId = null, attachments = []) {
        logger.info('Sending message to conversation', { locationId, conversationId, type, direction, conversationProviderId, hasAttachments: attachments.length > 0 });

        const endpoint = direction === 'inbound'
            ? '/conversations/messages/inbound'
            : '/conversations/messages';

        const payload = {
            type: 'SMS', // Force SMS type for external channels usually
            message,
            conversationId
        };

        if (timestamp) {
            // GHL requires ISO 8601 format for historical timestamps
            // Using standard ISO format to ensure maximum compatibility with GHL's V2 API
            const date = new Date(timestamp > 1e10 ? timestamp : timestamp * 1000);
            payload.dateAdded = date.toISOString();
        }

        if (attachments && attachments.length > 0) {
            payload.attachments = attachments;
        }

        if (direction === 'inbound') {
            payload.status = 'unread';
            // Only attach provider ID for inbound
            if (conversationProviderId) {
                payload.conversationProviderId = conversationProviderId;
                payload.type = 'Custom';
            }
        } else {
            // OUTBOUND
            payload.contactId = contactId;
            if (conversationProviderId) {
                payload.conversationProviderId = conversationProviderId;
                payload.type = 'Custom';
            } else {
                // If no provider ID, rely on passed type (default SMS)
                payload.type = type;
            }
        }

        try {
            const data = await this._makeRequest(locationId, 'POST', endpoint, payload);
            logger.info('✅ Message sent', { messageId: data.messageId, direction, locationId });
            return data;
        } catch (error) {
            logger.error('Failed to send message', { conversationId, locationId, error: error.message });
            throw error;
        }
    }

    /**
     * Get conversation by ID
     */
    async getConversation(locationId, conversationId) {
        logger.info('Getting conversation', { locationId, conversationId });

        try {
            const data = await this._makeRequest(locationId, 'GET', `/conversations/${conversationId}`);
            return data.conversation;
        } catch (error) {
            logger.error('Failed to get conversation', { conversationId, locationId, error: error.message });
            throw error;
        }
    }

    /**
     * Search conversations by contact ID
     */
    async getConversationsByContact(locationId, contactId) {
        logger.info('Getting conversations for contact', { locationId, contactId });

        try {
            const data = await this._makeRequest(locationId, 'GET', '/conversations/search', null, {
                contactId
            });
            return data.conversations || [];
        } catch (error) {
            logger.error('Failed to get conversations', { contactId, locationId, error: error.message });
            return [];
        }
    }

    /**
     * Get or create conversation for contact
     */
    async getOrCreateConversation(locationId, contactId) {
        // Check if conversation exists
        const conversations = await this.getConversationsByContact(locationId, contactId);

        if (conversations.length > 0) {
            const activeConv = conversations.find(c => c.status === 'active') || conversations[0];
            logger.info('Conversation found', { conversationId: activeConv.id, locationId });
            return activeConv;
        }

        // Create new conversation
        logger.info('No conversation found, creating new', { contactId, locationId });
        return await this.createConversation(locationId, contactId);
    }
}

module.exports = new GHLConversationsService();
