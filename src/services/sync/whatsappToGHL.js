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
            const { from, body, type, timestamp, hasMedia } = whatsappMessage;

            // Normalize phone number
            const phone = this.normalizePhone(from);

            if (locationId === 'default') {
                logger.warn('⚠️ [Sync] Skipping inbound sync: locationId is "default". Please link WhatsApp within a specific GHL sub-account context.', { from: phone });
                return { success: false, error: 'unassigned_location' };
            }

            logger.info('📨 Syncing WhatsApp message to GHL', { locationId, from: phone, type });

            // Step 1: Get or create contact
            const contact = await ghlContacts.getOrCreateContact(locationId, phone, from);

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

            logger.info('✅ Conversation synced', { conversation, locationId });

            // Step 3: Send message to conversation
            let messageText = body;

            let attachments = [];
            if (hasMedia) {
                try {
                    // Check if downloadMedia exists (version compatibility)
                    if (typeof whatsappMessage.downloadMedia === 'function') {
                        const media = await whatsappMessage.downloadMedia();
                        if (media) {
                            // Upload to Supabase/S3 to get a public URL
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
                            } else {
                                logger.error('Failed to upload media', { error, locationId });
                            }
                        }
                    } else {
                        logger.warn('downloadMedia not available, media sync skipped');
                        messageText += ' [Media - Download Not Supported]';
                    }
                } catch (err) {
                    logger.error('Error handling media', { error: err.message, locationId });
                    messageText += ' [Media Download Failed: ' + err.message + ']';
                }
            }

            // If text is empty but has attachments, provide a placeholder or use caption
            if (!messageText && attachments.length > 0) {
                messageText = 'Media Attachment';
            }

            // Provide the Custom Provider ID (standard for this app)
            const providerId = '69306e4ed1e0a0573cdc2207';

            await ghlConversations.sendMessage(
                locationId,
                conversation.id,
                messageText,
                'SMS',
                contact.id,
                'inbound',
                timestamp,
                providerId,
                attachments
            );

            logger.info('✅ Message synced to GHL', {
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
