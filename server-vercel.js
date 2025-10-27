// Vercel Serverless Functions for WhatsApp Business API
const express = require('express');
const cors = require('cors');
const WhatsAppBusinessService = require('./services/whatsappBusinessService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const whatsappBusiness = new WhatsAppBusinessService();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'WhatsApp Business API',
    timestamp: new Date().toISOString()
  });
});

// WhatsApp webhook verification
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  try {
    const result = whatsappBusiness.verifyWebhook(mode, token, challenge);
    res.status(200).send(result);
  } catch (error) {
    res.status(403).send('Forbidden');
  }
});

// WhatsApp webhook for incoming messages
app.post('/api/whatsapp/webhook', (req, res) => {
  try {
    const message = whatsappBusiness.processIncomingMessage(req.body);
    
    if (message) {
      console.log('📨 Incoming WhatsApp message:', message);
      // Process the message (save to database, etc.)
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Send WhatsApp message
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, message, mediaUrl } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await whatsappBusiness.sendMessage(to, message, mediaUrl);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send WhatsApp template
app.post('/api/whatsapp/send-template', async (req, res) => {
  try {
    const { to, templateName, variables, mediaUrl } = req.body;
    
    if (!to || !templateName) {
      return res.status(400).json({ error: 'Phone number and template name are required' });
    }

    const result = await whatsappBusiness.sendTemplate(to, templateName, variables, mediaUrl);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GHL webhook handler
app.post('/webhooks/ghl', async (req, res) => {
  try {
    console.log('📨 GHL webhook received:', req.body);
    
    // Extract data from GHL webhook
    const { phone, message, templateName, variables, mediaUrl } = req.body;
    
    if (templateName) {
      // Send template
      const result = await whatsappBusiness.sendTemplate(phone, templateName, variables, mediaUrl);
      res.json({ success: true, data: result });
    } else {
      // Send regular message
      const result = await whatsappBusiness.sendMessage(phone, message, mediaUrl);
      res.json({ success: true, data: result });
    }
  } catch (error) {
    console.error('❌ GHL webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export for Vercel
module.exports = app;
