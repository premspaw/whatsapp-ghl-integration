// Render Server - Forwards WhatsApp requests to local server
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Local server URL (update this with your public IP or ngrok URL)
const LOCAL_SERVER_URL = process.env.LOCAL_SERVER_URL || 'http://localhost:3000';

console.log(`🚀 Render server starting on port ${PORT}`);
console.log(`📡 Local server URL: ${LOCAL_SERVER_URL}`);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    server: 'render',
    localServer: LOCAL_SERVER_URL,
    timestamp: new Date().toISOString()
  });
});

// Forward GHL webhook to local server
app.post('/webhooks/ghl', async (req, res) => {
  try {
    console.log('📨 GHL webhook received on Render, forwarding to local server...');
    
    const response = await axios.post(`${LOCAL_SERVER_URL}/webhooks/ghl`, req.body, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Forwarded to local server successfully');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error forwarding to local server:', error.message);
    res.status(500).json({ 
      success: false, 
      error: `Local server error: ${error.message}`,
      localServerUrl: LOCAL_SERVER_URL
    });
  }
});

// Forward WhatsApp template sending to local server
app.post('/api/whatsapp/send-template', async (req, res) => {
  try {
    console.log('📨 WhatsApp template request received on Render, forwarding to local server...');
    
    const response = await axios.post(`${LOCAL_SERVER_URL}/api/whatsapp/send-template`, req.body, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Template forwarded to local server successfully');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error forwarding template to local server:', error.message);
    res.status(500).json({ 
      success: false, 
      error: `Local server error: ${error.message}`,
      localServerUrl: LOCAL_SERVER_URL
    });
  }
});

// Forward WhatsApp send message to local server
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    console.log('📨 WhatsApp send request received on Render, forwarding to local server...');
    
    const response = await axios.post(`${LOCAL_SERVER_URL}/api/whatsapp/send`, req.body, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Send message forwarded to local server successfully');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error forwarding send message to local server:', error.message);
    res.status(500).json({ 
      success: false, 
      error: `Local server error: ${error.message}`,
      localServerUrl: LOCAL_SERVER_URL
    });
  }
});

// Serve the main WhatsApp tab page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ghl-whatsapp-tab.html'));
});

// Serve template creator
app.get('/template-creator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'template-creator.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Render server running on port ${PORT}`);
  console.log(`🔗 Webhook URL: https://whatsapp-ghl-integration-77cf.onrender.com/webhooks/ghl`);
  console.log(`📱 Template URL: https://whatsapp-ghl-integration-77cf.onrender.com/api/whatsapp/send-template`);
});
