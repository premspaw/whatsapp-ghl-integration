const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const EmbeddingsService = require('./embeddingsService');

class EnhancedAIService extends EventEmitter {
  constructor(ghlService) {
    super();
    this.ghlService = ghlService;
    this.conversationMemory = new Map(); // Store conversations per user
    this.userProfiles = new Map(); // Cache user details from GHL
    this.knowledgeBase = new Map(); // Store knowledge base items
    this.templates = new Map(); // Store message templates
    this.automationRules = new Map(); // Store automation triggers
    this.maxConversationsPerUser = 10; // Store up to 10 conversations per user
    this.conversationContextWindow = 5; // Number of previous conversations to include in context
    this.knowledgeBasePath = path.join(__dirname, '..', 'data', 'knowledge-base.json');
    this.templatesPath = path.join(__dirname, '..', 'data', 'templates.json');
    this.automationPath = path.join(__dirname, '..', 'data', 'automation.json');
    this.handoffKeywords = ['human', 'agent'];
    
    this.aiPersonality = {
      name: "Sarah",
      role: "Customer Success Manager", 
      company: "Your Business",
      tone: "friendly and professional",
      traits: ["helpful", "empathetic", "solution-oriented", "knowledgeable"]
    };
    
    this.loadKnowledgeBase();
    this.loadTemplates();
    this.loadAutomationRules();
    this.embeddings = new EmbeddingsService();
  }

  // Memory Management
  async loadConversationMemory(phoneNumber) {
    try {
      const memory = this.conversationMemory.get(phoneNumber) || [];
      return memory.slice(-this.maxConversationsPerUser); // Keep last 10 conversations
    } catch (error) {
      console.error('Error loading conversation memory:', error);
      return [];
    }
  }

