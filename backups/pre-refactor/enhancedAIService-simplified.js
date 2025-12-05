const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const EmbeddingsService = require('./embeddingsService');
const AIService = require('./aiService');

class EnhancedAIService extends EventEmitter {
  constructor(ghlService) {
    super();
    this.ghlService = ghlService;
    this.aiService = new AIService(); // Initialize AI service for actual API calls
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
    this.handoffRulesPath = path.join(__dirname, '..', 'data', 'handoff_rules.json');
    this.handoffRules = null; // Loaded from handoff_rules.json
    
    // Initialize Embeddings Service for RAG
    this.embeddingsService = new EmbeddingsService();
    
    this.aiPersonality = {
      name: 'AI Assistant',
      role: 'Customer Support Representative',
      tone: 'professional and helpful',
      expertise: ['customer service', 'product information', 'technical support'],
      guidelines: [
        'Always be polite and professional',
        'Provide accurate information based on knowledge base',
        'Ask clarifying questions when needed',
        'Escalate to human agents when appropriate'
      ]
    };

    // Initialize the service
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🤖 Initializing Enhanced AI Service...');
      
      // Load knowledge base, templates, and automation rules
      await Promise.all([
        this.loadKnowledgeBase(),
        this.loadTemplates(),
        this.loadAutomationRules(),
        this.loadHandoffRules()
      ]);
      
      console.log('✅ Enhanced AI Service initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Error initializing Enhanced AI Service:', error);
      this.emit('error', error);
    }
  }

  async processMessage(phoneNumber, message, conversationId = null) {
    try {
      console.log(`🤖 Processing message from ${phoneNumber}: ${message.substring(0, 100)}...`);
      
      // Get or create user profile
      const userProfile = await this.getUserProfile(phoneNumber);
      
      // Build conversation context
      const conversationContext = this.buildConversationContext(phoneNumber, message);
      
      // Check for handoff triggers
      const handoffCheck = await this.checkHandoffTriggers(message, userProfile);
      if (handoffCheck.shouldHandoff) {
        return {
          response: handoffCheck.message,
          shouldHandoff: true,
          handoffReason: handoffCheck.reason,
          confidence: 1.0
        };
      }

      // Check for automation triggers
      const automationResponse = await this.checkAutomationTriggers(message, userProfile);
      if (automationResponse) {
        return automationResponse;
      }

      // Search knowledge base for relevant information
      const knowledgeContext = await this.searchKnowledgeBase(message);
      
      // Generate AI response
      const aiResponse = await this.generateAIResponse(
        message,
        conversationContext,
        knowledgeContext,
        userProfile
      );

      // Store conversation in memory
      this.storeConversation(phoneNumber, message, aiResponse.response);

      return aiResponse;

    } catch (error) {
      console.error('❌ Error processing message:', error);
      return {
        response: "I apologize, but I'm experiencing technical difficulties. Please try again or contact support.",
        confidence: 0.1,
        error: error.message
      };
    }
  }

  async getUserProfile(phoneNumber) {
    try {
      // Check cache first
      if (this.userProfiles.has(phoneNumber)) {
        const cached = this.userProfiles.get(phoneNumber);
        // Return cached if less than 15 minutes old
        if (Date.now() - cached.timestamp < 15 * 60 * 1000) {
          return cached.profile;
        }
      }

      // Get fresh profile from GHL
      const normalizedPhone = this.ghlService.normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone) {
        return this.getMinimalProfile(phoneNumber);
      }

      const contact = await this.ghlService.findContactByPhone(normalizedPhone);
      if (!contact) {
        return this.getMinimalProfile(phoneNumber);
      }

      const profile = {
        id: contact.id,
        name: this.getFullName(contact),
        firstName: contact.firstName || 'Unknown',
        email: contact.email || null,
        phone: contact.phone,
        source: contact.source || 'Unknown',
        tags: contact.tags || [],
        customFields: contact.customFields || {},
        lastActivity: contact.lastActivity
      };

      // Cache the profile
      this.userProfiles.set(phoneNumber, {
        profile,
        timestamp: Date.now()
      });

      return profile;

    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return this.getMinimalProfile(phoneNumber);
    }
  }

  getFullName(contact) {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`;
    }
    return contact.firstName || contact.name || contact.lastName || 'Unknown Contact';
  }

  getMinimalProfile(phoneNumber) {
    return {
      name: 'Unknown Contact',
      firstName: 'Unknown',
      phone: phoneNumber,
      source: 'WhatsApp',
      tags: [],
      customFields: {}
    };
  }

  buildConversationContext(phoneNumber, currentMessage) {
    const conversations = this.conversationMemory.get(phoneNumber) || [];
    const recentConversations = conversations.slice(-this.conversationContextWindow);
    
    let context = `Current message: ${currentMessage}\n\n`;
    
    if (recentConversations.length > 0) {
      context += 'Recent conversation history:\n';
      recentConversations.forEach((conv, index) => {
        context += `${index + 1}. User: ${conv.message}\n   AI: ${conv.response}\n`;
      });
    }
    
    return context;
  }

  async checkHandoffTriggers(message, userProfile) {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Check for explicit handoff keywords
      const hasHandoffKeyword = this.handoffKeywords.some(keyword => 
        lowerMessage.includes(keyword.toLowerCase())
      );
      
      if (hasHandoffKeyword) {
        return {
          shouldHandoff: true,
          reason: 'User requested human agent',
          message: "I'll connect you with a human agent right away. Please hold on while I transfer your conversation."
        };
      }

      // Check loaded handoff rules
      if (this.handoffRules && this.handoffRules.rules) {
        for (const rule of this.handoffRules.rules) {
          if (rule.enabled && rule.triggers) {
            const matchesKeywords = rule.triggers.keywords?.some(keyword => 
              lowerMessage.includes(keyword.toLowerCase())
            );
            
            if (matchesKeywords) {
              return {
                shouldHandoff: true,
                reason: rule.reason || 'Triggered handoff rule',
                message: rule.message || "Let me connect you with a human agent who can better assist you."
              };
            }
          }
        }
      }

      return { shouldHandoff: false };

    } catch (error) {
      console.error('❌ Error checking handoff triggers:', error);
      return { shouldHandoff: false };
    }
  }

  async checkAutomationTriggers(message, userProfile) {
    try {
      const lowerMessage = message.toLowerCase();
      
      for (const [id, rule] of this.automationRules) {
        if (!rule.enabled) continue;
        
        const matchesKeywords = rule.triggers?.keywords?.some(keyword => 
          lowerMessage.includes(keyword.toLowerCase())
        );
        
        if (matchesKeywords) {
          return {
            response: rule.response,
            confidence: 0.9,
            source: 'automation',
            ruleId: id
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error checking automation triggers:', error);
      return null;
    }
  }

  async searchKnowledgeBase(message) {
    try {
      if (this.knowledgeBase.size === 0) {
        return '';
      }

      const lowerMessage = message.toLowerCase();
      let bestMatch = '';
      let bestScore = 0;

      // Simple keyword matching for knowledge base
      for (const [id, item] of this.knowledgeBase) {
        const content = (item.content || '').toLowerCase();
        const title = (item.title || '').toLowerCase();
        
        // Count keyword matches
        const words = lowerMessage.split(' ').filter(word => word.length > 3);
        let score = 0;
        
        words.forEach(word => {
          if (content.includes(word)) score += 2;
          if (title.includes(word)) score += 3;
        });
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item.content || '';
        }
      }

      return bestScore > 0 ? bestMatch.substring(0, 500) : '';
    } catch (error) {
      console.error('❌ Error searching knowledge base:', error);
      return '';
    }
  }

  async generateAIResponse(message, conversationContext, knowledgeContext, userProfile) {
    try {
      // Build comprehensive prompt
      let prompt = `You are ${this.aiPersonality.name}, a ${this.aiPersonality.role}.\n`;
      prompt += `Your tone should be ${this.aiPersonality.tone}.\n\n`;
      
      if (userProfile.name !== 'Unknown Contact') {
        prompt += `You are speaking with ${userProfile.name}.\n`;
      }
      
      if (knowledgeContext) {
        prompt += `Relevant information from knowledge base:\n${knowledgeContext}\n\n`;
      }
      
      prompt += `Conversation context:\n${conversationContext}\n\n`;
      prompt += `Please provide a helpful response to the user's message. Keep it concise and professional.`;

      // Generate response using AI service
      const aiResponse = await this.aiService.generateResponse(prompt);
      
      return {
        response: aiResponse,
        confidence: 0.8,
        source: 'ai',
        usedKnowledgeBase: !!knowledgeContext
      };

    } catch (error) {
      console.error('❌ Error generating AI response:', error);
      return {
        response: "I apologize, but I'm having trouble generating a response right now. Please try rephrasing your question or contact support.",
        confidence: 0.1,
        error: error.message
      };
    }
  }

  storeConversation(phoneNumber, message, response) {
    try {
      if (!this.conversationMemory.has(phoneNumber)) {
        this.conversationMemory.set(phoneNumber, []);
      }
      
      const conversations = this.conversationMemory.get(phoneNumber);
      conversations.push({
        message,
        response,
        timestamp: new Date().toISOString()
      });
      
      // Keep only recent conversations
      if (conversations.length > this.maxConversationsPerUser) {
        conversations.splice(0, conversations.length - this.maxConversationsPerUser);
      }
      
    } catch (error) {
      console.error('❌ Error storing conversation:', error);
    }
  }

  async loadKnowledgeBase() {
    try {
      const data = await fs.readFile(this.knowledgeBasePath, 'utf8');
      const knowledgeItems = JSON.parse(data);
      
      this.knowledgeBase.clear();
      knowledgeItems.forEach(item => {
        this.knowledgeBase.set(item.id, item);
      });
      
      console.log(`📚 Loaded ${this.knowledgeBase.size} knowledge base items`);
    } catch (error) {
      console.log('📚 No knowledge base file found, starting with empty knowledge base');
    }
  }

  async loadTemplates() {
    try {
      const data = await fs.readFile(this.templatesPath, 'utf8');
      const templates = JSON.parse(data);
      
      this.templates.clear();
      templates.forEach(template => {
        this.templates.set(template.id, template);
      });
      
      console.log(`📝 Loaded ${this.templates.size} templates`);
    } catch (error) {
      console.log('📝 No templates file found, starting with empty templates');
    }
  }

  async loadAutomationRules() {
    try {
      const data = await fs.readFile(this.automationPath, 'utf8');
      const rules = JSON.parse(data);
      
      this.automationRules.clear();
      rules.forEach(rule => {
        this.automationRules.set(rule.id, rule);
      });
      
      console.log(`🤖 Loaded ${this.automationRules.size} automation rules`);
    } catch (error) {
      console.log('🤖 No automation rules file found, starting with empty rules');
    }
  }

  async loadHandoffRules() {
    try {
      const data = await fs.readFile(this.handoffRulesPath, 'utf8');
      this.handoffRules = JSON.parse(data);
      console.log('🤝 Loaded handoff rules');
    } catch (error) {
      console.log('🤝 No handoff rules file found, using default rules');
      this.handoffRules = {
        rules: [
          {
            id: 'default-human',
            enabled: true,
            triggers: { keywords: ['human', 'agent', 'person', 'representative'] },
            reason: 'User requested human agent',
            message: "I'll connect you with a human agent right away."
          }
        ]
      };
    }
  }

  // Knowledge Base Management
  async addKnowledgeItem(item) {
    try {
      const id = item.id || Date.now().toString();
      this.knowledgeBase.set(id, { ...item, id });
      await this.saveKnowledgeBase();
      console.log(`📚 Added knowledge item: ${item.title}`);
      return id;
    } catch (error) {
      console.error('❌ Error adding knowledge item:', error);
      throw error;
    }
  }

  async saveKnowledgeBase() {
    try {
      const items = Array.from(this.knowledgeBase.values());
      await fs.writeFile(this.knowledgeBasePath, JSON.stringify(items, null, 2));
    } catch (error) {
      console.error('❌ Error saving knowledge base:', error);
      throw error;
    }
  }

  // Get statistics
  getKnowledgeBaseStats() {
    return {
      totalItems: this.knowledgeBase.size,
      totalTemplates: this.templates.size,
      totalAutomationRules: this.automationRules.size,
      activeConversations: this.conversationMemory.size,
      cachedProfiles: this.userProfiles.size
    };
  }

  // Clear caches
  clearCache() {
    this.conversationMemory.clear();
    this.userProfiles.clear();
    console.log('🗑️ Cleared all caches');
  }
}

module.exports = EnhancedAIService;