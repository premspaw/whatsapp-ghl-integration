const axios = require('axios');
const { normalize: normalizePhone } = require('../utils/phoneNormalizer');

class GHLService {
  constructor() {
    // Support both GHL_API_KEY and LEADCONNECTOR_API_KEY for flexibility
    this.apiKey = process.env.GHL_API_KEY || process.env.LEADCONNECTOR_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;
    this.baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
    this.channelMode = (process.env.GHL_CHANNEL_MODE || 'whatsapp').toLowerCase();
    this.cacheTTL = parseInt(process.env.GHL_CACHE_TTL_MS || '900000'); // 15m default
    this.contactCache = new Map(); // key: contact:<id> -> { value, expiresAt }
    this.opportunityCache = new Map(); // key: opp:<contactId>
    this.convCache = new Map(); // key: conv:<contactId>
    
    // Build headers conditionally to avoid sending "Bearer undefined"
    const headers = {
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers
    });
  }

  // Helper function to normalize phone numbers for GHL API
  normalizePhoneNumber(phone) {
    return normalizePhone(phone);
  }

  async getContacts() {
    try {
      if (!this.isConfigured()) {
        // In non-configured environments, return an empty list instead of throwing.
        // This prevents noisy error logs in routes that try to enrich conversations.
        console.warn('GHL not configured - returning empty contacts list');
        return [];
      }
      
      // Use the correct GHL API endpoint format
      const response = await this.client.get('/contacts/', {
        params: {
          locationId: this.locationId
        }
      });
      
      return response.data.contacts || response.data || [];
    } catch (error) {
      console.error('Error fetching GHL contacts:', error.response?.data || error.message);
      throw error;
    }
  }

  async getContactById(contactId) {
    try {
      const cacheKey = `contact:${contactId}`;
      const cached = this.getFromCache(this.contactCache, cacheKey);
      if (cached) return cached;
      const response = await this.client.get(`/contacts/${contactId}`);
      const contact = response.data.contact;
      this.setCache(this.contactCache, cacheKey, contact);
      return contact;
    } catch (error) {
      console.error('Error fetching GHL contact:', error.response?.data || error.message);
      throw error;
    }
  }

  async createContact(contactData) {
    try {
      // Normalize phone number before creating contact
      const normalizedPhone = this.normalizePhoneNumber(contactData.phone);
      if (!normalizedPhone) {
        throw new Error('Invalid phone number format');
      }

      // Enhanced contact data with WhatsApp-specific fields
      const enhancedContactData = {
        ...contactData,
        phone: normalizedPhone,
        firstName: contactData.firstName || contactData.name || 'WhatsApp Contact',
        lastName: contactData.lastName || '',
        email: contactData.email || undefined, // Don't send empty string, GHL rejects it
        source: contactData.source || 'WhatsApp Integration',
        tags: contactData.tags || ['WhatsApp', 'AI Assistant'],
        // Remove customFields for now - GHL is rejecting it
        // customFields can be added later via separate API call if needed
        locationId: this.locationId
      };
      
      // Remove email field if it's empty
      if (!enhancedContactData.email) {
        delete enhancedContactData.email;
      }

      const response = await this.client.post(`/contacts/`, enhancedContactData);
      console.log('✅ Enhanced contact created in GHL:', response.data.contact.id);
      return response.data.contact;
    } catch (error) {
      // Handle "contact already exists" case by trying to find the existing contact
      if (error.response?.data?.message && error.response.data.message.includes('already exists')) {
        console.log('✅ Contact already exists, finding existing contact');
        const normalizedPhone = this.normalizePhoneNumber(contactData.phone);
        const existingContact = await this.findContactByPhone(normalizedPhone);
        if (existingContact) {
          // Update existing contact with WhatsApp info
          await this.updateContactWithWhatsAppInfo(existingContact.id, contactData);
          return existingContact;
        }
      }
      console.error('Error creating GHL contact:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateContact(contactId, contactData) {
    try {
      const response = await this.client.put(`/contacts/${contactId}`, contactData);
      return response.data.contact;
    } catch (error) {
      console.error('Error updating GHL contact:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateContactWithWhatsAppInfo(contactId, whatsappData) {
    try {
      const updateData = {
        customFields: {
          whatsapp_connected: true,
          last_whatsapp_message: new Date().toISOString(),
          whatsapp_source: 'AI Integration'
        },
        tags: ['WhatsApp', 'AI Assistant']
      };

      // Add name if available from WhatsApp
      if (whatsappData.name) {
        updateData.firstName = whatsappData.name;
      }

      const response = await this.client.put(`/contacts/${contactId}`, updateData);
      console.log('✅ Updated contact with WhatsApp info:', contactId);
      return response.data.contact;
    } catch (error) {
      console.error('Error updating contact with WhatsApp info:', error.response?.data || error.message);
      throw error;
    }
  }

  async getConversations(contactId) {
    try {
      const cacheKey = `conv:${contactId}`;
      const cached = this.getFromCache(this.convCache, cacheKey);
      if (cached) return cached;
      const response = await this.client.get('/conversations/search', {
        params: {
          contactId: contactId,
          locationId: this.locationId
        }
      });
      const conversations = response.data.conversations || response.data || [];
      this.setCache(this.convCache, cacheKey, conversations);
      return conversations;
    } catch (error) {
      console.error('Error fetching GHL conversations:', error.response?.data || error.message);
      throw error;
    }
  }

  async createConversation(conversationData) {
    try {
      // Use the proper GHL Conversations API endpoint for creating conversations
      const response = await this.client.post('/conversations/', {
        contactId: conversationData.contactId,
        locationId: this.locationId,
        // Some deployments reject uppercase 'SMS'; prefer lowercase or omit
        type: this.channelMode === 'whatsapp' ? 'whatsapp' : 'sms',
        status: conversationData.status || 'active',
        phoneNumber: conversationData.phoneNumber
      });
      return response.data.conversation;
    } catch (error) {
      // Handle "conversation already exists" case
      if (error.response?.data?.message === 'Conversation already exists') {
        console.log('✅ Conversation already exists, using existing conversation');
        // Return the existing conversation ID from the error response
        return {
          id: error.response.data.conversationId,
          contactId: conversationData.contactId,
          type: this.channelMode === 'whatsapp' ? 'whatsapp' : 'sms',
          status: 'active',
          provider: 'whatsapp',
          phoneNumber: conversationData.phoneNumber
        };
      }
      console.error('Error creating GHL conversation:', error.response?.data || error.message);
      throw error;
    }
  }

  async addMessageToConversation(conversationId, messageData) {
    try {
      // Use the proper GHL Conversations API endpoint for adding messages
      const response = await this.client.post('/conversations/messages', {
        conversationId: conversationId,
        message: messageData.message,
        // GHL expects a valid enum for message type; use 'SMS' for phone/WhatsApp flows
        type: messageData.type || 'SMS',
        direction: messageData.direction || 'inbound',
        locationId: this.locationId
      });
      return response.data.message;
    } catch (error) {
      console.error('Error adding message to GHL conversation:', error.response?.data || error.message);
      throw error;
    }
  }

  async addInboundMessage(contactId, messageData, conversationId = null) {
    try {
      // Skip posting if there is no message content or attachments
      const hasMessage = !!(messageData && (messageData.message || messageData.body) && String(messageData.message || messageData.body).trim());
      const hasAttachments = !!(messageData && (messageData.attachments || messageData.files) && (messageData.attachments?.length || messageData.files?.length));
      if (!hasMessage && !hasAttachments) {
        console.log('  ℹ️  Skipping inbound GHL post: no message or attachments');
        return { success: true, skipped: true, reason: 'empty_message' };
      }
      // For inbound messages from customer, we need to use the contact's phone number
      // GHL determines direction based on the FROM field
      
      // Get contact details to get phone number
      let contactPhone = null;
      try {
        const contact = await this.getContactById(contactId);
        contactPhone = contact?.phone || contact?.phoneNumber;
      } catch (e) {
        console.log('  ℹ️  Could not fetch contact phone, using contactId');
      }

      const payload = {
        contactId: contactId,
        message: messageData.message || messageData.body,
        html: messageData.message || messageData.body,
        locationId: this.locationId,
        // Explicitly mark inbound direction to avoid ambiguity
        direction: 'inbound',
        // Key: Set FROM to contact's phone for inbound (customer) messages
        from: contactPhone || contactId,
        // Add sender name for display
        senderName: messageData.senderName || 'Customer'
      };

      // Add conversation ID if provided
      if (conversationId) {
        payload.conversationId = conversationId;
      }

      // Add timestamp if provided
      if (messageData.timestamp) {
        payload.dateAdded = messageData.timestamp;
      }

      // Add metadata with profile info
      payload.meta = {
        source: 'whatsapp_integration',
        direction: 'inbound',
        senderType: 'customer',
        ...(messageData && messageData.meta && typeof messageData.meta === 'object' ? messageData.meta : {})
      };

      console.log('📤 GHL inbound payload:', {
        contactId: payload.contactId,
        conversationId: payload.conversationId,
        direction: payload.direction,
        hasHtml: !!payload.html,
        hasMessage: !!payload.message
      });
      const response = await this.client.post('/conversations/messages', payload);
      return response.data;
    } catch (error) {
      // Check if it's a duplicate message error
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('  ℹ️  Message already exists in GHL, skipping...');
        return { success: true, duplicate: true };
      }
      console.error('Error adding inbound message to GHL:', error.response?.data || error.message);
      throw error;
    }
  }

  async addOutboundMessage(contactId, messageData, conversationId = null) {
    try {
      // Skip posting if there is no message content or attachments
      const hasMessage = !!(messageData && (messageData.message || messageData.body) && String(messageData.message || messageData.body).trim());
      const hasAttachments = !!(messageData && (messageData.attachments || messageData.files) && (messageData.attachments?.length || messageData.files?.length));
      if (!hasMessage && !hasAttachments) {
        console.log('  ℹ️  Skipping outbound GHL post: no message or attachments');
        return { success: true, skipped: true, reason: 'empty_message' };
      }
      // For outbound messages (from AI/Agent), we DON'T set FROM field
      // This tells GHL it's from the location/business
      const payload = {
        contactId: contactId,
        message: messageData.message || messageData.body,
        html: messageData.message || messageData.body,
        locationId: this.locationId,
        direction: 'outbound', // Explicitly set outbound for AI/Agent messages
        // Add sender name to show it's from AI
        senderName: 'AI Assistant',
        userId: messageData.userId || null // If agent sent it, include their userId
      };

      // Add conversation ID if provided
      if (conversationId) {
        payload.conversationId = conversationId;
      }

      // Add timestamp if provided
      if (messageData.timestamp) {
        payload.dateAdded = messageData.timestamp;
      }

      // Add metadata with sender info
      payload.meta = {
        source: 'whatsapp_integration',
        direction: 'outbound',
        senderType: 'ai_assistant',
        sentBy: 'WhatsApp AI',
        ...(messageData && messageData.meta && typeof messageData.meta === 'object' ? messageData.meta : {})
      };

      console.log('📤 GHL outbound payload:', {
        contactId: payload.contactId,
        conversationId: payload.conversationId,
        direction: payload.direction,
        hasHtml: !!payload.html,
        hasMessage: !!payload.message
      });
      const response = await this.client.post('/conversations/messages', payload);
      return response.data;
    } catch (error) {
      // Check if it's a duplicate message error
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log('  ℹ️  Message already exists in GHL, skipping...');
        return { success: true, duplicate: true };
      }
      console.error('Error adding outbound message to GHL:', error.response?.data || error.message);
      throw error;
    }
  }

  async syncConversation(whatsappConversation) {
    try {
      // Use the centralized phone normalization method
      const normalizedPhone = this.normalizePhoneNumber(whatsappConversation.phone);
      
      if (!normalizedPhone) {
        console.error('❌ Invalid phone number, skipping sync:', whatsappConversation.phone);
        return null;
      }

      console.log('🔄 Syncing WhatsApp conversation to GHL:', normalizedPhone);
      
      // Find or create contact in GHL
      let contact = await this.findContactByPhone(normalizedPhone);
      
      if (!contact) {
        console.log('📝 Creating new contact in GHL:', normalizedPhone);
        contact = await this.createContact({
          phone: normalizedPhone,
          firstName: whatsappConversation.contactName || whatsappConversation.name || 'WhatsApp Contact',
          source: 'WhatsApp Integration'
        });
      } else {
        console.log('✅ Contact found in GHL:', contact.id);
        // Only update if the contact name is "Unknown Contact" or empty
        if (whatsappConversation.contactName && 
            whatsappConversation.contactName !== 'Unknown Contact' && 
            (contact.firstName === 'Unknown Contact' || !contact.firstName)) {
          await this.updateContactWithWhatsAppInfo(contact.id, {
            name: whatsappConversation.contactName
          });
        }
      }

      // Find or create conversation in GHL
      let conversation = await this.findConversationByContact(contact.id);
      
      if (!conversation) {
        console.log('📝 Creating new conversation in GHL');
        conversation = await this.createConversation({
          contactId: contact.id,
          // Prefer lowercase for type when creating conversations
          type: 'sms',
          status: 'active',
          phoneNumber: normalizedPhone
        });
      } else {
        console.log('✅ Conversation found in GHL:', conversation.id);
      }

      // Only sync NEW messages (not already synced to GHL)
      const messages = whatsappConversation.messages || [];
      const lastSyncedIndex = whatsappConversation.lastSyncedMessageId || -1;
      
      // Get only messages after the last synced one
      const newMessages = messages.filter((msg, index) => index > lastSyncedIndex);
      
      if (newMessages.length === 0) {
        console.log(`📨 No new messages to sync (already synced up to message ${lastSyncedIndex})`);
        return { contact, conversation, syncedCount: 0 };
      }
      
      console.log(`📨 Syncing ${newMessages.length} NEW messages (total: ${messages.length}, last synced: ${lastSyncedIndex})`);

      let syncedCount = 0;
      for (const message of newMessages) {
        try {
          const isInbound = message.from === 'user' || message.from === 'customer';
          
          // Get contact name for display
          const contactName = contact.firstName || contact.name || whatsappConversation.contactName || 'Customer';
          
          const messageData = {
            message: message.body,
            // Omit type to avoid enum validation 422s; GHL infers from conversation
            timestamp: new Date(message.timestamp * 1000).toISOString(), // Convert unix to ISO
            senderName: isInbound ? contactName : 'AI Assistant', // Set sender name
            meta: {
              source: 'whatsapp',
              provider: 'custom_whatsapp',
              original_from: message.from,
              message_id: message.id,
              contact_name: contactName
            }
          };

          if (isInbound) {
            await this.addInboundMessage(contact.id, messageData, conversation.id);
          } else {
            await this.addOutboundMessage(contact.id, messageData, conversation.id);
          }
          
          syncedCount++;
          console.log(`  ✅ Message ${syncedCount} synced (${isInbound ? 'INBOUND' : 'OUTBOUND'}): ${message.body.substring(0, 50)}...`);
        } catch (msgError) {
          console.error('  ❌ Error syncing message:', msgError.response?.data || msgError.message);
        }
      }
      
      // Update the last synced message index
      whatsappConversation.lastSyncedMessageId = messages.length - 1;

      console.log('✅ Conversation synced successfully to GHL');
      return { contact, conversation };
    } catch (error) {
      console.error('❌ Error syncing conversation to GHL:', error);
      throw error;
    }
  }

  async findContactByPhone(phone) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      if (!normalizedPhone) {
        return null;
      }
      
      const contacts = await this.getContacts();
      return contacts.find(contact => {
        const contactPhone = this.normalizePhoneNumber(contact.phone);
        return contactPhone === normalizedPhone;
      });
    } catch (error) {
      console.error('Error finding contact by phone:', error);
      return null;
    }
  }

  async findConversationByContact(contactId) {
    try {
      const conversations = await this.getConversations(contactId);
      return conversations.find(conv => conv.type === 'SMS' || conv.type === 'TYPE_PHONE');
    } catch (error) {
      console.error('Error finding conversation by contact:', error);
      return null;
    }
  }

  async getConversationById(conversationId) {
    try {
      const response = await this.client.get(`/conversations/${conversationId}`);
      return response.data.conversation;
    } catch (error) {
      console.error('Error fetching GHL conversation by ID:', error.response?.data || error.message);
      throw error;
    }
  }

  async getConversationMessages(conversationId) {
    try {
      const response = await this.client.get(`/conversations/${conversationId}/messages`);
      return response.data.messages || response.data || [];
    } catch (error) {
      console.error('Error fetching GHL conversation messages:', error.response?.data || error.message);
      throw error;
    }
  }

  async searchConversations(searchParams) {
    try {
      const params = {
        locationId: this.locationId,
        ...searchParams
      };
      const response = await this.client.get('/conversations/search', { params });
      return response.data.conversations || response.data || [];
    } catch (error) {
      console.error('Error searching GHL conversations:', error.response?.data || error.message);
      throw error;
    }
  }

  async getOpportunities(contactId) {
    try {
      const cacheKey = `opp:${contactId}`;
      const cached = this.getFromCache(this.opportunityCache, cacheKey);
      if (cached) return cached;
      const response = await this.client.get(`/opportunities/contact/${contactId}`);
      const opps = response.data.opportunities;
      this.setCache(this.opportunityCache, cacheKey, opps);
      return opps;
    } catch (error) {
      console.error('Error fetching GHL opportunities:', error.response?.data || error.message);
      throw error;
    }
  }

  async createOpportunity(opportunityData) {
    try {
      const response = await this.client.post(`/opportunities/`, {
        ...opportunityData,
        locationId: this.locationId
      });
      return response.data.opportunity;
    } catch (error) {
      console.error('Error creating GHL opportunity:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPipelines() {
    try {
      const response = await this.client.get(`/pipelines/location/${this.locationId}`);
      return response.data.pipelines;
    } catch (error) {
      console.error('Error fetching GHL pipelines:', error.response?.data || error.message);
      throw error;
    }
  }

  async getTags() {
    try {
      const response = await this.client.get(`/tags/location/${this.locationId}`);
      return response.data.tags;
    } catch (error) {
      console.error('Error fetching GHL tags:', error.response?.data || error.message);
      throw error;
    }
  }

  async addTagToContact(contactId, tagId) {
    try {
      const response = await this.client.post(`/contacts/${contactId}/tags`, {
        tagId: tagId
      });
      return response.data;
    } catch (error) {
      console.error('Error adding tag to contact:', error.response?.data || error.message);
      throw error;
    }
  }

  isConfigured() {
    // Consider GHL configured if a non-placeholder API key and a location ID are present.
    // Accept various valid key formats (e.g., pit-, sk_, pat-, lc_), and allow disabling via 'disabled'.
    const key = (this.apiKey || '').trim();
    const loc = (this.locationId || '').trim();
    if (!key || !loc) return false;
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'your_ghl_api_key_here' || lowerKey === 'disabled') return false;
    return true;
  }

  // Get conversations by contact ID for AI context
  async getConversationsByContact(contactId) {
    try {
      console.log(`🔍 Fetching conversations for contact: ${contactId}`);
      
      const response = await this.client.get('/conversations/search', {
        params: {
          contactId: contactId,
          locationId: this.locationId
        }
      });

      if (response.data && response.data.conversations) {
        console.log(`✅ Found ${response.data.conversations.length} conversations for contact ${contactId}`);
        return response.data.conversations;
      }

      return [];
    } catch (error) {
      console.error(`❌ Error fetching conversations for contact ${contactId}:`, error.message);
      return [];
    }
  }

  // Get contact details with enhanced information for AI
  async getContactDetails(contactId) {
    try {
      console.log(`🔍 Fetching detailed contact info (cached): ${contactId}`);
      const cacheKey = `contact:${contactId}`;
      const cached = this.getFromCache(this.contactCache, cacheKey);
      if (cached) return cached;
      const response = await this.client.get(`/contacts/${contactId}`, {
        params: {
          locationId: this.locationId
        }
      });
      if (response.data && response.data.contact) {
        this.setCache(this.contactCache, cacheKey, response.data.contact);
        console.log(`✅ Found contact details for ${contactId}`);
        return response.data.contact;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error fetching contact details for ${contactId}:`, error.message);
      return null;
    }
  }

  getStatus() {
    return {
      isConfigured: this.isConfigured(),
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : null,
      locationId: this.locationId,
      baseUrl: this.baseUrl,
      connectionType: 'Direct API (No Marketplace App Required)'
    };
  }

  // Simple cache helpers
  getFromCache(map, key) {
    try {
      const entry = map.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        map.delete(key);
        return null;
      }
      return entry.value;
    } catch (e) {
      return null;
    }
  }

  setCache(map, key, value) {
    try {
      map.set(key, { value, expiresAt: Date.now() + this.cacheTTL });
    } catch (e) {}
  }

  invalidateContactCache(contactId) {
    try {
      this.contactCache.delete(`contact:${contactId}`);
      this.opportunityCache.delete(`opp:${contactId}`);
      this.convCache.delete(`conv:${contactId}`);
      console.log(`🧹 GHL cache invalidated for contact ${contactId}`);
    } catch (e) {}
  }
}

module.exports = GHLService;
