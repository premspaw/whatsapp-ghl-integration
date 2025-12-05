const axios = require('axios');

class WhatsAppBusinessService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  async sendMessage(to, message, mediaUrl = null) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('WhatsApp Business API credentials not configured');
      }

      // Format phone number (remove + and any non-digits)
      const formattedNumber = to.replace(/[^\d]/g, '');
      
      let messagePayload;
      
      if (mediaUrl) {
        // Send media message
        messagePayload = {
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'image',
          image: {
            link: mediaUrl,
            caption: message
          }
        };
      } else {
        // Send text message
        messagePayload = {
          messaging_product: 'whatsapp',
          to: formattedNumber,
          type: 'text',
          text: {
            body: message
          }
        };
      }

      console.log('📤 Sending WhatsApp Business API message:', {
        to: formattedNumber,
        hasMedia: !!mediaUrl,
        messageLength: message.length
      });

      const response = await axios.post(`${this.baseUrl}/messages`, messagePayload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ WhatsApp Business API message sent:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ WhatsApp Business API error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendTemplate(to, templateName, variables = {}, mediaUrl = null) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('WhatsApp Business API credentials not configured');
      }

      const formattedNumber = to.replace(/[^\d]/g, '');
      
      let templatePayload = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en'
          }
        }
      };

      // Add parameters if variables exist
      if (Object.keys(variables).length > 0) {
        templatePayload.template.components = [
          {
            type: 'body',
            parameters: Object.values(variables).map(value => ({
              type: 'text',
              text: value
            }))
          }
        ];
      }

      // Add media if provided
      if (mediaUrl) {
        templatePayload.template.components = templatePayload.template.components || [];
        templatePayload.template.components.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: mediaUrl
              }
            }
          ]
        });
      }

      console.log('📤 Sending WhatsApp Business API template:', {
        to: formattedNumber,
        template: templateName,
        variables: Object.keys(variables),
        hasMedia: !!mediaUrl
      });

      const response = await axios.post(`${this.baseUrl}/messages`, templatePayload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ WhatsApp Business API template sent:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ WhatsApp Business API template error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verify webhook
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WhatsApp webhook verified');
      return challenge;
    } else {
      console.log('❌ WhatsApp webhook verification failed');
      throw new Error('Webhook verification failed');
    }
  }

  // Process incoming messages
  processIncomingMessage(webhookData) {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        return null;
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];

      return {
        id: message.id,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        text: message.text?.body || '',
        contactName: contact?.profile?.name || 'Unknown',
        mediaUrl: message.image?.id || message.video?.id || null
      };
    } catch (error) {
      console.error('❌ Error processing incoming message:', error);
      return null;
    }
  }
}

module.exports = WhatsAppBusinessService;
