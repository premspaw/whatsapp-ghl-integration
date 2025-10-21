const axios = require('axios');

class WebhookService {
  constructor() {
    this.ghlApiKey = process.env.GHL_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;
    this.baseUrl = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
    this.onInvalidate = null; // callback(contactId)
    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/v1`,
      headers: {
        'Authorization': `Bearer ${this.ghlApiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    if (!this.ghlApiKey) {
      console.warn('⚠️ GHL_API_KEY is not set. Webhook setup will fail.');
    }
    if (!this.locationId) {
      console.warn('⚠️ GHL_LOCATION_ID is not set. Webhook setup will fail.');
    }
  }

  // Create webhook for WhatsApp automation triggers
  async createWhatsAppWebhook(webhookUrl, locationId) {
    try {
      const webhookData = {
        url: webhookUrl,
        events: [
          'conversation.message.created',
          'conversation.message.updated',
          'contact.created',
          'contact.updated'
        ]
      };

      // Use location-scoped endpoint
      const response = await this.client.post(`/locations/${locationId}/webhooks/`, webhookData);
      console.log('✅ WhatsApp webhook created:', response.data.webhook.id);
      return response.data.webhook;
    } catch (error) {
      console.error('❌ Error creating WhatsApp webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get all webhooks
  async getWebhooks(locationId) {
    try {
      const response = await this.client.get(`/locations/${locationId}/webhooks/`);
      return response.data.webhooks || [];
    } catch (error) {
      console.error('Error fetching webhooks:', error.response?.data || error.message);
      throw error;
    }
  }

  // Delete webhook
  async deleteWebhook(webhookId, locationId) {
    try {
      await this.client.delete(`/locations/${locationId}/webhooks/${webhookId}`);
      console.log('✅ Webhook deleted:', webhookId);
    } catch (error) {
      console.error('Error deleting webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  // Process incoming webhook from GHL
  async processGHLWebhook(webhookData) {
    try {
      const { event, data } = webhookData;
      
      console.log('🔄 Processing GHL webhook:', event);

      switch (event) {
        case 'conversation.message.created':
          await this.handleMessageCreated(data);
          break;
        case 'conversation.message.updated':
          await this.handleMessageUpdated(data);
          break;
        case 'contact.created':
          await this.handleContactCreated(data);
          break;
        case 'contact.updated':
          await this.handleContactUpdated(data);
          break;
        default:
          console.log('⚠️ Unknown webhook event:', event);
      }
    } catch (error) {
      console.error('❌ Error processing GHL webhook:', error);
      throw error;
    }
  }

  // Handle new message created in GHL
  async handleMessageCreated(messageData) {
    try {
      console.log('📨 New message in GHL:', messageData.message);
      
      // Check if this is an outbound message that needs to be sent via WhatsApp
      if (messageData.direction === 'outbound' && messageData.type === 'SMS') {
        // Trigger WhatsApp message sending
        await this.triggerWhatsAppMessage(messageData);
      }
    } catch (error) {
      console.error('Error handling message created:', error);
    }
  }

  // Handle message updated in GHL
  async handleMessageUpdated(messageData) {
    try {
      console.log('📝 Message updated in GHL:', messageData.message);
      // Add any specific logic for message updates
    } catch (error) {
      console.error('Error handling message updated:', error);
    }
  }

  // Handle new contact created in GHL
  async handleContactCreated(contactData) {
    try {
      console.log('👤 New contact created in GHL:', contactData.contact);
      
      // Send welcome message via WhatsApp if contact has WhatsApp number
      if (contactData.contact.phone) {
        await this.triggerWelcomeMessage(contactData.contact);
      }
    } catch (error) {
      console.error('Error handling contact created:', error);
    }
  }

  // Handle contact updated in GHL
  async handleContactUpdated(contactData) {
    try {
      console.log('👤 Contact updated in GHL:', contactData.contact);
      
      // Check if WhatsApp connection status changed
      if (contactData.contact.customFields?.whatsapp_connected) {
        await this.handleWhatsAppConnectionUpdate(contactData.contact);
      }

      // Invalidate cache callback if provided
      try {
        if (this.onInvalidate && contactData.contact?.id) {
          this.onInvalidate(contactData.contact.id);
        }
      } catch (e) {}
    } catch (error) {
      console.error('Error handling contact updated:', error);
    }
  }

  // Trigger WhatsApp message sending
  async triggerWhatsAppMessage(messageData) {
    try {
      // This would integrate with your WhatsApp service
      console.log('📱 Triggering WhatsApp message:', messageData.message);
      
      // You can emit an event to your WhatsApp service here
      // or make an API call to your WhatsApp endpoint
      
      return {
        success: true,
        message: 'WhatsApp message triggered',
        data: messageData
      };
    } catch (error) {
      console.error('Error triggering WhatsApp message:', error);
      throw error;
    }
  }

  // Trigger welcome message for new contacts
  async triggerWelcomeMessage(contactData) {
    try {
      const welcomeMessage = `Hello ${contactData.firstName || 'there'}! 👋 

Welcome to our WhatsApp support! I'm your AI assistant and I'm here to help you with any questions you might have.

Feel free to ask me anything! 😊`;

      console.log('👋 Triggering welcome message for:', contactData.firstName);
      
      // Trigger WhatsApp welcome message
      return {
        success: true,
        message: 'Welcome message triggered',
        contact: contactData
      };
    } catch (error) {
      console.error('Error triggering welcome message:', error);
      throw error;
    }
  }

  // Handle WhatsApp connection status updates
  async handleWhatsAppConnectionUpdate(contactData) {
    try {
      console.log('📱 WhatsApp connection updated for:', contactData.firstName);
      
      // Add any specific logic for WhatsApp connection changes
      return {
        success: true,
        message: 'WhatsApp connection status updated',
        contact: contactData
      };
    } catch (error) {
      console.error('Error handling WhatsApp connection update:', error);
      throw error;
    }
  }

  // Setup automation triggers
  async setupAutomationTriggers(options = {}) {
    try {
      console.log('🔧 Setting up WhatsApp automation triggers...');
      
      // Validate environment
      const base = process.env.WEBHOOK_BASE_URL;
      if (!base) {
        throw new Error('WEBHOOK_BASE_URL is not set. Please set it to your public HTTPS URL (e.g., ngrok).');
      }
      if (!/^https:\/\//.test(base)) {
        throw new Error('WEBHOOK_BASE_URL must be HTTPS. Set an https ngrok URL (e.g., https://abcd.ngrok-free.app).');
      }

      const targetLocationId = options.locationId || this.locationId;
      if (!targetLocationId) {
        throw new Error('GHL_LOCATION_ID is not set. Provide locationId in body or set env.');
      }

      // Create webhook for automation
      const webhookUrl = `${base}/webhooks/ghl-automation`;
      const webhook = await this.createWhatsAppWebhook(webhookUrl, targetLocationId);
      
      console.log('✅ Automation triggers setup complete');
      return webhook;
    } catch (error) {
      console.error('❌ Error setting up automation triggers:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = WebhookService;
