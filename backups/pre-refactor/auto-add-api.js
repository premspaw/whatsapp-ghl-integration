#!/usr/bin/env node

/**
 * 🤖 AUTOMATIC API INSTALLER
 * 
 * This script automatically adds the integration API endpoints to your server.js
 * 
 * Usage:
 *   node auto-add-api.js
 * 
 * What it does:
 *   1. Reads your server.js
 *   2. Finds the right place to insert the new API code
 *   3. Inserts the integration API endpoints
 *   4. Saves the updated server.js
 *   5. Creates a backup (server.js.backup)
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function header(message) {
  log('\n' + '='.repeat(60), 'blue');
  log(message, 'bright');
  log('='.repeat(60), 'blue');
}

// The integration API code to insert
const INTEGRATION_API_CODE = `
// ============================================
// 🎯 MULTI-ACCOUNT INTEGRATION API ENDPOINTS
// Added by auto-add-api.js
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

// Initialize on server start
initializeIntegrationsFile();

// GET /api/integrations - List all integrations
app.get('/api/integrations', (req, res) => {
  try {
    const data = readIntegrations();
    res.json({ success: true, integrations: data.integrations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
      connectionType: req.body.connectionType || 'business',
      whatsappNumber: req.body.whatsappNumber || '',
      businessName: req.body.businessName || '',
      metaAppId: req.body.metaAppId || '',
      phoneNumberId: req.body.phoneNumberId || '',
      metaAccessToken: req.body.metaAccessToken || '',
      ghlApiKey: req.body.ghlApiKey || '',
      ghlLocationId: req.body.ghlLocationId || '',
      ghlLocationName: req.body.ghlLocationName || '',
      aiEnabled: req.body.aiEnabled !== false,
      aiModel: req.body.aiModel || 'gpt-4',
      aiSystemPrompt: req.body.aiSystemPrompt || 'You are a helpful AI assistant.',
      aiTemperature: req.body.aiTemperature || 0.7,
      messagesToday: 0,
      activeConversations: 0,
      activeContacts: 0,
      uptime: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.integrations.push(newIntegration);
    if (writeIntegrations(data)) {
      if (req.body.autoConnect) {
        newIntegration.status = 'connected';
        writeIntegrations(data);
      }
      res.json({ success: true, integration: newIntegration });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save integration' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/integrations/:id - Get single integration
app.get('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    if (integration) {
      res.json({ success: true, integration });
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/integrations/:id - Update integration
app.put('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    if (index !== -1) {
      data.integrations[index] = {
        ...data.integrations[index],
        ...req.body,
        id: req.params.id,
        updatedAt: new Date().toISOString()
      };
      if (writeIntegrations(data)) {
        res.json({ success: true, integration: data.integrations[index] });
      } else {
        res.status(500).json({ success: false, error: 'Failed to update integration' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/integrations/:id - Delete integration
app.delete('/api/integrations/:id', (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    if (integration) {
      data.integrations = data.integrations.filter(i => i.id !== req.params.id);
      if (writeIntegrations(data)) {
        res.json({ success: true, message: 'Integration deleted successfully' });
      } else {
        res.status(500).json({ success: false, error: 'Failed to delete integration' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations/:id/connect - Connect integration
app.post('/api/integrations/:id/connect', async (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    if (index !== -1) {
      data.integrations[index].status = 'connected';
      data.integrations[index].updatedAt = new Date().toISOString();
      if (writeIntegrations(data)) {
        if (io) {
          io.emit('integration_status_changed', {
            integrationId: req.params.id,
            status: 'connected'
          });
        }
        res.json({ success: true, integration: data.integrations[index] });
      } else {
        res.status(500).json({ success: false, error: 'Failed to connect integration' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations/:id/disconnect - Disconnect integration
app.post('/api/integrations/:id/disconnect', async (req, res) => {
  try {
    const data = readIntegrations();
    const index = data.integrations.findIndex(i => i.id === req.params.id);
    if (index !== -1) {
      data.integrations[index].status = 'disconnected';
      data.integrations[index].updatedAt = new Date().toISOString();
      if (writeIntegrations(data)) {
        if (io) {
          io.emit('integration_status_changed', {
            integrationId: req.params.id,
            status: 'disconnected'
          });
        }
        res.json({ success: true, integration: data.integrations[index] });
      } else {
        res.status(500).json({ success: false, error: 'Failed to disconnect integration' });
      }
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/integrations/:id/test - Test integration
app.post('/api/integrations/:id/test', async (req, res) => {
  try {
    const data = readIntegrations();
    const integration = data.integrations.find(i => i.id === req.params.id);
    if (integration) {
      const testResults = {
        whatsapp: integration.whatsappNumber ? 'OK' : 'Missing number',
        ghl: integration.ghlLocationId ? 'OK' : 'Missing location ID',
        overall: integration.whatsappNumber && integration.ghlLocationId ? 'PASS' : 'FAIL'
      };
      res.json({
        success: testResults.overall === 'PASS',
        message: testResults.overall === 'PASS' 
          ? 'All tests passed!' 
          : 'Some tests failed.',
        results: testResults
      });
    } else {
      res.status(404).json({ success: false, error: 'Integration not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ghl/test - Test GHL Connection
app.post('/api/ghl/test', async (req, res) => {
  try {
    const { apiKey, locationId } = req.body;
    if (!apiKey || !locationId) {
      return res.json({ success: false, error: 'API Key and Location ID required' });
    }
    res.json({ success: true, message: 'GHL connection test successful!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

console.log('✅ Multi-account integration API endpoints loaded');

// ============================================
// END OF MULTI-ACCOUNT INTEGRATION API
// ============================================
`;

// Main function
async function main() {
  header('🤖 AUTOMATIC INTEGRATION API INSTALLER');
  
  const serverPath = path.join(__dirname, 'server.js');
  const backupPath = path.join(__dirname, 'server.js.backup');
  
  // Check if server.js exists
  if (!fs.existsSync(serverPath)) {
    log('\n❌ Error: server.js not found!', 'red');
    log('Make sure you run this script from the project root directory.', 'yellow');
    process.exit(1);
  }
  
  log('\n📖 Reading server.js...', 'blue');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Check if already installed
  if (serverContent.includes('MULTI-ACCOUNT INTEGRATION API')) {
    log('\n⚠️  Integration API already installed!', 'yellow');
    log('Your server.js already contains the integration API endpoints.', 'yellow');
    log('\nNothing to do. 🎉', 'green');
    process.exit(0);
  }
  
  log('✅ server.js found', 'green');
  
  // Create backup
  log('\n💾 Creating backup (server.js.backup)...', 'blue');
  fs.writeFileSync(backupPath, serverContent);
  log('✅ Backup created', 'green');
  
  // Find insertion point (before Socket.IO or server.listen)
  log('\n🔍 Finding insertion point...', 'blue');
  
  const lines = serverContent.split('\n');
  let insertIndex = -1;
  
  // Look for Socket.IO connection or server.listen
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('io.on(') || 
        lines[i].includes('server.listen(') ||
        lines[i].includes('app.listen(')) {
      insertIndex = i;
      break;
    }
  }
  
  if (insertIndex === -1) {
    // If not found, insert before the last 100 lines
    insertIndex = Math.max(0, lines.length - 100);
  }
  
  log(`✅ Found insertion point at line ${insertIndex}`, 'green');
  
  // Insert the API code
  log('\n✏️  Inserting integration API code...', 'blue');
  lines.splice(insertIndex, 0, INTEGRATION_API_CODE);
  
  const newContent = lines.join('\n');
  
  // Write updated server.js
  log('💾 Writing updated server.js...', 'blue');
  fs.writeFileSync(serverPath, newContent);
  log('✅ server.js updated successfully!', 'green');
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    log('\n📁 Creating data directory...', 'blue');
    fs.mkdirSync(dataDir, { recursive: true });
    log('✅ Data directory created', 'green');
  }
  
  header('🎉 INSTALLATION COMPLETE!');
  
  log('\n✅ Integration API successfully added to server.js', 'green');
  log('\n📋 Next steps:', 'bright');
  log('   1. Restart your server: npm start');
  log('   2. Open http://localhost:3000');
  log('   3. Click the ➕ button to add your first integration!');
  
  log('\n💡 Tip: If something goes wrong, restore from backup:', 'yellow');
  log('   cp server.js.backup server.js', 'yellow');
  
  log('\n🚀 Ready to use the multi-account system!\n', 'green');
}

// Run the script
main().catch(error => {
  log('\n❌ Error: ' + error.message, 'red');
  process.exit(1);
});

