const EventEmitter = require('events');

class SMSService extends EventEmitter {
  constructor() {
    super();
    this.isReady = false;
    this.provider = process.env.SMS_PROVIDER || 'twilio'; // twilio, vonage, etc.
    this.config = this.getProviderConfig();
  }

  getProviderConfig() {
    switch (this.provider) {
      case 'twilio':
        return {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_FROM_NUMBER
        };
      case 'vonage':
        return {
          apiKey: process.env.VONAGE_API_KEY,
          apiSecret: process.env.VONAGE_API_SECRET,
          fromNumber: process.env.VONAGE_FROM_NUMBER
        };
      default:
        return {};
    }
  }

  async initialize() {
    try {
      if (this.provider === 'twilio') {
        await this.initializeTwilio();
      } else if (this.provider === 'vonage') {
        await this.initializeVonage();
      } else {
        console.log('📱 SMS provider not configured - running in mock mode');
        this.isReady = true; // Allow service to work without real SMS
      }
    } catch (error) {
      console.error('❌ Error initializing SMS service:', error.message);
      console.log('📱 SMS service will run in mock mode');
      this.isReady = true; // Allow service to work without real SMS
    }
  }

  async initializeTwilio() {
    if (!this.config.accountSid || !this.config.authToken) {
      console.log('Twilio credentials not configured');
      return;
    }

    try {
      const twilio = require('twilio')(this.config.accountSid, this.config.authToken);
      this.client = twilio;
      this.isReady = true;
      console.log('SMS service (Twilio) initialized');
      this.emit('ready');
    } catch (error) {
      console.error('Error initializing Twilio:', error);
    }
  }

  async initializeVonage() {
    if (!this.config.apiKey || !this.config.apiSecret) {
      console.log('Vonage credentials not configured');
      return;
    }

    try {
      const Vonage = require('@vonage/server-sdk');
      this.client = new Vonage({
        apiKey: this.config.apiKey,
        apiSecret: this.config.apiSecret
      });
      this.isReady = true;
      console.log('SMS service (Vonage) initialized');
      this.emit('ready');
    } catch (error) {
      console.error('Error initializing Vonage:', error);
    }
  }

  async sendSMS(to, message) {
    if (!this.isReady) {
      throw new Error('SMS service is not ready');
    }

    try {
      let result;
      
      if (this.provider === 'twilio') {
        result = await this.client.messages.create({
          body: message,
          from: this.config.fromNumber,
          to: to
        });
      } else if (this.provider === 'vonage') {
        result = await this.client.sms.send({
          to: to,
          from: this.config.fromNumber,
          text: message
        });
      }

      console.log('SMS sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async receiveSMS(messageData) {
    // This would be called by a webhook from your SMS provider
    const message = {
      id: messageData.id || `sms_${Date.now()}`,
      from: messageData.from,
      body: messageData.body,
      timestamp: Date.now(),
      type: 'sms'
    };

    this.emit('message', message);
  }

  getStatus() {
    return {
      isReady: this.isReady,
      provider: this.provider,
      isConfigured: this.isProviderConfigured()
    };
  }

  isProviderConfigured() {
    switch (this.provider) {
      case 'twilio':
        return !!(this.config.accountSid && this.config.authToken && this.config.fromNumber);
      case 'vonage':
        return !!(this.config.apiKey && this.config.apiSecret && this.config.fromNumber);
      default:
        return false;
    }
  }
}

module.exports = SMSService;
