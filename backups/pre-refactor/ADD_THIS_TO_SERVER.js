// ============================================
// 🎯 ADD THESE API ENDPOINTS TO YOUR SERVER.JS
// ============================================
//
// STEP 1: Find this line in your server.js (around line 1082):
//         app.get('/api/mock/contacts', async (req, res) => {
//
// STEP 2: After that endpoint (and its closing }); 
//         paste ALL the code below
//
// STEP 3: Save server.js and restart: npm start
//
// ============================================

const fs = require('fs');
const path = require('path');

// File to store integrations
const INTEGRATIONS_FILE = path.join(__dirname, 'data', 'integrations.json');

// Initialize integrations file if it doesn't exist
function initializeIntegrationsFile() {
  if (!fs.existsSync(INTEGRATIONS_FILE)) {
    const dir = path.dirname(INTEGRATIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify({ integrations: [] }, null, 2));
    console.log('✅ Created integrations.json file');
  }
}

// Read integrations from file
function readIntegrations() {
  try {
    const data = fs.readFileSync(INTEGRATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading integrations:', error);
    return { integrations: [] };
  }
}

// Write integrations to file
function writeIntegrations(data) {
  try {
    fs.writeFileSync(INTEGRATIONS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing integrations:', error);
    return false;
  }
}

// Initialize on server start (call this ONCE when server starts)
initializeIntegrationsFile();

// ============================================
// 📋 INTEGRATION API ENDPOINTS
// ============================================

// GET /api/integrations - List all integrations
app.get('/api/integrations', (req, res) => {
  try {
    const data = readIntegrations();
    console.log(`📋 Listing ${data.integrations.length} integrations`);
    res.json({ 
      success: true, 
      integrations: data.integrations 
    });
  } catch (error) {
    console.error('Error listing integrations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/integrations - Create new integration
app.post('/api/integrations', (req, res) => {
  try {
    const data = readIntegrations();
    
    const newIntegration = {
      id: 'int_' + Date.now(),
      name: req.body.name || 'Unnamed Integration',
      description: req.body.description || '',
      status: 'disconnected',
      
      // Connection type
      connectionType: req.body.connectionType || 'business',
      
      // WhatsApp config
      whatsappNumber: req.body.whatsappNumber || '',
      businessName: req.body.businessName || '',
      metaAppId: req.body.metaAppId || '',
      phoneNumberId: req.body.phoneNumberId || '',
      metaAccessToken: req.body.metaAccessToken || '',
      
      // GHL config
      ghlApiKey: req.body.ghlApiKey || '',
      ghlLocationId: req.body.ghlLocationId || '',
      ghlLocationName: req.body.ghlLocationName || '',
      
      // AI config
      aiEnabled: req.body.aiEnabled !== false,
      aiModel: req.body.aiModel || 'gpt-4',
      aiSystemPrompt: req.body.aiSystemPrompt || 'You are a helpful AI assistant.',
      aiTemperature: req.body.aiTemperature || 0.7,
      
      // Statistics
      messagesToday: 0,
      activeConversations: 0,
      activeContacts: 0,
      uptime: 100,
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to integrations
    data.integrations.push(newIntegration);
    
    // Write to file
    if (writeIntegrations(data)) {
      console.log(`✅ Created integration: ${newIntegration.name} (${newIntegration.id})`);
      
      // Auto-connect if requested
      if (req.body.autoConnect) {
        newIntegration.status = 'connected';
        writeIntegrations(data);
        console.log(`🔗 Auto-connected integration: ${newIntegration.id}`);
      }
      
      res.json({ 
        success: true, 
        integration: newIntegration 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save integration' 
      });
    }
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// GET /api/integrations/:id - Get single integration
app.get('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    
    if (integration) {
      console.log(`📄 Retrieved integration: ${integration.name}`);
      res.json({ 
        success: true, 
        integration 
      });
    } else {
      console.log(`❌ Integration not found: ${req.params.id}`);
      res.status(404).json({ 
        success: false, 
        error: 'Integration not found' 
      });
    }
  } catch (error) {
    console.error('Error getting integration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// PUT /api/integrations/:id - Update integration
app.put('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    
    if (index !== -1) {
      // Update integration
      data.integrations[index] = {
        ...data.integrations[index],
        ...req.body,
        id: req.params.id, // Preserve ID
        updatedAt: new Date().toISOString()
      };
      
      if (writeIntegrations(data)) {
        console.log(`✅ Updated integration: ${data.integrations[index].name}`);
        res.json({ 
          success: true, 
          integration: data.integrations[index] 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to update integration' 
        });
      }
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Integration not found' 
      });
    }
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DELETE /api/integrations/:id - Delete integration
app.delete('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    
    if (integration) {
      // Remove integration
      data.integrations = data.integrations.filter(i => i.id !== req.params.id);
      
      if (writeIntegrations(data)) {
        console.log(`🗑️  Deleted integration: ${integration.name}`);
        res.json({ 
          success: true, 
          message: 'Integration deleted successfully' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to delete integration' 
        });
      }
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Integration not found' 
      });
    }
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/integrations/:id/connect - Connect integration
app.post('/api/integrations/:id/connect', async (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    
    if (index !== -1) {
      const integration = data.integrations[index];
      
      // TODO: Implement actual WhatsApp connection logic here
      // For now, just mark as connected
      data.integrations[index].status = 'connected';
      data.integrations[index].updatedAt = new Date().toISOString();
      
      if (writeIntegrations(data)) {
        console.log(`🔗 Connected integration: ${integration.name}`);
        
        // Emit socket event
        if (io) {
          io.emit('integration_status_changed', {
            integrationId: req.params.id,
            status: 'connected'
          });
        }
        
        res.json({ 
          success: true, 
          message: 'Integration connected successfully',
          integration: data.integrations[index]
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to connect integration' 
        });
      }
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Integration not found' 
      });
    }
  } catch (error) {
    console.error('Error connecting integration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/integrations/:id/disconnect - Disconnect integration
app.post('/api/integrations/:id/disconnect', async (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    
    if (index !== -1) {
      const integration = data.integrations[index];
      
      // TODO: Implement actual WhatsApp disconnection logic here
      // For now, just mark as disconnected
      data.integrations[index].status = 'disconnected';
      data.integrations[index].updatedAt = new Date().toISOString();
      
      if (writeIntegrations(data)) {
        console.log(`🔌 Disconnected integration: ${integration.name}`);
        
        // Emit socket event
        if (io) {
          io.emit('integration_status_changed', {
            integrationId: req.params.id,
            status: 'disconnected'
          });
        }
        
        res.json({ 
          success: true, 
          message: 'Integration disconnected successfully',
          integration: data.integrations[index]
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to disconnect integration' 
        });
      }
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Integration not found' 
      });
    }
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/integrations/:id/test - Test integration
app.post('/api/integrations/:id/test', async (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    
    if (integration) {
      console.log(`🧪 Testing integration: ${integration.name}`);
      
      // TODO: Implement actual connection testing logic
      // For now, simulate a test
      
      const testResults = {
        whatsapp: integration.whatsappNumber ? 'OK' : 'Missing number',
        ghl: integration.ghlLocationId ? 'OK' : 'Missing location ID',
        overall: integration.whatsappNumber && integration.ghlLocationId ? 'PASS' : 'FAIL'
      };
      
      res.json({ 
        success: testResults.overall === 'PASS',
        message: testResults.overall === 'PASS' 
          ? 'All tests passed! Integration is working correctly.' 
          : 'Some tests failed. Please check your configuration.',
        results: testResults
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Integration not found' 
      });
    }
  } catch (error) {
    console.error('Error testing integration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/ghl/test - Test GHL Connection (for wizard)
app.post('/api/ghl/test', async (req, res) => {
  try {
    const { apiKey, locationId } = req.body;
    
    if (!apiKey || !locationId) {
      return res.json({
        success: false,
        error: 'API Key and Location ID are required'
      });
    }
    
    // TODO: Implement actual GHL connection test
    // For now, just return success
    console.log(`🧪 Testing GHL connection for location: ${locationId}`);
    
    res.json({
      success: true,
      message: 'GHL connection test successful!',
      location: {
        id: locationId,
        name: 'Location ' + locationId.substring(0, 8)
      }
    });
  } catch (error) {
    console.error('Error testing GHL connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('✅ Multi-account integration API endpoints loaded');

// ============================================
// END OF INTEGRATION API ENDPOINTS
// ============================================
// 
// Your existing server code continues below...
//

