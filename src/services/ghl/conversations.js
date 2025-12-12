const axios = require('axios');
const ghlOAuth = require('./oauth');
const logger = require('../../utils/logger');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

class GHLConversationsService {
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

            const response = await axios(config);
            return response.data;

        } catch (error) {
            logger.error('GHL Conversations API Error', {
                endpoint,
                error: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Create a new conversation for a contact
     */
    async createConversation(contactId) {
        logger.info('Creating conversation', { contactId });

        try {
            const data = await this._makeRequest('POST', '/conversations/', {
                contactId,
                locationId: this.locationId
            });

            logger.info('✅ Conversation created', { conversationId: data.conversation?.id });
            return data.conversation;
        } catch (error) {
            logger.error('Failed to create conversation', { contactId, error: error.message });
            throw error;
        }
    }

    /**
     * Send a message to a conversation
     */
    async sendMessage(conversationId, message, type = 'Plain', contactId = null, direction = 'outbound') {
        logger.info('Sending message to conversation', { conversationId, type, direction });

        const endpoint = direction === 'inbound'
            ? '/conversations/messages/inbound'
            : '/conversations/messages';

        // Construct payload based on direction
        const payload = {
            type,
            message,
            conversationId
        };

        if (direction === 'inbound') {
            payload.status = 'unread';
        } else {
            payload.contactId = contactId;
        }

        try {
            const data = await this._makeRequest('POST', endpoint, payload);
            logger.info('✅ Message sent', { messageId: data.messageId, direction });
            return data;
        } catch (error) {
            logger.error('Failed to send message', { conversationId, error: error.message });
            throw error;
        }
    }

    /**
     * Get conversation by ID
     */
    async getConversation(conversationId) {
        logger.info('Getting conversation', { conversationId });

        try {
            const data = await this._makeRequest('GET', `/conversations/${conversationId}`);
            return data.conversation;
        } catch (error) {
            logger.error('Failed to get conversation', { conversationId, error: error.message });
            throw error;
        }
    }

    /**
     * Search conversations by contact ID
     */
    async getConversationsByContact(contactId) {
        logger.info('Getting conversations for contact', { contactId });

        try {
            const data = await this._makeRequest('GET', '/conversations/search', null, {
                contactId
            });
            return data.conversations || [];
        } catch (error) {
            logger.error('Failed to get conversations', { contactId, error: error.message });
            return [];
        }
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId, limit = 20) {
        logger.info('Getting messages for conversation', { conversationId });

        try {
            const data = await this._makeRequest('GET', `/conversations/${conversationId}/messages`, null, {
                limit
            });
            return data.messages || [];
        } catch (error) {
            logger.error('Failed to get messages', { conversationId, error: error.message });
            return [];
        }
    }

    /**
     * Get or create conversation for contact
     */
    async getOrCreateConversation(contactId) {
        // Check if conversation exists
        const conversations = await this.getConversationsByContact(contactId);

        if (conversations.length > 0) {
            const activeConv = conversations.find(c => c.status === 'active') || conversations[0];
            logger.info('Conversation found', { conversationId: activeConv.id });
            return activeConv;
        }

        // Create new conversation
        logger.info('No conversation found, creating new', { contactId });
        return await this.createConversation(contactId);
    }
}

module.exports = new GHLConversationsService();
