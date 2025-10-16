const axios = require('axios');

class GHLService {
  constructor() {
    this.apiKey = process.env.GHL_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;
    this.baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });
  }

  // Helper function to normalize phone numbers for GHL API
  normalizePhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove @c.us suffix and any non-digit characters except +
    let normalized = phone.replace('@c.us', '').replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add it
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    
    // Ensure we have a valid phone number (at least 7 digits for international)
    const digitsOnly = normalized.replace('+', '');
    if (digitsOnly.length < 7) {
      console.error('Invalid phone number after normalization:', phone, '->', normalized);
      return null;
    }
    
    return normalized;
  }

  async getContacts() {
    try {
      if (!this.isConfigured()) {
        throw new Error('GHL not configured - API key or location ID missing');
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
      const response = await this.client.get(`/contacts/${contactId}`);
      return response.data.contact;
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

      const response = await this.client.post(`/contacts/`, {
        ...contactData,
        phone: normalizedPhone,
        locationId: this.locationId
      });
      return response.data.contact;
    } catch (error) {
      // Handle "contact already exists" case by trying to find the existing contact
      if (error.response?.data?.message && error.response.data.message.includes('already exists')) {
        console.log('✅ Contact already exists, finding existing contact');
        const normalizedPhone = this.normalizePhoneNumber(contactData.phone);
        const existingContact = await this.findContactByPhone(normalizedPhone);
        if (existingContact) {
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

  async getConversations(contactId) {
    try {
      // Use the proper GHL Conversations API endpoint for searching conversations
      const response = await this.client.get('/conversations/search', {
        params: {
          contactId: contactId,
          locationId: this.locationId
        }
      });
      return response.data.conversations || response.data || [];
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
        type: 'SMS', // GHL only accepts 'SMS' type for conversations
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
          type: conversationData.type || 'whatsapp',
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
        type: messageData.type || 'text',
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
      // Use the proper GHL Conversations API endpoint for inbound messages
      const payload = {
        contactId: contactId,
        message: messageData.message,
        type: 'SMS', // GHL only accepts 'SMS' type for messages
        direction: 'inbound',
        locationId: this.locationId
      };

      if (conversationId) {
        payload.conversationId = conversationId;
      }

      const response = await this.client.post('/conversations/messages', payload);
      return response.data;
    } catch (error) {
      console.error('Error adding inbound message to GHL:', error.response?.data || error.message);
      throw error;
    }
  }

  async addOutboundMessage(contactId, messageData, conversationId = null) {
    try {
      // Use the proper GHL Conversations API endpoint for outbound messages
      const payload = {
        contactId: contactId,
        message: messageData.message,
        type: 'SMS', // GHL only accepts 'SMS' type for messages
        direction: 'outbound',
        locationId: this.locationId
      };

      if (conversationId) {
        payload.conversationId = conversationId;
      }

      const response = await this.client.post('/conversations/messages', payload);
      return response.data;
    } catch (error) {
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
          firstName: whatsappConversation.name || 'WhatsApp Contact',
          source: 'WhatsApp Integration'
        });
      } else {
        console.log('✅ Contact found in GHL:', contact.id);
      }

      // Find or create conversation in GHL
      let conversation = await this.findConversationByContact(contact.id);
      
      if (!conversation) {
        console.log('📝 Creating new conversation in GHL');
        conversation = await this.createConversation({
          contactId: contact.id,
          type: 'SMS',
          status: 'active',
          phoneNumber: normalizedPhone
        });
      } else {
        console.log('✅ Conversation found in GHL:', conversation.id);
      }

      // Sync all messages (simplified approach)
      const messages = whatsappConversation.messages || [];
      console.log(`📨 Syncing ${messages.length} messages to GHL`);

      for (const message of messages) {
        try {
          const isInbound = message.from === 'user';
          const messageData = {
            message: message.body,
            type: 'SMS', // GHL only accepts 'SMS' type for messages
            timestamp: new Date(message.timestamp).toISOString()
          };

          if (isInbound) {
            await this.addInboundMessage(contact.id, messageData, conversation.id);
          } else {
            await this.addOutboundMessage(contact.id, messageData, conversation.id);
          }
          
          // Message synced successfully
        } catch (msgError) {
          console.error('Error syncing individual message:', msgError);
        }
      }

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
      const response = await this.client.get(`/opportunities/contact/${contactId}`);
      return response.data.opportunities;
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
    return !!(this.apiKey && this.locationId && 
              this.apiKey !== 'your_ghl_api_key_here' && 
              this.apiKey.startsWith('pit-'));
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
}

module.exports = GHLService;
