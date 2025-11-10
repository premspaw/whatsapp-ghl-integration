const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const EventEmitter = require('events');

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.isReady = false;
  }

  initialize() {
    console.log('Initializing WhatsApp client...');
    
    // Allow configuring Puppeteer executable path via env for VPS stability
    const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
    const puppeteerOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        // Removed '--single-process' to prevent Chromium crashes on Windows
        '--disable-gpu'
      ]
    };
    if (execPath) {
      puppeteerOptions.executablePath = execPath;
      console.log(`Puppeteer executablePath set to: ${execPath}`);
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: process.env.WHATSAPP_SESSION_NAME || 'Mywhatsapp'
      }),
      puppeteer: puppeteerOptions
    });

    // Event handlers
    this.client.on('qr', (qr) => {
      console.log('QR Code received');
      qrcode.generate(qr, { small: true });
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      console.log('WhatsApp client is ready!');
      this.isReady = true;
      this.emit('ready');
    });

    this.client.on('message', (message) => {
      this.emit('message', message);
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      this.isReady = false;
      this.emit('disconnected', reason);
    });

    this.client.on('auth_failure', (msg) => {
      console.error('Authentication failed:', msg);
      this.emit('auth_failure', msg);
    });

    // Initialize the client
    this.client.initialize();
  }

  async sendMessage(to, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    // Ensure non-empty text
    const text = (message !== undefined && message !== null) ? String(message).trim() : '';
    if (!text) {
      throw new Error('Message content is empty');
    }

    // Normalize number → chat id and verify registration
    let chatId = String(to || '').trim();
    let rawNumber = chatId;
    try {
      if (!chatId.includes('@c.us')) {
        rawNumber = rawNumber.replace(/[^\\d+]/g, '');
        if (rawNumber.startsWith('+')) rawNumber = rawNumber.substring(1);

        // Prefer using WhatsApp's number lookup to avoid invalid JIDs
        if (this.client.getNumberId) {
          const numberId = await this.client.getNumberId(rawNumber);
          if (!numberId) {
            throw new Error(`Number ${rawNumber} is not a registered WhatsApp user`);
          }
          chatId = numberId._serialized || `${rawNumber}@c.us`;
        } else {
          chatId = `${rawNumber}@c.us`;
        }
      }
    } catch (lookupError) {
      console.error('❌ WhatsApp number lookup failed:', lookupError.message || lookupError);
      throw lookupError;
    }

    try {
      const result = await this.client.sendMessage(chatId, text);
      console.log('Message sent successfully:', result.id?._serialized || result.id || 'unknown');
      return result;
    } catch (error) {
      console.error('Error sending message:', {
        error: error && (error.message || error.toString()),
        chatId,
        rawNumber,
        isReady: this.isReady
      });
      throw error;
    }
  }

  async sendMedia(to, mediaPath, caption = '') {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const media = new MessageMedia('image/jpeg', mediaPath);
      const result = await this.client.sendMessage(to, media, { caption });
      console.log('Media sent successfully:', result.id._serialized);
      return result;
    } catch (error) {
      console.error('Error sending media:', error);
      throw error;
    }
  }

  async sendMediaFromUrl(to, mediaUrl, caption = '', mediaType = 'image') {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const { MessageMedia } = require('whatsapp-web.js');
      const axios = require('axios');
      
      // Format phone number
      let formattedNumber = to;
      if (!formattedNumber.includes('@c.us')) {
        formattedNumber = formattedNumber.replace(/[^\d+]/g, '');
        if (formattedNumber.startsWith('+')) {
          formattedNumber = formattedNumber.substring(1);
        }
        formattedNumber = formattedNumber + '@c.us';
      }
      
      console.log(`📸 Fetching media from URL: ${mediaUrl}`);
      // Fetch the media from URL
      const response = await axios.get(mediaUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = response.headers['content-type'] || (mediaType === 'image' ? 'image/jpeg' : 'video/mp4');
      
      console.log(`📤 Creating MessageMedia with MIME type: ${mimeType}`);
      const media = new MessageMedia(mimeType, base64);
      
      console.log(`📤 Sending WhatsApp message with media to ${formattedNumber}`);
      const result = await this.client.sendMessage(formattedNumber, media, { caption });
      console.log('✅ Media message sent successfully:', result.id._serialized);
      return result;
    } catch (error) {
      console.error('❌ Error sending media from URL:', error);
      throw error;
    }
  }

  async getChats() {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const chats = await this.client.getChats();
      return chats;
    } catch (error) {
      console.error('Error getting chats:', error);
      throw error;
    }
  }

  async getChatMessages(chatId, limit = 50) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const chat = await this.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });
      return messages;
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }

  async getContactInfo(contactId) {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const contact = await this.client.getContactById(contactId);
      return {
        id: contact.id._serialized,
        name: contact.name || contact.pushname || 'Unknown',
        number: contact.number,
        isGroup: contact.isGroup,
        isUser: contact.isUser
      };
    } catch (error) {
      console.error('Error getting contact info:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isConnected: this.client ? true : false
    };
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
    }
  }
}

module.exports = WhatsAppService;
