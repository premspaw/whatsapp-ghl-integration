const express = require('express');

module.exports = (aiService, mcpAIService, enhancedAIService, tenantService) => {
  const router = express.Router();

  // Minimal health endpoint to prevent startup crash
  router.get('/health', (req, res) => {
    const stats = enhancedAIService && enhancedAIService.getConversationStats
      ? enhancedAIService.getConversationStats()
      : {};
    res.json({ success: true, service: 'ai', stats, timestamp: Date.now() });
  });

  // Website training endpoint
  router.post('/train-website', async (req, res) => {
    try {
      const { websiteUrl, description, category } = req.body;
      // Resolve tenantId from request context
      let tenantId = null;
      try { tenantId = tenantService ? await tenantService.resolveTenantId({ req }) : null; } catch (_) {}
      
      if (!websiteUrl) {
        return res.status(400).json({
          success: false,
          error: 'Website URL is required'
        });
      }

      // Validate URL format
      try {
        new URL(websiteUrl);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format'
        });
      }

      console.log(`🌐 Training AI from website: ${websiteUrl}`);

      const trainingResult = await enhancedAIService.trainFromWebsite(
        websiteUrl,
        description || '',
        category || 'general',
        tenantId
      );

      if (trainingResult.success) {
        res.json({
          success: true,
          message: 'Website content successfully added to knowledge base',
          result: trainingResult
        });
      } else {
        res.status(500).json({
          success: false,
          error: trainingResult.error || 'Failed to train from website'
        });
      }

    } catch (error) {
      console.error('Error training from website:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Get training history
  router.get('/training-history', async (req, res) => {
    try {
      const trainingHistory = enhancedAIService.getTrainingHistory();
      
      res.json({
        success: true,
        history: trainingHistory,
        total: trainingHistory.length
      });
    } catch (error) {
      console.error('Error fetching training history:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Delete training record
  router.delete('/training-history/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await enhancedAIService.deleteTrainingRecord(id);
      
      if (success) {
        res.json({
          success: true,
          message: 'Training record deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Training record not found'
        });
      }
    } catch (error) {
      console.error('Error deleting training record:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Get knowledge base items
  router.get('/knowledge', async (req, res) => {
    try {
      const knowledgeItems = enhancedAIService.getKnowledgeBase();
      
      res.json({
        success: true,
        knowledge: knowledgeItems,
        total: knowledgeItems.length
      });
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Add knowledge item manually
  router.post('/knowledge', async (req, res) => {
    try {
      const { title, content, category } = req.body;
      // Resolve tenantId from request context
      let tenantId = null;
      try { tenantId = tenantService ? await tenantService.resolveTenantId({ req }) : null; } catch (_) {}
      
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: 'Title and content are required'
        });
      }

      const id = `manual-${Date.now()}`;
      await enhancedAIService.addKnowledgeItem(id, title, content, category || 'general', tenantId);
      
      res.json({
        success: true,
        message: 'Knowledge item added successfully',
        id: id
      });
    } catch (error) {
      console.error('Error adding knowledge item:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Delete knowledge item
  router.delete('/knowledge/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await enhancedAIService.deleteKnowledgeItem(id);
      
      if (success) {
        res.json({
          success: true,
          message: 'Knowledge item deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Knowledge item not found'
        });
      }
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // AI Toggle endpoint
  router.post('/toggle', async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ success: false, error: 'enabled must be boolean' });
      }

      // Update in-memory personality immediately
      if (enhancedAIService && typeof enhancedAIService.updatePersonality === 'function') {
        enhancedAIService.updatePersonality({ aiEnabled: enabled });
      }

      // Persist to personality file
      const fs = require('fs');
      const path = require('path');
      const personalityPath = path.join(__dirname, '..', 'data', 'ai-personality.json');
      let personality = {};
      try {
        if (fs.existsSync(personalityPath)) {
          personality = JSON.parse(fs.readFileSync(personalityPath, 'utf8'));
        }
      } catch (_) {}
      personality.aiEnabled = enabled;
      // Keep existing or default ignoreBusinessHours to true unless set
      if (typeof personality.ignoreBusinessHours !== 'boolean') {
        personality.ignoreBusinessHours = true;
      }
      personality.lastUpdated = new Date().toISOString();
      fs.writeFileSync(personalityPath, JSON.stringify(personality, null, 2));

      console.log(`🤖 AI ${enabled ? 'enabled' : 'disabled'} via dashboard`);
      res.json({ success: true, message: `AI ${enabled ? 'enabled' : 'disabled'} successfully`, enabled });
    } catch (error) {
      console.error('Error toggling AI:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Test AI contextual response
  router.post('/test-contextual', async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({
          success: false,
          error: 'Phone number and message are required'
        });
      }

      // Mock AI response for testing
      const mockResponse = {
        success: true,
        response: `Hello! I received your message: "${message}". This is a test response from the AI system.`,
        phoneNumber: phoneNumber,
        timestamp: new Date().toISOString(),
        userProfile: {
          name: 'Test User',
          phone: phoneNumber,
          lastSeen: new Date().toISOString()
        },
        memoryUsed: {
          conversationHistory: 3,
          knowledgeBase: enhancedAIService ? enhancedAIService.getKnowledgeBase().length : 0,
          contextLength: message.length
        }
      };

      res.json(mockResponse);
    } catch (error) {
      console.error('Error testing AI:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Direct Enhanced AI processing endpoint
  router.post('/enhanced/process', async (req, res) => {
    try {
      const { message, phoneNumber, contactId } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      // Resolve tenantId if available
      let tenantId = null;
      try { tenantId = tenantService ? await tenantService.resolveTenantId({ phone: phoneNumber, req }) : null; } catch (_) {}

      const convId = contactId || `test-${Date.now()}`;
      const phone = phoneNumber || 'anonymous';

      const reply = await enhancedAIService.generateContextualReply(message, phone, convId, tenantId);
      res.json({ success: true, query: message, reply, conversationId: convId, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error in enhanced/process:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // RAG-first test chat endpoint
  router.post('/test-chat', async (req, res) => {
    try {
      const { message, phoneNumber = '+1234567890', conversationId = `test-${Date.now()}` } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      // Resolve tenantId (optional)
      let tenantId = null;
      try { tenantId = tenantService ? await tenantService.resolveTenantId({ phone: phoneNumber, req }) : null; } catch (_) {}

      // Generate contextual reply using enhanced AI
      const reply = await enhancedAIService.generateContextualReply(message, phoneNumber, conversationId, tenantId);

      // Retrieve RAG metadata (vectors with keyword fallback)
      let retrieval = [];
      try {
        retrieval = await enhancedAIService.safeRetrieveEmbeddings(message, conversationId, null, 0.2, tenantId, 5);
      } catch (e) {
        retrieval = [];
      }

      // Compose response with grounding info
      res.json({
        success: true,
        reply,
        query: message,
        phoneNumber,
        conversationId,
        retrievalCount: Array.isArray(retrieval) ? retrieval.length : 0,
        retrieval,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in test-chat:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get AI personality (with persistent storage) and AI-focused stats
  router.get('/personality', (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const personalityPath = path.join(__dirname, '..', 'data', 'ai-personality.json');
      const conversationsPath = path.join(__dirname, '..', 'data', 'conversations.json');

      // Load personality
      let personality;
      if (fs.existsSync(personalityPath)) {
        const data = fs.readFileSync(personalityPath, 'utf8');
        personality = JSON.parse(data);
      } else {
        personality = {
          name: 'WhatsApp AI Assistant',
          role: 'Customer Support Agent',
          company: 'Your Business',
          tone: 'Professional and Friendly',
          traits: ['Helpful', 'Responsive', 'Knowledgeable']
        };
      }

      // Ensure toggle flags exist with sane defaults
      if (typeof personality.aiEnabled !== 'boolean') {
        personality.aiEnabled = true;
      }
      if (typeof personality.ignoreBusinessHours !== 'boolean') {
        personality.ignoreBusinessHours = true;
      }

      // Compute AI-centric stats from conversations.json
      let aiReplies = 0;
      let aiConversations = 0;
      let responseTimes = [];

      if (fs.existsSync(conversationsPath)) {
        try {
          const cdata = fs.readFileSync(conversationsPath, 'utf8');
          const conversations = JSON.parse(cdata);
          // conversations is an object keyed by id/phone
          for (const key of Object.keys(conversations)) {
            const convo = conversations[key];
            const msgs = Array.isArray(convo?.messages) ? convo.messages.slice() : [];
            if (msgs.length === 0) continue;

            // Sort by timestamp to ensure order
            msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            let hasAI = false;
            for (let i = 0; i < msgs.length; i++) {
              const m = msgs[i];
              if (m.from === 'ai') {
                aiReplies++;
                hasAI = true;
              }
            }

            // Compute response time: for each inbound user message, find next AI message
            for (let i = 0; i < msgs.length; i++) {
              const m = msgs[i];
              if (m.from === 'user' && m.direction === 'inbound') {
                // find next AI message after this index
                for (let j = i + 1; j < msgs.length; j++) {
                  const n = msgs[j];
                  if (n.from === 'ai') {
                    const t1 = m.timestamp || 0;
                    const t2 = n.timestamp || 0;
                    if (t2 > t1 && t1 > 0) {
                      responseTimes.push(t2 - t1);
                    }
                    break;
                  }
                }
              }
            }

            if (hasAI) aiConversations++;
          }
        } catch (e) {
          console.warn('Failed to compute AI stats from conversations.json:', e.message);
        }
      }

      // Average response time in seconds
      let averageResponseTime = 'N/A';
      if (responseTimes.length > 0) {
        const avgMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const secs = Math.max(0, Math.round(avgMs / 1000));
        averageResponseTime = `${secs}s`;
      }

      // Populate sensible defaults for brand fields
      const defaults = {
        website: personality.website || 'https://www.yourbusiness.com',
        supportEmail: personality.supportEmail || '',
        supportPhone: personality.supportPhone || '',
        supportLink: personality.supportLink || '',
        address: personality.address || '',
        businessHours: personality.businessHours || ''
      };
      // Ensure faqTemplates exists with empty defaults
      const faqDefaults = {
        companyName: (personality.faqTemplates && personality.faqTemplates.companyName) || '',
        website: (personality.faqTemplates && personality.faqTemplates.website) || '',
        contactSupport: (personality.faqTemplates && personality.faqTemplates.contactSupport) || '',
        businessHours: (personality.faqTemplates && personality.faqTemplates.businessHours) || '',
        address: (personality.faqTemplates && personality.faqTemplates.address) || ''
      };
      const merged = { ...personality, ...defaults, faqTemplates: { ...(personality.faqTemplates || {}), ...faqDefaults } };

      res.json({
        success: true,
        personality: merged,
        stats: {
          aiReplies,
          aiConversations,
          averageResponseTime
        }
      });
    } catch (error) {
      console.error('Error loading AI personality:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Update AI personality (with persistent storage, brand fields, and sanitation)
  router.post('/personality', async (req, res) => {
    try {
      const {
        name,
        role,
        company,
        tone,
        traits,
        website,
        supportEmail,
        supportPhone,
        supportLink,
        address,
        businessHours
      } = req.body || {};

      const hasFaqUpdate = req.body && typeof req.body.faqTemplates === 'object';
      if (!hasFaqUpdate && (!name || !role || !company || !tone)) {
        return res.status(400).json({ success: false, error: 'name, role, company, tone are required' });
      }

      // Simple sanitation helpers
      const sanitizeString = (v) => {
        if (typeof v !== 'string') return '';
        return String(v)
          .replace(/[`]/g, '') // remove backticks
          .replace(/[\r\n]+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
      };
      const sanitizeArray = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((x) => sanitizeString(x)).filter(Boolean);
      };
      const normalizeWebsite = (url) => {
        const val = sanitizeString(url);
        if (!val) return '';
        const clean = val.replace(/^\/+/, '');
        if (!/^https?:\/\//i.test(clean)) return `https://${clean}`;
        return clean;
      };
      const normalizePhone = (phone) => {
        const val = sanitizeString(phone);
        if (!val) return '';
        // Remove non-digits except leading +
        const cleaned = val.replace(/(?!^)[^\d]/g, '');
        // If starts with + already, keep; else attempt to add + if it looks like country code + number
        if (/^\+\d{6,}$/.test(val)) return val;
        if (/^\d{6,}$/.test(cleaned)) return `+${cleaned}`;
        return val; // fallback to original sanitized
      };

      const payload = {};
      if (name !== undefined) payload.name = sanitizeString(name);
      if (role !== undefined) payload.role = sanitizeString(role);
      if (company !== undefined) payload.company = sanitizeString(company);
      if (tone !== undefined) payload.tone = sanitizeString(tone);
      if (traits !== undefined) payload.traits = sanitizeArray(traits);
      if (website !== undefined) payload.website = normalizeWebsite(website || '');
      if (supportEmail !== undefined) payload.supportEmail = sanitizeString(supportEmail || '');
      if (supportPhone !== undefined) payload.supportPhone = normalizePhone(supportPhone || '');
      if (supportLink !== undefined) payload.supportLink = normalizeWebsite(supportLink || '');
      if (address !== undefined) payload.address = sanitizeString(address || '');
      if (businessHours !== undefined) payload.businessHours = sanitizeString(businessHours || '');
      payload.lastUpdated = new Date().toISOString();

      console.log('🤖 Updating AI personality (sanitized):', {
        name: payload.name,
        role: payload.role,
        company: payload.company,
        tone: payload.tone,
        website: payload.website,
        supportEmail: payload.supportEmail,
        supportPhone: payload.supportPhone,
        supportLink: payload.supportLink,
        address: payload.address,
        businessHours: payload.businessHours,
        traits: payload.traits
      });

      const fs = require('fs');
      const path = require('path');
      const personalityPath = path.join(__dirname, '..', 'data', 'ai-personality.json');

      // Merge with existing file to preserve unknown future fields
      let existing = {};
      try {
        if (fs.existsSync(personalityPath)) {
          existing = JSON.parse(fs.readFileSync(personalityPath, 'utf8')) || {};
        }
      } catch (_) {}

      const personalityData = { ...existing, ...payload };
      // Merge FAQ templates if provided
      if (hasFaqUpdate) {
        const sanitizeFAQ = (obj) => {
          const out = {};
          if (obj && typeof obj === 'object') {
            const allowed = ['companyName','website','contactSupport','businessHours','address'];
            for (const key of allowed) {
              if (obj[key] !== undefined) out[key] = sanitizeString(obj[key]);
            }
          }
          return out;
        };
        personalityData.faqTemplates = { ...(existing.faqTemplates || {}), ...sanitizeFAQ(req.body.faqTemplates) };
      }
      // Keep toggle flags stable
      if (typeof personalityData.aiEnabled !== 'boolean') personalityData.aiEnabled = true;
      if (typeof personalityData.ignoreBusinessHours !== 'boolean') personalityData.ignoreBusinessHours = true;

      fs.writeFileSync(personalityPath, JSON.stringify(personalityData, null, 2));

      // Update in-memory personality immediately
      try {
        if (enhancedAIService && typeof enhancedAIService.updatePersonality === 'function') {
          enhancedAIService.updatePersonality(personalityData);
        }
      } catch (_) {}

      res.json({ success: true, message: 'AI personality updated successfully', personality: personalityData });
    } catch (error) {
      console.error('Error updating AI personality:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Test website content extraction
  router.post('/test-website', async (req, res) => {
    try {
      const { websiteUrl } = req.body;
      
      if (!websiteUrl) {
        return res.status(400).json({
          success: false,
          error: 'Website URL is required'
        });
      }

      // Validate URL format
      try {
        new URL(websiteUrl);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format'
        });
      }

      console.log(`🌐 Testing website content extraction: ${websiteUrl}`);

      // Mock website test result
      const mockResult = {
        success: true,
        extractedContent: {
          title: 'Sample Website Title',
          description: 'This is a sample description extracted from the website.',
          content: 'Sample content extracted from the website. This would normally contain the actual text content from the provided URL.',
          wordCount: 150,
          url: websiteUrl
        },
        processingTime: '1.2s',
        timestamp: new Date().toISOString()
      };

      res.json(mockResult);
    } catch (error) {
      console.error('Error testing website:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  return router;
};