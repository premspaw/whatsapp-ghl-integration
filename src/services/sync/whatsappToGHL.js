const ghlContacts = require('../ghl/contacts');
const ghlConversations = require('../ghl/conversations');
const logger = require('../../utils/logger');

class WhatsAppGHLSync {
    /**
     * Normalize phone number to E.164 format
     */
    normalizePhone(phone) {
        // Remove all non-numeric characters
        let normalized = phone.replace(/\D/g, '');

        // Add + if not present
        if (!normalized.startsWith('+')) {
            normalized = '+' + normalized;
        }

        return normalized;
    }

    /**
     * Sync WhatsApp message to GHL
     * This creates/updates contact and conversation in GHL
     */
    async syncMessageToGHL(whatsappMessage) {
        try {
            const { from, body, type, timestamp, hasMedia } = whatsappMessage;

            // Normalize phone number
            const phone = this.normalizePhone(from);

            logger.info('📨 Syncing WhatsApp message to GHL', { from: phone, type });

            // Step 1: Get or create contact
            const contact = await ghlContacts.getOrCreateContact(phone, from);

            if (!contact) {
                logger.error('Failed to get/create contact', { phone });
                return false;
            }

            logger.info('✅ Contact synced', { contactId: contact.id, phone });

            // Step 2: Get or create conversation
            const conversation = await ghlConversations.getOrCreateConversation(contact.id);

            if (!conversation) {
                logger.error('Failed to get/create conversation', { contactId: contact.id });
                return false;
            }

            logger.info('✅ Conversation synced', { conversation });

            // Step 3: Send message to conversation
            let messageText = body;

            if (hasMedia) {
                messageText += ' [Media Message]';
            }

            // Provide the Custom Provider ID (from logs) to link this SMS to your app
            const providerId = '69306e4ed1e0a0573cdc2207';
            await ghlConversations.sendMessage(conversation.id, messageText, 'Custom', contact.id, 'inbound', timestamp, providerId);

            logger.info('✅ Message synced to GHL', {
                conversationId: conversation.id,
                contactId: contact.id
            });

            return {
                success: true,
                contactId: contact.id,
                conversationId: conversation.id
            };

        } catch (error) {
            logger.error('❌ Failed to sync message to GHL', {
                error: error.message,
                from: whatsappMessage.from
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync contact info from WhatsApp to GHL
     */
    async syncContact(whatsappContact) {
        try {
            const phone = this.normalizePhone(whatsappContact.id._serialized);
            const name = whatsappContact.pushname || whatsappContact.name || phone;

            logger.info('📇 Syncing WhatsApp contact to GHL', { phone, name });

            const contact = await ghlContacts.getOrCreateContact(phone, name);

            logger.info('✅ Contact synced', { contactId: contact.id });
            return contact;

        } catch (error) {
            logger.error('❌ Failed to sync contact', {
                error: error.message,
                contact: whatsappContact.id._serialized
            });
            return null;
        }
    }
}

module.exports = new WhatsAppGHLSync();
