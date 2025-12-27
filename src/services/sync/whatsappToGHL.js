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
    async syncMessageToGHL(locationId, whatsappMessage) {
        try {
            const { from, to, body, type, timestamp, hasMedia, direction = 'inbound' } = whatsappMessage;

            // Determine which phone number belongs to the contact
            // If inbound, contact is 'from'. If outbound, contact is 'to'.
            const contactPhoneRaw = direction === 'inbound' ? from : to;
            const phone = this.normalizePhone(contactPhoneRaw);

            if (locationId === 'default') {
                logger.warn(`⚠️ [Sync] Skipping ${direction} sync: locationId is "default".`, { phone });
                return { success: false, error: 'unassigned_location' };
            }

            logger.info(`📨 Syncing WhatsApp ${direction} message to GHL`, { locationId, contact: phone, type });

            // Step 1: Get or create contact
            const contact = await ghlContacts.getOrCreateContact(locationId, phone, contactPhoneRaw);

            if (!contact) {
                logger.error('Failed to get/create contact', { locationId, phone });
                return false;
            }

            logger.info('✅ Contact synced', { contactId: contact.id, locationId, phone });

            // Step 2: Get or create conversation
            const conversation = await ghlConversations.getOrCreateConversation(locationId, contact.id);

            if (!conversation) {
                logger.error('Failed to get/create conversation', { contactId: contact.id, locationId });
                return false;
            }

            logger.info('✅ Conversation synced', { conversationId: conversation.id, locationId });

            // Step 3: Send message to conversation
            let messageText = body;
            let attachments = [];

            if (hasMedia) {
                try {
                    if (typeof whatsappMessage.downloadMedia === 'function') {
                        const media = await whatsappMessage.downloadMedia();
                        if (media) {
                            const { supabase } = require('../../config/supabase');
                            const filename = `${locationId}/${Date.now()}_${media.filename || 'media'}.${media.mimetype.split('/')[1]}`;

                            const { data, error } = await supabase.storage
                                .from('whatsapp-media')
                                .upload(filename, Buffer.from(media.data, 'base64'), {
                                    contentType: media.mimetype
                                });

                            if (!error && data) {
                                const { data: publicUrlData } = supabase.storage
                                    .from('whatsapp-media')
                                    .getPublicUrl(filename);

                                attachments.push(publicUrlData.publicUrl);
                                logger.info('📸 Media uploaded', { url: publicUrlData.publicUrl, locationId });
                            }
                        }
                    }
                } catch (err) {
                    logger.error('Error handling media', { error: err.message, locationId });
                }
            }

            if (!messageText && attachments.length > 0) {
                messageText = 'Media Attachment';
            }

            // Provide the Custom Provider ID
            const providerId = '69306e4ed1e0a0573cdc2207';

            await ghlConversations.sendMessage(
                locationId,
                conversation.id,
                messageText,
                'SMS',
                contact.id,
                direction,
                timestamp,
                providerId,
                attachments
            );

            logger.info(`✅ ${direction.toUpperCase()} message synced to GHL`, {
                conversationId: conversation.id,
                contactId: contact.id,
                locationId
            });

            return {
                success: true,
                contactId: contact.id,
                conversationId: conversation.id
            };

        } catch (error) {
            logger.error('❌ Failed to sync message to GHL', {
                error: error.message,
                locationId,
                from: whatsappMessage.from
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Sync contact info from WhatsApp to GHL
     */
    async syncContact(locationId, whatsappContact) {
        try {
            const phone = this.normalizePhone(whatsappContact.id._serialized);
            const name = whatsappContact.pushname || whatsappContact.name || phone;

            logger.info('📇 Syncing WhatsApp contact to GHL', { locationId, phone, name });

            const contact = await ghlContacts.getOrCreateContact(locationId, phone, name);

            logger.info('✅ Contact synced', { contactId: contact.id, locationId });
            return contact;

        } catch (error) {
            logger.error('❌ Failed to sync contact', {
                error: error.message,
                locationId,
                contact: whatsappContact.id._serialized
            });
            return null;
        }
    }
}

module.exports = new WhatsAppGHLSync();