  async storeConversation(phoneNumber, userMessage, aiResponse) {
    try {
      const memory = this.conversationMemory.get(phoneNumber) || [];
      memory.push({
        timestamp: Date.now(),
        user: userMessage,
        ai: aiResponse
      });
      
      // Keep only last 10 conversations
      if (memory.length > this.maxConversationsPerUser) {
        memory.shift();
      }
      
      this.conversationMemory.set(phoneNumber, memory);
      console.log(`🧠 Stored conversation for ${phoneNumber}. Memory size: ${memory.length}`);
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  }

  // Enhanced AI Reply with Memory
  async generateContextualReply(message, phoneNumber, conversationId) {
    try {
      console.log('🧠 Enhanced AI generating contextual reply for', phoneNumber);

      // Human handoff bypass: emit event and skip AI when keywords detected
      if (this.isHandoffRequested(message)) {
        this.emit('handoff', { phoneNumber, conversationId, message });
        return null;
      }
      
      // Load conversation memory
      const memory = await this.loadConversationMemory(phoneNumber);
      
      // Get user profile from GHL
      const userProfile = await this.getUserProfileFromGHL(phoneNumber);
      
      // Retrieve vector matches (RAG)
      const vectorMatches = await this.safeRetrieveEmbeddings(message, conversationId);
      const relevantKnowledge = vectorMatches.length > 0
        ? vectorMatches.map(m => ({ title: m.source_type || 'doc', content: m.text }))
        : this.searchKnowledgeBase(message);
      
      // Generate contextual reply
      const reply = await this.generateEnhancedReply(message, userProfile, memory, relevantKnowledge);
      
      // Store this conversation in memory
      await this.storeConversation(phoneNumber, message, reply);
      
      return reply;
    } catch (error) {
      console.error('Error generating contextual reply:', error);
      return this.getFallbackResponse(message);
    }
  }

  async safeRetrieveEmbeddings(query, conversationId) {
    try {
      if (!this.embeddings) return [];
      const results = await this.embeddings.retrieve({ query, topK: 5, conversationId: null });
      return Array.isArray(results) ? results : [];
    } catch (e) {
      return [];
    }
  }

  // Detect human handoff intent based on keywords
  isHandoffRequested(message) {
    try {
      if (!message || typeof message !== 'string') return false;
      const lower = message.toLowerCase();
      return this.handoffKeywords.some(k => lower.includes(k));
    } catch (e) {
      return false;
    }
  }

  // Get user profile from GHL
  async getUserProfileFromGHL(phoneNumber) {
    try {
      const normalizedPhone = this.ghlService.normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone) return null;
      
      const contact = await this.ghlService.findContactByPhone(normalizedPhone);
      if (contact) {
        return {
          name: contact.firstName || contact.name || 'Unknown',
          email: contact.email,
          phone: contact.phone,
          tags: contact.tags || [],
          customFields: contact.customFields || {}
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile from GHL:', error);
      return null;
    }
  }

  // Search knowledge base
  searchKnowledgeBase(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [id, item] of this.knowledgeBase) {
      if (item.content.toLowerCase().includes(lowerQuery) || 
          item.title.toLowerCase().includes(lowerQuery)) {
        results.push(item);
      }
    }
    
    return results.slice(0, 3); // Return top 3 relevant items
  }

  // Generate enhanced reply with memory and knowledge
  async generateEnhancedReply(message, userProfile, memory, relevantKnowledge) {
    try {
      // Build context from memory - use more context (up to this.conversationContextWindow)
      const contextMessages = memory.slice(-this.conversationContextWindow).map(m => 
        `User: ${m.user}\nAI: ${m.ai}`
      ).join('\n\n');
      
      // Build user context with more details if available
      const userContext = userProfile ? 
        `User: ${userProfile.name} (${userProfile.email || 'No email'}, Phone: ${userProfile.phone || 'Unknown'})
User Tags: ${userProfile.tags ? userProfile.tags.join(', ') : 'None'}
Custom Fields: ${userProfile.customFields ? JSON.stringify(userProfile.customFields) : 'None'}` : 
        'User: Unknown Contact';
      
      // Build knowledge context with more complete information
      const knowledgeContext = relevantKnowledge.length > 0 ?
        `Relevant Information:\n${relevantKnowledge.map(k => `- ${k.title}: ${k.content.substring(0, 200)}...`).join('\n\n')}` :
        '';
      
      // Generate contextual prompt with enhanced context
      const prompt = this.buildEnhancedContextPrompt(message, userContext, contextMessages, knowledgeContext);
      
      // For now, use simple AI logic (you can integrate with OpenAI/Claude later)
      // In production, this would call an external AI API with the prompt
      return this.generateSimpleContextualReply(message, userProfile, memory, relevantKnowledge);
      
    } catch (error) {
      console.error('Error generating enhanced reply:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Build enhanced context prompt
  buildEnhancedContextPrompt(message, userContext, contextMessages, knowledgeContext) {
    return `
You are ${this.aiPersonality.name}, a ${this.aiPersonality.role} at ${this.aiPersonality.company}.
Your personality: ${this.aiPersonality.tone} and ${this.aiPersonality.traits.join(', ')}.

${userContext}

${contextMessages ? `Previous conversation context:\n${contextMessages}\n` : ''}

${knowledgeContext}

Current message: ${message}

Respond as ${this.aiPersonality.name} would, using the context and knowledge above to provide a helpful, personalized response.
    `.trim();
  }

  // Generate simple contextual reply (fallback)
  generateSimpleContextualReply(message, userProfile, memory, relevantKnowledge) {
    const userName = userProfile ? userProfile.name : 'there';
    const lowerMessage = message.toLowerCase();
    
    // Use memory for context
    const recentTopics = memory.slice(-3).map(m => m.user.toLowerCase());
    const isFollowUp = recentTopics.some(topic => 
      topic.includes('help') || topic.includes('question') || topic.includes('problem')
    );
    
    // Generate contextual responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello ${userName}! How can I help you today?`;
    } else if (lowerMessage.includes('help')) {
      return `I'm here to help you, ${userName}! What specific assistance do you need?`;
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return `I'd be happy to discuss pricing with you, ${userName}. Let me connect you with our sales team.`;
    } else if (lowerMessage.includes('thank')) {
      return `You're very welcome, ${userName}! Is there anything else I can help you with?`;
    } else if (isFollowUp) {
      return `I understand you're looking for help, ${userName}. Can you tell me more about what you need assistance with?`;
    } else {
      return `Hello ${userName}! Thanks for reaching out. How can I help you today?`;
    }
  }

  // Template Management
  async loadTemplates() {
    try {
      const data = await fs.readFile(this.templatesPath, 'utf8');
      const templates = JSON.parse(data);
      this.templates = new Map(Object.entries(templates));
      console.log('📝 Loaded templates:', this.templates.size);
    } catch (error) {
      console.log('No templates file found, starting fresh');
      this.templates = new Map();
    }
  }

  async saveTemplates() {
    try {
      const templatesObj = Object.fromEntries(this.templates);
      await fs.writeFile(this.templatesPath, JSON.stringify(templatesObj, null, 2));
      console.log('💾 Templates saved');
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  async addTemplate(id, name, content, category = 'general', mediaUrl = '', mediaType = '') {
    this.templates.set(id, {
      id,
      name,
      content,
      category,
      mediaUrl,
      mediaType,
      createdAt: Date.now()
    });
    await this.saveTemplates();
    console.log(`📝 Added template: ${name}`);
  }

  async getTemplate(id) {
    return this.templates.get(id);
  }

  async getAllTemplates() {
    return Array.from(this.templates.values());
  }

  async deleteTemplate(id) {
    this.templates.delete(id);
    await this.saveTemplates();
    console.log(`🗑️ Deleted template: ${id}`);
  }

  // Automation Rules
  async loadAutomationRules() {
    try {
      const data = await fs.readFile(this.automationPath, 'utf8');
      const rules = JSON.parse(data);
      this.automationRules = new Map(Object.entries(rules));
      console.log('🤖 Loaded automation rules:', this.automationRules.size);
    } catch (error) {
      console.log('No automation rules file found, starting fresh');
      this.automationRules = new Map();
    }
  }

  async saveAutomationRules() {
    try {
      const rulesObj = Object.fromEntries(this.automationRules);
      await fs.writeFile(this.automationPath, JSON.stringify(rulesObj, null, 2));
      console.log('💾 Automation rules saved');
    } catch (error) {
      console.error('Error saving automation rules:', error);
    }
  }

  async addAutomationRule(id, name, trigger, templateId, conditions = {}) {
    this.automationRules.set(id, {
      id,
      name,
      trigger,
      templateId,
      conditions,
      enabled: true,
      createdAt: Date.now()
    });
    await this.saveAutomationRules();
    console.log(`🤖 Added automation rule: ${name}`);
  }

  async checkAutomationTriggers(message, phoneNumber, userProfile) {
    try {
      const triggeredRules = [];
      
      for (const [id, rule] of this.automationRules) {
        if (!rule.enabled) continue;
        
        let shouldTrigger = false;
        
        // Check trigger conditions
        switch (rule.trigger) {
          case 'keyword':
            shouldTrigger = rule.conditions.keywords.some(keyword => 
              message.toLowerCase().includes(keyword.toLowerCase())
            );
            break;
          case 'time':
            shouldTrigger = this.checkTimeCondition(rule.conditions);
            break;
          case 'user_tag':
            shouldTrigger = userProfile && userProfile.tags.some(tag => 
              rule.conditions.tags.includes(tag)
            );
            break;
          case 'message_count':
            const memory = await this.loadConversationMemory(phoneNumber);
            shouldTrigger = memory.length >= rule.conditions.minMessages;
            break;
        }
        
        if (shouldTrigger) {
          triggeredRules.push(rule);
        }
      }
      
      return triggeredRules;
    } catch (error) {
      console.error('Error checking automation triggers:', error);
      return [];
    }
  }

  checkTimeCondition(conditions) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    if (conditions.hours && !conditions.hours.includes(hour)) return false;
    if (conditions.days && !conditions.days.includes(day)) return false;
    
    return true;
  }

  async executeAutomation(rule, phoneNumber, userProfile) {
    try {
      const template = await this.getTemplate(rule.templateId);
      if (!template) {
        console.error(`Template not found: ${rule.templateId}`);
        return null;
      }
      
      // Replace template variables using GHL profile data
      let message = this.applyTemplateVariables(template.content, userProfile);
      
      console.log(`🤖 Executing automation: ${rule.name} -> ${message.substring(0, 50)}...`);
      return message;
    } catch (error) {
      console.error('Error executing automation:', error);
      return null;
    }
  }

  applyTemplateVariables(templateText, userProfile) {
    try {
      let result = String(templateText ?? '');
      const profile = userProfile || {};

      // Basic fields
      const baseVars = {
        name: profile.name || 'there',
        email: profile.email || '',
        phone: profile.phone || '',
        tags: Array.isArray(profile.tags) ? profile.tags.join(', ') : ''
      };

      // Apply base vars
      for (const [key, val] of Object.entries(baseVars)) {
        const re = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(re, val);
      }

      // Custom fields: support both object map and array forms
      const customFields = profile.customFields || {};
      const customMap = {};
      if (Array.isArray(customFields)) {
        for (const cf of customFields) {
          const k = (cf.key || cf.name || cf.id || '').toString();
          const v = (cf.field_value || cf.value || '').toString();
          if (k) customMap[k] = v;
        }
      } else if (customFields && typeof customFields === 'object') {
        for (const [k, v] of Object.entries(customFields)) {
          customMap[k] = (v && v.field_value !== undefined) ? String(v.field_value) : String(v);
        }
      }

      // Replace {cf.<key>} and {cf_<key>}
      result = result.replace(/\{cf\.([a-zA-Z0-9_\-]+)\}/g, (_, key) => customMap[key] ?? '');
      result = result.replace(/\{cf_([a-zA-Z0-9_\-]+)\}/g, (_, key) => customMap[key] ?? '');

      return result;
    } catch (e) {
      return String(templateText ?? '');
    }
  }

  // Knowledge Base Management
  async loadKnowledgeBase() {
    try {
      const data = await fs.readFile(this.knowledgeBasePath, 'utf8');
      const knowledge = JSON.parse(data);
      this.knowledgeBase = new Map(Object.entries(knowledge));
      console.log('📚 Loaded knowledge base:', this.knowledgeBase.size);
    } catch (error) {
      console.log('No knowledge base file found, starting fresh');
      this.knowledgeBase = new Map();
    }
  }

  async saveKnowledgeBase() {
    try {
      const knowledgeObj = Object.fromEntries(this.knowledgeBase);
      await fs.writeFile(this.knowledgeBasePath, JSON.stringify(knowledgeObj, null, 2));
      console.log('💾 Knowledge base saved');
    } catch (error) {
      console.error('Error saving knowledge base:', error);
    }
  }

  async addKnowledgeItem(id, title, content, category = 'general') {
    this.knowledgeBase.set(id, {
      id,
      title,
      content,
      category,
      createdAt: Date.now()
    });
    await this.saveKnowledgeBase();
    console.log(`📚 Added knowledge item: ${title}`);

    // Index into embeddings store (best-effort)
    try {
      await this.embeddings.indexText({
        conversationId: null,
        sourceType: 'manual_note',
        sourceId: id,
        text: content,
        chunkMeta: { title, category }
      });
    } catch (e) {}
  }

  // Fallback response
  getFallbackResponse(message) {
    const responses = [
      "Hello! Thanks for reaching out. How can I help you today?",
      "Hi there! I'm here to assist you. What do you need help with?",
      "Hello! Thanks for your message. I'm ready to help you with any questions you have.",
      "Hi! How can I make your day better today?",
      "Hello! I'm here to provide excellent customer service. What can I do for you?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Get conversation stats
  getConversationStats() {
    return {
      totalUsers: this.conversationMemory.size,
      totalTemplates: this.templates.size,
      totalAutomationRules: this.automationRules.size,
      totalKnowledgeItems: this.knowledgeBase.size
    };
  }

  // Clear memory for a user
  clearUserMemory(phoneNumber) {
    this.conversationMemory.delete(phoneNumber);
    console.log(`🧹 Cleared memory for ${phoneNumber}`);
  }

  // Clear all memory
  clearAllMemory() {
    this.conversationMemory.clear();
    console.log('🧹 Cleared all conversation memory');
  }

  // Website training method
  async trainFromWebsite(url, description = '', category = 'general') {
    try {
      console.log(`🌐 Training AI from website: ${url}`);
      
      // Extract content from website (simplified version)
      const websiteContent = await this.extractWebsiteContent(url);
      
      // Create knowledge base entry
      const knowledgeEntry = {
        id: `website-${Date.now()}`,
        content: websiteContent,
        source: url,
        description: description,
        category: category,
        createdAt: new Date().toISOString()
      };
      
      // Add to knowledge base
      this.knowledgeBase.set(knowledgeEntry.id, knowledgeEntry);
      await this.saveKnowledgeBase();

      // Index into embeddings store (best-effort)
      try {
        await this.embeddings.indexText({
          conversationId: null,
          sourceType: 'website',
          sourceId: knowledgeEntry.id,
          text: websiteContent,
          chunkMeta: { url, description, category }
        });
      } catch (e) {}
      
      console.log(`✅ Website training completed: ${url}`);
      return {
        success: true,
        id: knowledgeEntry.id,
        content: websiteContent.substring(0, 200) + '...',
        url: url
      };
    } catch (error) {
      console.error('Error training from website:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extract content from website (simplified)
  async extractWebsiteContent(url) {
    try {
      // This is a simplified version - in production you'd use a proper web scraper
      const axios = require('axios');
      const cheerio = require('cheerio');
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text content
      const text = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();
      
      return text.substring(0, 5000); // Limit to 5000 characters
    } catch (error) {
      console.error('Error extracting website content:', error);
      return `Content from ${url} (extraction failed: ${error.message})`;
    }
  }

  // Get training history
  getTrainingHistory() {
    const history = [];
    for (const [id, entry] of this.knowledgeBase) {
      if (entry.source && entry.source.startsWith('http')) {
        history.push({
          id: entry.id,
          url: entry.source,
          description: entry.description,
          category: entry.category,
          createdAt: entry.createdAt
        });
      }
    }
    return history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Delete training record
  async deleteTrainingRecord(id) {
    try {
      const deleted = this.knowledgeBase.delete(id);
      if (deleted) {
        await this.saveKnowledgeBase();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting training record:', error);
      return false;
    }
  }
}

module.exports = EnhancedAIService;