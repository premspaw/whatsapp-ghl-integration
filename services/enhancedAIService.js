const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const EmbeddingsService = require('./embeddingsService');
const UserContextService = require('./userContextService');
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
    
    // Initialize User Context Service for RAG
    this.userContextService = new UserContextService(ghlService);
    
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
    this.loadHandoffRules();
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

      // Load conversation memory
      const memory = await this.loadConversationMemory(phoneNumber);
      
      // Get user profile from GHL
      const userProfile = await this.getUserProfileFromGHL(phoneNumber);

      // Human handoff: check with profile + rules before generating reply
      if (this.isHandoffRequested(message, userProfile)) {
        this.emit('handoff', { phoneNumber, conversationId, message });
        return null;
      }
      
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

  async safeRetrieveEmbeddings(query, conversationId, userContext = null) {
    try {
      if (!this.embeddings) return [];
      const results = await this.embeddings.retrieve({ query, topK: 5, conversationId: null, userContext });
      return Array.isArray(results) ? results : [];
    } catch (e) {
      return [];
    }
  }

  // Detect human handoff intent based on keywords + rules
  isHandoffRequested(message, userProfile) {
    try {
      if (!message || typeof message !== 'string') return false;
      const lower = message.toLowerCase();

      // Keyword-based
      if (this.handoffKeywords.some(k => lower.includes(k))) return true;

      // Topic-based (from rules)
      if (this.handoffRules && Array.isArray(this.handoffRules.auto_handoff_topics)) {
        if (this.handoffRules.auto_handoff_topics.some(t => lower.includes(String(t).toLowerCase()))) {
          return true;
        }
      }

      // Priority contacts (GHL tags)
      if (userProfile && this.isPriorityContact(userProfile)) return true;

      // Outside business hours
      if (this.isOutsideBusinessHours()) return !!(this.handoffRules && this.handoffRules.business_hours && this.handoffRules.business_hours.auto_handoff_outside_hours);

      return false;
    } catch (e) {
      return false;
    }
  }

  // Load handoff rules from file
  async loadHandoffRules() {
    try {
      const data = await fs.readFile(this.handoffRulesPath, 'utf8');
      const rules = JSON.parse(data);
      this.handoffRules = rules;
      if (Array.isArray(rules.keywords) && rules.keywords.length > 0) {
        this.handoffKeywords = rules.keywords;
      }
      console.log('🤝 Loaded handoff rules');
    } catch (error) {
      // Fallback: keep defaults
      this.handoffRules = null;
      console.log('No handoff_rules.json found, using default keywords');
    }
  }

  // Utility: check business hours from rules
  isOutsideBusinessHours() {
    try {
      if (!this.handoffRules || !this.handoffRules.business_hours || !this.handoffRules.business_hours.enabled) return false;
      const bh = this.handoffRules.business_hours;
      const tz = bh.timezone || 'UTC';
      const now = new Date();
      // Approximate timezone by using system time; detailed tz handling can be added later
      const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const day = dayNames[now.getDay()];
      const schedule = bh.schedule && bh.schedule[day];
      if (!schedule || !schedule.start || !schedule.end) return true;
      const [startH, startM] = schedule.start.split(':').map(Number);
      const [endH, endM] = schedule.end.split(':').map(Number);
      const minutes = now.getHours() * 60 + now.getMinutes();
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      return minutes < startMin || minutes > endMin;
    } catch (e) {
      return false;
    }
  }

  // Utility: check if user has priority tags
  isPriorityContact(userProfile) {
    try {
      if (!this.handoffRules || !this.handoffRules.priority_contacts || !this.handoffRules.priority_contacts.enabled) return false;
      const requiredTags = this.handoffRules.priority_contacts.ghl_tags || [];
      const tags = (userProfile && userProfile.tags) ? userProfile.tags.map(t => String(t).toLowerCase()) : [];
      return requiredTags.some(t => tags.includes(String(t).toLowerCase()));
    } catch (e) {
      return false;
    }
  }

  // Allow runtime reload (used by API)
  async reloadHandoffRules() {
    await this.loadHandoffRules();
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
  async generateEnhancedReply(message, userProfile, memory, relevantKnowledge, userContext = null) {
    try {
      // Ensure memory is an array
      const memoryArray = Array.isArray(memory) ? memory : [];
      
      // Build context from memory - use more context (up to this.conversationContextWindow)
      const contextMessages = memoryArray.slice(-this.conversationContextWindow).map(m => 
        `User: ${m.user}\nAI: ${m.ai}`
      ).join('\n\n');
      
      // Build comprehensive user context using RAG data
      let contextString = this.buildComprehensiveUserContext(userProfile, userContext);
      
      // Build knowledge context with more complete information
      const knowledgeContext = relevantKnowledge.length > 0 ?
        `Relevant Information:\n${relevantKnowledge.map(k => `- ${k.title}: ${k.content.substring(0, 200)}...`).join('\n\n')}` :
        '';
      
      // Generate contextual prompt with enhanced context
      const prompt = this.buildEnhancedContextPrompt(message, contextString, contextMessages, knowledgeContext, userContext);
      
      // Generate AI reply using the aiService with enhanced context
      const context = {
        messages: memoryArray.map(m => ({ from: 'user', body: m.user })).concat(
          memoryArray.map(m => ({ from: 'ai', body: m.ai }))
        ),
        type: 'support',
        userProfile,
        knowledgeContext
      };
      
      return await this.aiService.generateCustomReply(message, prompt, context);
      
    } catch (error) {
      console.error('Error generating enhanced reply:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Build comprehensive user context from RAG data
  buildComprehensiveUserContext(userProfile, userContext) {
    let contextString = '';
    
    if (userContext) {
      // Basic Information
      contextString += `User: ${userContext.basic.name} (${userContext.basic.email || 'No email'})`;
      contextString += `\nPhone: ${userContext.basic.phone}`;
      contextString += `\nCustomer Type: ${userContext.relationship.customerType}`;
      contextString += `\nRelationship Stage: ${userContext.relationship.relationshipStage}`;
      
      // Business Context
      if (userContext.business.company) {
        contextString += `\nCompany: ${userContext.business.company}`;
      }
      if (userContext.business.jobTitle) {
        contextString += `\nJob Title: ${userContext.business.jobTitle}`;
      }
      
      // Sales Context
      if (userContext.sales.totalRevenue > 0) {
        contextString += `\nTotal Revenue: $${userContext.sales.totalRevenue}`;
      }
      if (userContext.sales.activeDeals.length > 0) {
        contextString += `\nActive Deals: ${userContext.sales.activeDeals.length}`;
      }
      if (userContext.sales.salesStage) {
        contextString += `\nSales Stage: ${userContext.sales.salesStage}`;
      }
      
      // Behavioral Context (Enhanced with Analytics)
      if (userContext.behavioral) {
        contextString += `\nCommunication Style: ${userContext.behavioral.communicationStyle}`;
        contextString += `\nEngagement Level: ${(userContext.behavioral.engagementLevel * 100).toFixed(1)}%`;
        contextString += `\nResponsiveness: ${(userContext.behavioral.responsiveness * 100).toFixed(1)}%`;
        contextString += `\nInteraction Style: ${userContext.behavioral.interactionStyle}`;
        contextString += `\nActivity Pattern: ${userContext.behavioral.activityPattern}`;
        contextString += `\nSupport Level: ${userContext.behavioral.supportLevel}`;
        contextString += `\nSatisfaction Score: ${(userContext.behavioral.satisfactionScore * 100).toFixed(1)}%`;
        
        if (userContext.behavioral.preferredTopics.length > 0) {
          contextString += `\nPreferred Topics: ${userContext.behavioral.preferredTopics.map(t => t.topic).join(', ')}`;
        }
        
        if (userContext.behavioral.behavioralInsights.length > 0) {
          contextString += `\nBehavioral Insights: ${userContext.behavioral.behavioralInsights.map(i => i.insight).join('; ')}`;
        }
      }
      
      // Conversation Intelligence
      if (userContext.conversationIntelligence) {
        contextString += `\nConversation Intelligence Summary: ${userContext.conversationIntelligence.summary}`;
        
        if (userContext.conversationIntelligence.sentiment) {
          contextString += `\nSentiment Analysis: Overall ${userContext.conversationIntelligence.sentiment.overallSentiment.toFixed(2)}, Recent ${userContext.conversationIntelligence.sentiment.recentSentiment.toFixed(2)}, Pattern: ${userContext.conversationIntelligence.sentiment.moodPattern}`;
        }
        
        if (userContext.conversationIntelligence.timing) {
          contextString += `\nPreferred Contact Times: ${userContext.conversationIntelligence.timing.preferredHours.join(', ')}h on ${userContext.conversationIntelligence.timing.preferredDays.join(', ')}`;
        }
        
        if (userContext.conversationIntelligence.predictions) {
          const predictions = userContext.conversationIntelligence.predictions;
          contextString += `\nPredictive Indicators: Churn Risk ${(predictions.churnRisk * 100).toFixed(1)}%, Upsell Potential ${(predictions.upsellPotential * 100).toFixed(1)}%, Support Risk ${(predictions.supportRisk * 100).toFixed(1)}%`;
        }
      }
      
      // Traditional Behavioral Context (Legacy)
      if (userContext.behavior.tags.length > 0) {
        contextString += `\nTags: ${userContext.behavior.tags.map(t => t.name).join(', ')}`;
      }
      if (userContext.behavior.preferences && Object.keys(userContext.behavior.preferences).length > 0) {
        contextString += `\nPreferences: ${JSON.stringify(userContext.behavior.preferences)}`;
      }
      if (userContext.behavior.painPoints.length > 0) {
        contextString += `\nPain Points: ${userContext.behavior.painPoints.map(p => p.keyword).join(', ')}`;
      }
      if (userContext.behavior.interests.length > 0) {
        contextString += `\nInterests: ${userContext.behavior.interests.map(i => i.keyword).join(', ')}`;
      }
      
      // Conversation Context
      if (userContext.conversation.sentiment) {
        contextString += `\nSentiment: ${userContext.conversation.sentiment.overall}`;
      }
      if (userContext.conversation.recentTopics.length > 0) {
        contextString += `\nRecent Topics: ${userContext.conversation.recentTopics.slice(0, 5).join(', ')}`;
      }
      if (userContext.relationship.lastInteraction) {
        contextString += `\nLast Interaction: ${userContext.relationship.lastInteraction.date}`;
      }
      
      // Custom Fields
      if (userContext.behavior.customFields && Object.keys(userContext.behavior.customFields).length > 0) {
        contextString += `\nCustom Fields: ${JSON.stringify(userContext.behavior.customFields)}`;
      }
      
    } else if (userProfile) {
      // Fallback to basic user profile
      contextString = `User: ${userProfile.name} (${userProfile.email || 'No email'}, Phone: ${userProfile.phone || 'Unknown'})
User Tags: ${userProfile.tags ? userProfile.tags.join(', ') : 'None'}
Custom Fields: ${userProfile.customFields ? JSON.stringify(userProfile.customFields) : 'None'}`;
    } else {
      contextString = 'User: Unknown Contact';
    }
    
    return contextString;
  }

  // Generate contextual reply using comprehensive user data
  generateContextualReply(message, userProfile, memory, relevantKnowledge, userContext) {
    const userName = userContext?.basic?.name || userProfile?.name || 'there';
    const lowerMessage = message.toLowerCase();
    
    // Use comprehensive context for personalization
    const customerType = userContext?.relationship?.customerType || 'prospect';
    const relationshipStage = userContext?.relationship?.relationshipStage || 'new';
    const salesStage = userContext?.sales?.salesStage;
    const sentiment = userContext?.conversation?.sentiment?.overall || 'neutral';
    const painPoints = userContext?.behavior?.painPoints || [];
    const interests = userContext?.behavior?.interests || [];
    const recentTopics = userContext?.conversation?.recentTopics || [];
    
    // Enhanced behavioral context from analytics
    const communicationStyle = userContext?.behavioral?.communicationStyle || 'unknown';
    const engagementLevel = userContext?.behavioral?.engagementLevel || 0;
    const responsiveness = userContext?.behavioral?.responsiveness || 0;
    const interactionStyle = userContext?.behavioral?.interactionStyle || 'unknown';
    const supportLevel = userContext?.behavioral?.supportLevel || 'low';
    const satisfactionScore = userContext?.behavioral?.satisfactionScore || 0.5;
    const behavioralInsights = userContext?.behavioral?.behavioralInsights || [];
    
    // Conversation intelligence
    const conversationIntelligence = userContext?.conversationIntelligence;
    const overallSentiment = conversationIntelligence?.sentiment?.overallSentiment || 0;
    const recentSentiment = conversationIntelligence?.sentiment?.recentSentiment || 0;
    const moodPattern = conversationIntelligence?.sentiment?.moodPattern || 'unknown';
    const churnRisk = conversationIntelligence?.predictions?.churnRisk || 0.5;
    const upsellPotential = conversationIntelligence?.predictions?.upsellPotential || 0.5;
    const supportRisk = conversationIntelligence?.predictions?.supportRisk || 0.5;
    
    // Use memory for context
    const memoryArray = Array.isArray(memory) ? memory : [];
    const recentMemoryTopics = memoryArray.slice(-3).map(m => m.user.toLowerCase());
    const isFollowUp = recentMemoryTopics.some(topic => 
      topic.includes('help') || topic.includes('question') || topic.includes('problem')
    );
    
    // Adaptive response based on behavioral analytics
    let responseStyle = 'standard';
    if (communicationStyle === 'brief') {
      responseStyle = 'concise';
    } else if (communicationStyle === 'verbose') {
      responseStyle = 'detailed';
    } else if (engagementLevel > 0.8) {
      responseStyle = 'enthusiastic';
    } else if (responsiveness < 0.3) {
      responseStyle = 'patient';
    }
    
    // Sentiment-aware responses
    let sentimentModifier = '';
    if (recentSentiment < -0.3) {
      sentimentModifier = 'empathetic';
    } else if (recentSentiment > 0.5) {
      sentimentModifier = 'positive';
    } else if (moodPattern === 'declining') {
      sentimentModifier = 'supportive';
    }
    
    // Generate personalized responses based on comprehensive context
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      if (customerType === 'customer' || customerType === 'repeat_customer') {
        if (satisfactionScore > 0.7) {
          return responseStyle === 'concise' ? 
            `Hi ${userName}! How can I help?` :
            `Hello ${userName}! Great to hear from you again. I see you've been satisfied with our service. How can I help you today?`;
        } else if (supportLevel === 'high') {
          return `Hello ${userName}! I see you've needed some support recently. I'm here to make sure everything is working perfectly for you. What can I help with?`;
        } else {
          return `Hello ${userName}! Great to hear from you again. How can I help you today?`;
        }
      } else if (relationshipStage === 'new') {
        return responseStyle === 'concise' ? 
          `Hello ${userName}! Welcome!` :
          `Hello ${userName}! Welcome! I'm here to help you with any questions you might have.`;
      } else {
        return `Hello ${userName}! How can I assist you today?`;
      }
    } 
    
    else if (lowerMessage.includes('help')) {
      if (supportRisk > 0.7) {
        return `I'm here to help you, ${userName}! I want to make sure we address any concerns you might have. What specific assistance do you need?`;
      } else if (painPoints.length > 0) {
        const mainPainPoint = painPoints[0].keyword;
        return `I'm here to help you, ${userName}! I see you've mentioned ${mainPainPoint} before. Is this related to that, or something new I can assist with?`;
      } else if (salesStage) {
        return `I'm here to help you, ${userName}! I see you're in the ${salesStage} stage. What specific assistance do you need?`;
      } else if (interactionStyle === 'inquisitive') {
        return `I'm here to help you, ${userName}! I know you like to ask detailed questions, so feel free to be as specific as you'd like. What can I assist with?`;
      } else {
        return responseStyle === 'concise' ? 
          `How can I help, ${userName}?` :
          `I'm here to help you, ${userName}! What specific assistance do you need?`;
      }
    } 
    
    else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      if (upsellPotential > 0.7) {
        return `I'd be happy to discuss pricing with you, ${userName}! Based on your engagement, I think you might be interested in our premium features. Let me connect you with our sales team to explore options that could add even more value.`;
      } else if (customerType === 'customer') {
        return `I'd be happy to discuss pricing for additional services, ${userName}. Let me connect you with our account manager.`;
      } else if (salesStage === 'negotiation' || salesStage === 'proposal') {
        return `I see you're interested in pricing, ${userName}. Let me get you connected with our sales team to discuss your specific needs.`;
      } else {
        return `I'd be happy to discuss pricing with you, ${userName}. Let me connect you with our sales team to provide you with detailed information.`;
      }
    } 
    
    else if (lowerMessage.includes('thank')) {
      if (satisfactionScore > 0.8) {
        return `You're very welcome, ${userName}! I'm so glad I could help. Your satisfaction means everything to us. Is there anything else I can assist you with?`;
      } else if (sentiment === 'positive' || recentSentiment > 0.3) {
        return `You're very welcome, ${userName}! I'm so glad I could help. Is there anything else I can assist you with?`;
      } else {
        return `You're welcome, ${userName}! Is there anything else I can help you with today?`;
      }
    }
    
    else if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('not working')) {
      if (supportLevel === 'high') {
        return `I understand you're experiencing an issue, ${userName}. I see you've needed support before, so let me make sure we get this resolved quickly for you. Can you describe what's happening?`;
      } else if (churnRisk > 0.7) {
        return `I'm sorry to hear you're having an issue, ${userName}. Let me personally ensure we get this resolved for you right away. Your experience is very important to us. What's going on?`;
      } else if (communicationStyle === 'detailed') {
        return `I'm sorry to hear you're experiencing an issue, ${userName}. I know you prefer detailed explanations, so please feel free to describe everything that's happening, and I'll make sure we get it resolved thoroughly.`;
      } else {
        return `I'm sorry to hear you're having an issue, ${userName}. Let me help you get this resolved. Can you tell me what's happening?`;
      }
    }
    
    else if (lowerMessage.includes('cancel') || lowerMessage.includes('unsubscribe')) {
      if (churnRisk > 0.6) {
        return `I understand you're considering canceling, ${userName}. Before we proceed, I'd love to see if there's anything we can do to address your concerns. Would you be open to a quick conversation about what's not working for you?`;
      } else if (satisfactionScore < 0.4) {
        return `I'm sorry to hear you want to cancel, ${userName}. Your satisfaction is important to us. Can you help me understand what led to this decision so we can try to make things right?`;
      } else {
        return `I understand you're looking to cancel, ${userName}. I'd be happy to help with that, but first, is there anything specific that's not meeting your needs that we might be able to address?`;
      }
    }
    
    else if (isFollowUp) {
      if (recentTopics.length > 0) {
        const topic = recentTopics[0];
        return `I understand you're looking for help with ${topic}, ${userName}. Can you tell me more about what specific assistance you need?`;
      } else {
        return `I understand you're looking for help, ${userName}. Can you tell me more about what you need assistance with?`;
      }
    } 
    
    // Check for topic-specific responses based on interests
    else if (interests.length > 0) {
      const userInterests = interests.map(i => i.keyword.toLowerCase());
      if (userInterests.some(interest => lowerMessage.includes(interest))) {
        return `That's great, ${userName}! I see you're interested in this topic. How can I help you with that?`;
      }
    }
    
    // Default response with behavioral adaptation
    else {
      if (behavioralInsights.length > 0) {
        const insight = behavioralInsights[0];
        if (insight.type === 'engagement' && insight.confidence > 0.8) {
          return `Thanks for your message, ${userName}! I appreciate how engaged you are with our service. Let me help you with that right away.`;
        } else if (insight.type === 'communication_style' && insight.confidence > 0.8) {
          return responseStyle === 'concise' ? 
            `Got it, ${userName}. Let me help.` :
            `Thanks for reaching out, ${userName}! I understand you like to ask questions, so please feel free to be as detailed as you need. How can I assist you?`;
        }
      }
      
      if (engagementLevel > 0.8) {
        return `Thanks for your message, ${userName}! I can see you're really engaged with our service. How can I help you today?`;
      } else if (responsiveness > 0.8) {
        return `Hi ${userName}! I know you're usually quick to respond, so I'll make sure to get back to you promptly. What can I help with?`;
      } else if (supportLevel === 'high') {
        return `Hi ${userName}! I'm here to help. What can I assist you with today?`;
      } else {
        return responseStyle === 'concise' ? 
          `Hi ${userName}! How can I help?` :
          `Thanks for your message, ${userName}! How can I assist you today?`;
      }
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