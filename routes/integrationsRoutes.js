const express = require('express');
const fs = require('fs').promises;
const path = require('path');

module.exports = () => {
  const router = express.Router();
  const integrationsFile = path.join(__dirname, '../data/integrations.json');

  // Helper function to read integrations
  async function readIntegrations() {
    try {
      const data = await fs.readFile(integrationsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Return empty array if file doesn't exist
      return [];
    }
  }

  // Helper function to write integrations
  async function writeIntegrations(integrations) {
    try {
      await fs.writeFile(integrationsFile, JSON.stringify(integrations, null, 2));
    } catch (error) {
      console.error('Error writing integrations:', error);
      throw error;
    }
  }

  // GET /api/integrations - List all integrations
  router.get('/', async (req, res) => {
    try {
      const data = await readIntegrations();
      const integrations = data.integrations || data || [];
      res.json({ 
        success: true, 
        integrations: integrations,
        count: integrations.length 
      });
    } catch (error) {
      console.error('Error loading integrations:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to load integrations',
        integrations: []
      });
    }
  });

  // POST /api/integrations - Create new integration
  router.post('/', async (req, res) => {
    try {
      const { name, ghlApiKey, ghlLocationId, whatsappNumber } = req.body;
      
      if (!name || !ghlApiKey || !ghlLocationId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: name, ghlApiKey, ghlLocationId' 
        });
      }

      const integrations = await readIntegrations();
      const newIntegration = {
        id: Date.now().toString(),
        name,
        ghlApiKey,
        ghlLocationId,
        whatsappNumber: whatsappNumber || '',
        status: 'disconnected',
        createdAt: new Date().toISOString(),
        lastSync: null,
        messageCount: 0,
        contactCount: 0
      };

      integrations.push(newIntegration);
      await writeIntegrations(integrations);

      res.json({ 
        success: true, 
        integration: newIntegration,
        message: 'Integration created successfully' 
      });
    } catch (error) {
      console.error('Error creating integration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create integration' 
      });
    }
  });

  // GET /api/integrations/:id - Get single integration
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrations = await readIntegrations();
      const integration = integrations.find(i => i.id === id);
      
      if (!integration) {
        return res.status(404).json({ 
          success: false, 
          error: 'Integration not found' 
        });
      }

      res.json({ 
        success: true, 
        integration 
      });
    } catch (error) {
      console.error('Error loading integration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to load integration' 
      });
    }
  });

  // PUT /api/integrations/:id - Update integration
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const integrations = await readIntegrations();
      const index = integrations.findIndex(i => i.id === id);
      
      if (index === -1) {
        return res.status(404).json({ 
          success: false, 
          error: 'Integration not found' 
        });
      }

      integrations[index] = { 
        ...integrations[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      
      await writeIntegrations(integrations);

      res.json({ 
        success: true, 
        integration: integrations[index],
        message: 'Integration updated successfully' 
      });
    } catch (error) {
      console.error('Error updating integration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update integration' 
      });
    }
  });

  // DELETE /api/integrations/:id - Delete integration
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const integrations = await readIntegrations();
      const index = integrations.findIndex(i => i.id === id);
      
      if (index === -1) {
        return res.status(404).json({ 
          success: false, 
          error: 'Integration not found' 
        });
      }

      integrations.splice(index, 1);
      await writeIntegrations(integrations);

      res.json({ 
        success: true, 
        message: 'Integration deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting integration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete integration' 
      });
    }
  });

  // POST /api/integrations/:id/connect - Connect integration
  router.post('/:id/connect', async (req, res) => {
    try {
      const { id } = req.params;
      const integrations = await readIntegrations();
      const index = integrations.findIndex(i => i.id === id);
      
      if (index === -1) {
        return res.status(404).json({ 
          success: false, 
          error: 'Integration not found' 
        });
      }

      // Simulate connection process
      integrations[index].status = 'connected';
      integrations[index].connectedAt = new Date().toISOString();
      integrations[index].lastSync = new Date().toISOString();
      
      await writeIntegrations(integrations);

      res.json({ 
        success: true, 
        integration: integrations[index],
        message: 'Integration connected successfully' 
      });
    } catch (error) {
      console.error('Error connecting integration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to connect integration' 
      });
    }
  });

  // POST /api/integrations/:id/disconnect - Disconnect integration
  router.post('/:id/disconnect', async (req, res) => {
    try {
      const { id } = req.params;
      const integrations = await readIntegrations();
      const index = integrations.findIndex(i => i.id === id);
      
      if (index === -1) {
        return res.status(404).json({ 
          success: false, 
          error: 'Integration not found' 
        });
      }

      integrations[index].status = 'disconnected';
      integrations[index].disconnectedAt = new Date().toISOString();
      
      await writeIntegrations(integrations);

      res.json({ 
        success: true, 
        integration: integrations[index],
        message: 'Integration disconnected successfully' 
      });
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to disconnect integration' 
      });
    }
  });

  // POST /api/integrations/:id/test - Test integration
  router.post('/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      const integrations = await readIntegrations();
      const integration = integrations.find(i => i.id === id);
      
      if (!integration) {
        return res.status(404).json({ 
          success: false, 
          error: 'Integration not found' 
        });
      }

      // Simulate test process
      const testResult = {
        ghlConnection: true,
        whatsappConnection: integration.status === 'connected',
        apiKey: integration.ghlApiKey ? 'Valid' : 'Invalid',
        locationId: integration.ghlLocationId ? 'Valid' : 'Invalid',
        timestamp: new Date().toISOString()
      };

      res.json({ 
        success: true, 
        testResult,
        message: 'Integration test completed' 
      });
    } catch (error) {
      console.error('Error testing integration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to test integration' 
      });
    }
  });

  // POST /api/integrations/:id/sync - Force sync with GHL
  router.post('/:id/sync', async (req, res) => {
    try {
      const { id } = req.params;
      const integrations = await readIntegrations();
      const index = integrations.findIndex(i => i.id === id);
      
      if (index === -1) {
        return res.status(404).json({ 
          success: false, 
          error: 'Integration not found' 
        });
      }

      // Simulate sync process
      integrations[index].lastSync = new Date().toISOString();
      integrations[index].messageCount = Math.floor(Math.random() * 100) + integrations[index].messageCount;
      integrations[index].contactCount = Math.floor(Math.random() * 50) + integrations[index].contactCount;
      
      await writeIntegrations(integrations);

      res.json({ 
        success: true, 
        integration: integrations[index],
        message: 'Sync completed successfully' 
      });
    } catch (error) {
      console.error('Error syncing integration:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to sync integration' 
      });
    }
  });

  return router;
};