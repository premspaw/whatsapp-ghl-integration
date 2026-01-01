const ghlContacts = require('../ghl/contacts');
const ghlConversations = require('../ghl/conversations');
const logger = require('../../utils/logger');
const phoneNormalizer = require('../../utils/phoneNormalizer');

class WhatsAppGHLSync {
    /**
     * Normalize phone number to E.164 format
     */
    normalizePhone(phone) {
        return phoneNormalizer.normalize(phone);
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

            logger.info(`📨 [Sync] Starting ${direction} sync for ${phone}`, {
                locationId,
                rawFrom: from,
                type,
                body: body?.substring(0, 20)
            });

            // Step 1: Get or create contact
            let contact;
            try {
                // Strip suffix (@c.us, @lid) from the fallback name
                const cleanName = (contactPhoneRaw || '').split('@')[0];
                contact = await ghlContacts.getOrCreateContact(locationId, phone, cleanName);
                if (!contact) {
                    logger.error('[Sync] Failed to get/create contact', { locationId, phone });
                    return false;
                }
                logger.info('[Sync] Step 1: Contact Synced', { contactId: contact.id, phone });
            } catch (err) {
                logger.error('[Sync] Contact step failed', { error: err.message, phone });
                throw err;
            }

            // Step 2: Get or create conversation
            let conversation;
            try {
                conversation = await ghlConversations.getOrCreateConversation(locationId, contact.id);
                if (!conversation) {
                    logger.error('[Sync] Failed to get/create conversation', { contactId: contact.id, locationId });
                    return false;
                }
                logger.info('[Sync] Step 2: Conversation Synced', { conversationId: conversation.id });
            } catch (err) {
                logger.error('[Sync] Conversation step failed', { error: err.message, contactId: contact.id });
                throw err;
            }

            // Step 3: Send message to conversation
            let messageText = body;
            let attachments = [];

            if (hasMedia) {
                try {
                    if (typeof whatsappMessage.downloadMedia === 'function') {
                        const media = await whatsappMessage.downloadMedia();
                        if (media) {
                            try {
                                const ghlMedia = require('../ghl/media');
                                const filename = `${Date.now()}_${media.filename || 'media'}.${media.mimetype.split('/')[1]}`;

                                // Upload to GHL Media Storage
                                const publicUrl = await ghlMedia.uploadFile(
                                    locationId,
                                    Buffer.from(media.data, 'base64'),
                                    filename,
                                    media.mimetype
                                );

                                if (publicUrl) {
                                    attachments.push(publicUrl);
                                    logger.info('[Sync] Media uploaded to GHL', { url: publicUrl });
                                }
                            } catch (uploadErr) {
                                logger.error('[Sync] GHL Media upload failed, syncing text only', { error: uploadErr.message });
                            }
                        }
                    }
                } catch (err) {
                    logger.error('[Sync] Error handling media', { error: err.message });
                }
            }

            if (!messageText) {
                if (attachments.length > 0) {
                    messageText = 'Media Attachment';
                } else if (hasMedia) {
                    const mediaType = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Media';
                    messageText = `[${mediaType} Attachment]`;
                }
            }

            // Provide the Custom Provider ID
            const providerId = '69306e4ed1e0a0573cdc2207';

            try {
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

                logger.info(`✅ [Sync] ${direction.toUpperCase()} sync SUCCESS`, {
                    phone,
                    conversationId: conversation.id,
                    contactId: contact.id
                });
            } catch (err) {
                logger.error('[Sync] Message send failed', { error: err.message, conversationId: conversation.id });
                throw err;
            }

            return {
                success: true,
                contactId: contact.id,
                conversationId: conversation.id
            };

        } catch (error) {
            logger.error('❌ [Sync] Sync chain failed', {
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
            const rawId = whatsappContact.id._serialized;
            const phone = this.normalizePhone(rawId);

            // Clean name: Use pushname, or stripped number (no @lid, @c.us)
            const fallbackName = rawId.split('@')[0];
            const name = whatsappContact.pushname || whatsappContact.name || fallbackName;

            logger.info('📇 Syncing WhatsApp contact to GHL', { locationId, phone, name });

            const contact = await ghlContacts.getOrCreateContact(locationId, phone, name);

            logger.info('✅ Contact synced', { contactId: contact.id, locationId });
            return contact;
        } catch (error) {
            logger.error('❌ Failed to sync contact', {
                error: error.message,
                locationId,
                contact: whatsappContact.id?._serialized
            });
            return null;
        }
    }
}

module.exports = new WhatsAppGHLSync();
