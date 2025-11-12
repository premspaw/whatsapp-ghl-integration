const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const EmbeddingsService = require('./embeddingsService');
const UserContextService = require('./userContextService');
const AIService = require('./aiService');
const GHLKnowledgeService = require('./ghlKnowledgeService');

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
    
    // Initialize with default personality (will be overridden by loadPersonality)
    this.aiPersonality = {
      name: "Sarah",
      role: "Customer Success Manager", 
      company: "Your Business",
      website: "www.yourbusiness.com",
      tone: "friendly and professional",
      traits: ["helpful", "empathetic", "solution-oriented", "knowledgeable"]
    };
    
    this.personalityPath = path.join(__dirname, '..', 'data', 'ai-personality.json');
    // Track whether personality has been loaded to avoid placeholder leakage
    this._personalityLoaded = false;
    
    this.loadKnowledgeBase();
    this.loadTemplates();
    this.loadAutomationRules();
    this.loadHandoffRules();
    this.loadPersonality(); // Load personality from file
    this.embeddings = new EmbeddingsService();
    // Optional: prefer GHL KB results before local RAG
    this.ghlKBFirst = String(process.env.GHL_KB_FIRST || 'true').toLowerCase() === 'true';
    this.ghlKnowledge = new GHLKnowledgeService(ghlService);
    // Optional citations in replies: 'off' | 'auto' | 'always' (default always for RAG-first)
    this.citationMode = (process.env.REPLY_CITATIONS || 'always').toLowerCase();
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
  async generateContextualReply(message, phoneNumber, conversationId, tenantId = null) {
    try {
      console.log('🧠 Enhanced AI generating contextual reply for', phoneNumber);
      // Ensure personality is loaded before generating any reply to avoid placeholder defaults
      await this.ensurePersonalityLoaded();

      // Global toggle: disable AI replies if personality sets aiEnabled=false
      if (this.aiPersonality && this.aiPersonality.aiEnabled === false) {
        const disabledMsg = 'Thanks for your message. A human agent will respond shortly.';
        await this.storeConversation(phoneNumber, message, disabledMsg);
        return disabledMsg;
      }

      // Deterministic handling for company/website queries
      // Do NOT short-circuit here; blend with RAG to avoid placeholder leakage
      let identitySnippet = null;
      const deterministic = this._getDeterministicIdentityAnswer(message);
      if (deterministic) {
        // Skip if looks like a placeholder (e.g., yourbusiness.com or "Your Business")
        const looksPlaceholder = /yourbusiness\.com|example\.com/i.test(deterministic) || /Your Business/i.test(deterministic);
        if (!looksPlaceholder) {
          identitySnippet = deterministic;
        }
      }

      // Deterministic handling for brand FAQs (email, address, support, phone, hours)
      const faqDeterministic = this._getDeterministicBrandFAQAnswer(message);
      // Blend deterministic FAQ with RAG matches instead of returning early
      let deterministicSnippet = null;
      if (faqDeterministic) {
        deterministicSnippet = faqDeterministic;
      }

      // Load conversation memory and user profile concurrently for speed
      const [memory, userProfile] = await Promise.all([
        this.loadConversationMemory(phoneNumber),
        this.getUserProfileFromGHL(phoneNumber)
      ]);

      // Human handoff: check with profile + rules before generating reply
      if (this.isHandoffRequested(message, userProfile)) {
        this.emit('handoff', { phoneNumber, conversationId, message });
        return null;
      }
      
      // Detect intent to tune RAG retrieval
      const intent = this._detectQueryIntent(message);
      const ragMin = intent.requiresKnowledge ? 0.15 : 0.3;
      const ragTopK = intent.requiresKnowledge ? 10 : 8;

      // Try GHL Knowledge Base first (if configured)
      let relevantKnowledge = [];
      if (this.ghlKBFirst && this.ghlKnowledge && this.ghlKnowledge.isConfigured()) {
        try {
          const kbResults = await this.ghlKnowledge.search(message, { locationId: this.ghlService?.locationId });
          if (Array.isArray(kbResults) && kbResults.length) {
            relevantKnowledge = kbResults;
            console.log(`📚 GHL KB results used: ${kbResults.length}`);
          }
        } catch (e) {}
      }

      // Retrieve vector matches (RAG) if KB is empty
      if (!relevantKnowledge || relevantKnowledge.length === 0) {
        const vectorMatches = await this.safeRetrieveEmbeddings(message, conversationId, null, ragMin, tenantId, ragTopK);
        console.log(`🔍 Intent: ${intent.category} | Retrieved ${vectorMatches.length} chunks (minSim=${ragMin}, topK=${ragTopK})`);
        relevantKnowledge = vectorMatches.length > 0
          ? vectorMatches.map(m => ({ 
              title: m.chunk_meta?.title || m.source_type || 'doc', 
              content: m.text, 
              source: m.chunk_meta?.url || m.chunk_meta?.filename || m.source_id 
            }))
          : this.searchKnowledgeBase(message);
        if (!vectorMatches.length) {
          const count = Array.isArray(relevantKnowledge) ? relevantKnowledge.length : 0;
          console.log(`🔎 Keyword fallback matches: ${count}`);
        }
      }
      // If RAG found nothing and intent requires knowledge, broaden the keyword search
      if ((!relevantKnowledge || relevantKnowledge.length === 0) && intent.requiresKnowledge) {
        relevantKnowledge = this.searchKnowledgeBase(`${message} services pricing products automation whatsapp seo`);
      }
      // RAG-first: if we have knowledge items, do not lead with personality-based snippets
      // Append deterministic snippets only when RAG/KB is empty, otherwise skip to keep replies grounded
      const hasKnowledge = Array.isArray(relevantKnowledge) && relevantKnowledge.length > 0;
      if (!hasKnowledge) {
        if (deterministicSnippet) {
          const faqItem = { title: 'FAQ', content: deterministicSnippet };
          relevantKnowledge = Array.isArray(relevantKnowledge)
            ? [faqItem, ...relevantKnowledge]
            : [faqItem];
        }
        if (identitySnippet) {
          const idItem = { title: 'Identity', content: identitySnippet };
          relevantKnowledge = Array.isArray(relevantKnowledge)
            ? [idItem, ...relevantKnowledge]
            : [idItem];
        }
      }
      
      // Prefer entries matching user's GHL tags/location
      relevantKnowledge = this._prioritizeKnowledgeByProfile(relevantKnowledge, userProfile);

      // Generate contextual reply
      const knowledgeCount = Array.isArray(relevantKnowledge) ? relevantKnowledge.length : 0;
      console.log(`📚 Knowledge items selected for reply: ${knowledgeCount}`);
      const reply = await this.generateEnhancedReply(message, userProfile, memory, relevantKnowledge, null);
      
      // Store this conversation in memory
      await this.storeConversation(phoneNumber, message, reply);
      
      return reply;
    } catch (error) {
      console.error('Error generating contextual reply:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Reorder knowledge items to prioritize matches with user's tags/location
  _prioritizeKnowledgeByProfile(items, userProfile) {
    try {
      const list = Array.isArray(items) ? items.slice() : [];
      if (!list.length) return list;
      const tags = Array.isArray(userProfile?.tags) ? userProfile.tags.map(t => String(t).toLowerCase()) : [];
      if (!tags.length) return list;
      const locationTag = tags.find(t => t.startsWith('location:')) || null;
      const tagWords = tags
        .map(t => t.replace(/^location:/, '').trim())
        .filter(Boolean);

      const scoreItem = (it) => {
        const textBlob = `${String(it.title||'').toLowerCase()}\n${String(it.content||'').toLowerCase()}\n${String(it.source||'').toLowerCase()}`;
        let score = 0;
        for (const w of tagWords) {
          if (!w) continue;
          if (textBlob.includes(w.toLowerCase())) score += 1.0;
        }
        if (locationTag) {
          const locVal = locationTag.split(':').slice(1).join(':').trim().toLowerCase();
          if (locVal && textBlob.includes(locVal)) score += 0.5;
        }
        return score;
      };

      return list
        .map(it => ({ it, score: scoreItem(it) }))
        .sort((a, b) => b.score - a.score)
        .map(({ it }) => it);
    } catch (_) {
      return Array.isArray(items) ? items : [];
    }
  }

  // Simple intent detector to steer RAG thresholds
  _detectQueryIntent(message) {
    const m = (message || '').toLowerCase();
    const intents = [
      { category: 'services', requiresKnowledge: true, patterns: ['service', 'services', 'offer', 'provide', 'solution', 'solutions'] },
      { category: 'pricing', requiresKnowledge: true, patterns: ['price', 'pricing', 'cost', 'fee', 'charges', 'plans'] },
      { category: 'automation', requiresKnowledge: true, patterns: ['automation', 'automate', 'workflow', 'whatsapp', 'zapier', 'integration'] },
      { category: 'identity', requiresKnowledge: true, patterns: ['company', 'website', 'about', 'who are you', 'what is your company'] },
      { category: 'support', requiresKnowledge: true, patterns: ['support', 'contact', 'email', 'help', 'address', 'phone', 'hours'] }
    ];
    for (const intent of intents) {
      if (intent.patterns.some(p => m.includes(p))) return intent;
    }
    return { category: 'general', requiresKnowledge: false };
  }

  async safeRetrieveEmbeddings(query, conversationId, userContext = null, minSimilarity = 0.2, tenantId = null, topK = 8) {
    try {
      if (!this.embeddings) return [];
      const results = await this.embeddings.retrieve({ query, topK, conversationId: null, userContext, minSimilarity, tenantId });
      if (Array.isArray(results) && results.length > 0) {
        return results;
      }
      // Fallback: keyword search when vector retrieval returns empty
      const keywordMatches = this.searchKnowledgeBase(query) || [];
      if (keywordMatches.length > 0) {
        console.log('🔎 Fallback to keyword search for knowledge retrieval');
        return keywordMatches.slice(0, topK).map(k => ({
          id: k.id,
          title: k.title,
          content: k.content,
          similarity: 1.0,
          sourceType: 'knowledge'
        }));
      }
      return [];
    } catch (e) {
      // When embeddings provider is unavailable (e.g., missing OPENROUTER_API_KEY), use keyword fallback
      try {
        const keywordMatches = this.searchKnowledgeBase(query) || [];
        if (keywordMatches.length > 0) {
          console.log('🔎 Fallback to keyword search due to embeddings error:', e?.message);
          return keywordMatches.slice(0, topK).map(k => ({
            id: k.id,
            title: k.title,
            content: k.content,
            similarity: 1.0,
            sourceType: 'knowledge'
          }));
        }
      } catch (_) {}
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

      // Business-hours logic removed per configuration; do not gate by time windows

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

  // Business-hours utility removed

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
      // Guard against missing or partially initialized GHL service
      if (!this.ghlService || typeof this.ghlService.normalizePhoneNumber !== 'function' || typeof this.ghlService.findContactByPhone !== 'function') {
        return null;
      }
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

  // Search knowledge base (token-based scoring, fuzzy match)
  searchKnowledgeBase(query) {
    try {
      const text = String(query || '').toLowerCase();
      if (!text.trim()) return [];

      // Tokenize query into meaningful words
      const tokens = text
        .split(/[^a-z0-9+]+/i)
        .map(t => t.trim())
        .filter(t => t && t.length > 2);
      if (!tokens.length) return [];

      // Common business keywords boost
      const boostTokens = new Set(['service','services','pricing','price','products','automation','whatsapp','seo','features','plans','company','website','about','address','support','contact','hours']);

      const scored = [];
      for (const [, item] of this.knowledgeBase) {
        const blob = `${String(item.title||'').toLowerCase()}\n${String(item.content||'').toLowerCase()}\n${String(item.category||'').toLowerCase()}`;
        let score = 0;
        for (const tok of tokens) {
          if (!tok) continue;
          if (blob.includes(tok)) {
            score += 1;
            if (boostTokens.has(tok)) score += 0.5;
          }
        }
        // Lightweight semantic hint: partial matches for plural/singular
        for (const tok of tokens) {
          const base = tok.replace(/s$/,'');
          if (base && base.length > 2 && blob.includes(base)) score += 0.25;
        }
        if (score > 0) scored.push({ item, score });
      }

      // Sort by score desc, then by recency
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const at = a.item.createdAt || 0;
        const bt = b.item.createdAt || 0;
        return bt - at;
      });

      return scored.slice(0, 3).map(s => s.item);
    } catch (_) {
      return [];
    }
  }

  // Generate enhanced reply with memory and knowledge
  async generateEnhancedReply(message, userProfile, memory, relevantKnowledge, userContext = null) {
    try {
      // Ensure memory is an array
      const memoryArray = Array.isArray(memory) ? memory : [];
      
      // Ensure relevantKnowledge is an array
      const knowledgeArray = Array.isArray(relevantKnowledge) ? relevantKnowledge : [];
      
      // Build context from memory - use more context (up to this.conversationContextWindow)
      const contextMessages = memoryArray.slice(-this.conversationContextWindow).map(m => 
        `User: ${m.user}\nAI: ${m.ai}`
      ).join('\n\n');
      
      // Build comprehensive user context using RAG data
      let contextString = this.buildComprehensiveUserContext(userProfile, userContext);
      
      // Build knowledge context with more complete information
      const knowledgeContext = knowledgeArray.length > 0 ?
        `Relevant Information:\n${knowledgeArray.map(k => {
          const preview = (k.content || '').substring(0, 300);
          const src = k.source ? ` (source: ${k.source})` : '';
          return `- ${k.title}: ${preview}...${src}`;
        }).join('\n\n')}` :
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
      
      const aiResponse = await this.aiService.generateCustomReply(message, prompt, context);
      console.log('🤖 AI Service response:', aiResponse ? 'Generated' : 'NULL');
      
      // If AI service returns null (e.g., API key issues), use fallback
      if (!aiResponse) {
        console.log('🔄 AI service returned null, using fallback response');
        return this.getFallbackResponse(message);
      }
      
      // Optionally append minimal source hints if enabled
      let finalResponse = aiResponse;
      try {
        const mode = this.citationMode;
        const knowledgeArray = Array.isArray(relevantKnowledge) ? relevantKnowledge : [];
        const knowledgeUsed = knowledgeArray.length > 0;
        if (finalResponse && knowledgeUsed && (mode === 'always' || mode === 'auto')) {
          const sources = [...new Set(knowledgeArray
            .map(k => (k.source || k.url || '')
              .replace(/^https?:\/\//, '')
              .replace(/\/$/, ''))
            .filter(Boolean))].slice(0, 3);
          if (sources.length) {
            finalResponse += `\n\nSources: ${sources.join(', ')}`;
          }
        }
      } catch (_) {}

      return finalResponse;
      
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

  // Generate personalized response using comprehensive user data
  generatePersonalizedResponse(message, userProfile, memory, relevantKnowledge, userContext) {
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
    
    // Business information questions
    else if (lowerMessage.includes('business name') || lowerMessage.includes('company name') || lowerMessage.includes('what\'s your business') || lowerMessage.includes('your business name')) {
      return `Our business name is ${this.aiPersonality.company}! We're dedicated to providing you with the best experience possible. If you have any questions or need assistance, just let me know—I'm here to help! 😊`;
    }
    
    else if (lowerMessage.includes('website') || lowerMessage.includes('your website') || lowerMessage.includes('web site')) {
      return `Our website is ${this.aiPersonality.website}. You can find more information about our services and helpful resources there. If you have any specific questions or need assistance navigating the site, just let me know—I'm here to help! 😊`;
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
    // Avoid leaking placeholder identity values into the prompt
    const isPlaceholderCompany = this._isPlaceholderIdentity(this.aiPersonality.company, 'company');
    const isPlaceholderWebsite = this._isPlaceholderIdentity(this.aiPersonality.website, 'website');
    const companyPart = isPlaceholderCompany ? '' : this.aiPersonality.company;
    const websitePart = isPlaceholderWebsite ? '' : this.aiPersonality.website;

    const identityLine = companyPart || websitePart
      ? `You are ${this.aiPersonality.name}, a ${this.aiPersonality.role}${companyPart ? ` at ${companyPart}` : ''}${websitePart ? ` (${websitePart})` : ''}.`
      : `You are ${this.aiPersonality.name}, a ${this.aiPersonality.role}.`;
    const website = this._normalizeWebsite(this.aiPersonality.website || '');

    return `
${identityLine}
Your personality: ${this.aiPersonality.tone} and ${this.aiPersonality.traits.join(', ')}.

${userContext}

${contextMessages ? `Previous conversation context:\n${contextMessages}\n` : ''}

${knowledgeContext}

Current message: ${message}

 Instructions:
  - If "Relevant Information" is present, base the answer strictly on it.
  - Do not invent facts or rely on personality for content; use personality only for tone.
  - Use specific facts from knowledge (company, website, services, pricing, policies) and cite if asked.
  - If knowledge is empty, say you don’t have enough information and ask a clarifying question.
  ${website ? `- You may optionally direct the user to ${website} for more details.` : ''}

Respond as ${this.aiPersonality.name} would, using the knowledge and context above. Keep responses concise and grounded.
    `.trim();
  }

  // Detect placeholder identity values
  _isPlaceholderIdentity(value, type = 'company') {
    if (!value) return true;
    const v = String(value).trim();
    if (!v) return true;
    if (type === 'company') {
      return /^(Your Business|Company|Business)$/i.test(v);
    }
    if (type === 'website') {
      return /yourbusiness\.com|example\.com/i.test(v);
    }
    return false;
  }

  // Template Management
  async loadTemplates() {
    try {
      const data = await fs.readFile(this.templatesPath, 'utf8');
      const templates = JSON.parse(data);
      // Load as Map keyed by id
      this.templates = new Map(Object.entries(templates));
      // Sanitize and dedupe by name (case-insensitive)
      this._sanitizeAndDedupeTemplates();
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
    // Generate id if missing
    let newId = id && String(id).trim() ? String(id).trim() : `tpl_${Date.now()}`;
    const cleanName = String(name || '').trim();
    const cleanContent = this._sanitizeContent(String(content || ''));
    const cleanMediaUrl = this._sanitizeMediaUrl(String(mediaUrl || ''));
    const cleanCategory = String(category || 'general').trim() || 'general';

    // Upsert by name (case-insensitive): if a template with same name exists, reuse its id
    const existing = Array.from(this.templates.values()).find(t => String(t.name || '').toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      newId = existing.id || newId;
    }

    const record = {
      id: newId,
      name: cleanName,
      content: cleanContent,
      category: cleanCategory,
      mediaUrl: cleanMediaUrl,
      mediaType: String(mediaType || '').trim(),
      createdAt: Date.now()
    };

    this.templates.set(newId, record);
    // Ensure no duplicates remain by name and sanitize collection
    this._sanitizeAndDedupeTemplates();
    await this.saveTemplates();
    console.log(`📝 Added/Updated template: ${cleanName}`);
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

  // --- Sanitization helpers ---
  _sanitizeContent(text) {
    // Trim and normalize whitespace around curly braces
    const trimmed = String(text || '').trim();
    return trimmed;
  }

  _sanitizeMediaUrl(url) {
    if (!url) return '';
    let u = String(url).trim();
    // Strip leading/trailing backticks or quotes
    u = u.replace(/^\s*[`'\"]+/, '').replace(/[`'\"]+\s*$/, '');
    // Also remove accidental spaces
    u = u.trim();
    return u;
  }

  _sanitizeAndDedupeTemplates() {
    // Build a new map keyed by id while enforcing unique names
    const byName = new Map(); // lower(name) -> record
    const newMap = new Map();
    for (const [key, t] of this.templates.entries()) {
      const id = (t && t.id) ? String(t.id).trim() : (String(key).trim() || `tpl_${Date.now()}`);
      const name = String(t && t.name ? t.name : '').trim();
      if (!name) continue; // skip nameless entries
      const content = this._sanitizeContent(String(t && t.content ? t.content : ''));
      const category = String(t && t.category ? t.category : 'general').trim() || 'general';
      const mediaUrl = this._sanitizeMediaUrl(String(t && t.mediaUrl ? t.mediaUrl : ''));
      const mediaType = String(t && t.mediaType ? t.mediaType : '').trim();
      const createdAt = Number(t && t.createdAt ? t.createdAt : Date.now());

      const clean = { id, name, content, category, mediaUrl, mediaType, createdAt };
      const keyName = name.toLowerCase();
      const existing = byName.get(keyName);
      if (!existing) {
        byName.set(keyName, clean);
      } else {
        // Keep the one with non-empty mediaUrl, otherwise the latest createdAt
        const prefer = (existing.mediaUrl && !mediaUrl) ? existing : (!existing.mediaUrl && mediaUrl) ? clean : (createdAt >= existing.createdAt ? clean : existing);
        byName.set(keyName, prefer);
      }
    }
    // Re-key by id and replace the templates map
    for (const rec of byName.values()) {
      newMap.set(rec.id, rec);
    }
    this.templates = newMap;
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

  applyTemplateVariables(templateText, userProfile, variables = {}) {
    try {
      let result = String(templateText ?? '');
      const profile = userProfile || {};

      // Optional: apply arbitrary variables first (e.g., {key} without cf.)
      const vars = variables || profile.variables || null;
      if (vars && typeof vars === 'object') {
        try {
          for (const [key, val] of Object.entries(vars)) {
            const re = new RegExp(`\\{${key}\\}`, 'g');
            result = result.replace(re, String(val ?? ''));
          }
        } catch (_) {}
      }

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

  async addKnowledgeItem(id, title, content, category = 'general', tenantId = null) {
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
        chunkMeta: { title, category, tenantId: tenantId || undefined, tenant_tags: tenantId ? [tenantId] : undefined },
        tenantId
      });
    } catch (e) {}
  }

  // Fallback response
  getFallbackResponse(message) {
    // RAG-first fallback: avoid personality-only answers. Ask for clarification and point to website/docs.
    const website = this._normalizeWebsite(this.aiPersonality.website || '');
    const hint = website ? ` You can also find details here: ${website}` : '';
    return `I don't have enough verified information in our knowledge base to answer that yet. Could you clarify what you need (e.g., services, pricing, or a specific feature)?${hint}`;
  }

  // Normalize website to include scheme
  _normalizeWebsite(url) {
    try {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      return `https://${trimmed.replace(/^\/*/, '')}`;
    } catch (_) {
      return String(url || '');
    }
  }

  // Deterministic answers for identity queries (website/company)
  _getDeterministicIdentityAnswer(message) {
    if (!message || typeof message !== 'string') return null;
    const m = message.toLowerCase();

    const websitePatterns = [
      'website', 'web site', 'site', 'url', 'link', 'homepage', 'home page'
    ];
    const companyPatterns = [
      'business name', 'company name', 'your company', 'your business', 'who are you', 'what is your company', 'what is your business'
    ];

    const matchesAny = (patterns) => patterns.some(p => m.includes(p));

    if (matchesAny(websitePatterns)) {
      const website = this._normalizeWebsite(this.aiPersonality.website || '');
      if (website) {
        return `Our website is ${website}`;
      }
    }

    if (matchesAny(companyPatterns)) {
      const company = (this.aiPersonality.company || '').trim();
      if (company) {
        return `Our company name is ${company}!`;
      }
    }

    return null;
  }

  // Placeholder detection helpers to avoid leaking defaults
  _isPlaceholderWebsite(url) {
    const u = String(url || '').toLowerCase();
    return !u || u.includes('yourbusiness');
  }

  _isPlaceholderCompany(name) {
    const n = String(name || '').toLowerCase();
    return !n || n === 'your business' || n === 'your company';
  }

  // Deterministic answers for common brand FAQs using personality or knowledge base
  _getDeterministicBrandFAQAnswer(message) {
    if (!message || typeof message !== 'string') return null;
    const m = message.toLowerCase();

    // Extract details from personality if present
    const personalityEmail = (this.aiPersonality.supportEmail || this.aiPersonality.email || '').trim();
    const personalityAddress = (this.aiPersonality.address || '').trim();
    const personalitySupportLink = (this.aiPersonality.supportLink || this.aiPersonality.contactLink || '').trim();
    const personalityPhone = (this.aiPersonality.supportPhone || this.aiPersonality.phone || '').trim();
    const personalityHours = (this.aiPersonality.businessHours || this.aiPersonality.hours || '').trim();

    // Helper to mine contact details from loaded knowledge base content
    const kbDetails = this._extractBrandContactDetails();

    // Patterns
    const emailPatterns = ['email', 'support email', 'contact email', 'mail id', 'mail'];
    const addressPatterns = ['address', 'location', 'office address', 'headquarters', 'hq'];
    const supportPatterns = ['support', 'help center', 'helpdesk', 'contact page', 'contact link'];
    const phonePatterns = ['phone', 'contact number', 'whatsapp', 'mobile', 'call'];
    const hoursPatterns = ['business hours', 'working hours', 'hours of operation', 'timing', 'time'];

    const matchesAny = (patterns) => patterns.some(p => m.includes(p));

    // Email
    if (matchesAny(emailPatterns)) {
      const email = personalityEmail || kbDetails.email;
      if (email) return `You can reach us at ${email}`;
    }

    // Address
    if (matchesAny(addressPatterns)) {
      const address = personalityAddress || kbDetails.address;
      if (address) return `Our address is ${address}`;
    }

    // Support link
    if (matchesAny(supportPatterns)) {
      const link = personalitySupportLink || kbDetails.supportLink || this._normalizeWebsite(this.aiPersonality.website || '');
      if (link) return `For support, visit ${link}`;
    }

    // Phone
    if (matchesAny(phonePatterns)) {
      const phone = personalityPhone || kbDetails.phone;
      if (phone) return `You can call or WhatsApp us at ${phone}`;
    }

    // Business hours
    if (matchesAny(hoursPatterns)) {
      const hours = personalityHours || kbDetails.hours;
      if (hours) return `Our business hours are ${hours}`;
    }

    return null;
  }

  // Mine contact details from raw knowledge base items (no embeddings/API)
  _extractBrandContactDetails() {
    try {
      const details = { email: null, supportLink: null, phone: null, address: null, hours: null };
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const urlRegex = /(https?:\/\/[^\s)]+)|((www\.)[^\s)]+)/g;
      const phoneRegex = /\+?\d[\d\s-]{6,}\d/g; // simple international pattern
      const addressKeywords = ['address', 'location', 'office', 'hq', 'headquarters'];
      const hoursKeywords = ['hours', 'timing', 'business hours', 'working hours'];

      for (const [, item] of this.knowledgeBase) {
        const content = String(item.content || '');
        const lower = content.toLowerCase();

        // Email
        if (!details.email) {
          const emails = content.match(emailRegex);
          if (emails && emails.length) details.email = emails[0];
        }

        // URL (support/contact)
        if (!details.supportLink) {
          const urls = content.match(urlRegex);
          if (urls && urls.length) {
            // Prefer links that look like contact or support pages
            const preferred = urls.find(u => String(u).toLowerCase().includes('contact') || String(u).toLowerCase().includes('support') || String(u).toLowerCase().includes('help'));
            details.supportLink = this._normalizeWebsite(preferred || urls[0]);
          }
        }

        // Phone
        if (!details.phone) {
          const phones = content.match(phoneRegex);
          if (phones && phones.length) details.phone = phones[0].replace(/\s+/g, '').replace(/-+/g, '');
        }

        // Address (take the sentence/line containing keyword, limit snippet length)
        if (!details.address) {
          const lines = content.split(/\r?\n|\.\s+/);
          const matchLine = lines.find(l => addressKeywords.some(k => String(l).toLowerCase().includes(k)));
          if (matchLine) {
            const snippet = matchLine.trim();
            details.address = snippet.length > 200 ? snippet.substring(0, 200) + '…' : snippet;
          }
        }

        // Hours (limit snippet length)
        if (!details.hours) {
          const lines = content.split(/\r?\n|\.\s+/);
          const matchLine = lines.find(l => hoursKeywords.some(k => String(l).toLowerCase().includes(k)));
          if (matchLine) {
            const snippet = matchLine.trim();
            details.hours = snippet.length > 160 ? snippet.substring(0, 160) + '…' : snippet;
          }
        }

        // Early exit if we found enough
        if (details.email && details.supportLink && details.phone) break;
      }

      return details;
    } catch (_) {
      return { email: null, supportLink: null, phone: null, address: null, hours: null };
    }
  }

  // Derive a primary website from knowledge base content
  _extractPrimaryWebsiteFromKnowledge() {
    try {
      const urlRegex = /(https?:\/\/[^\s)]+)|((www\.)[^\s)]+)/g;
      const candidates = [];
      for (const [, item] of this.knowledgeBase) {
        const content = String(item.content || '');
        const urls = content.match(urlRegex);
        if (urls && urls.length) {
          for (const raw of urls) {
            const normalized = this._normalizeWebsite(raw);
            candidates.push(normalized);
          }
        }
      }
      if (!candidates.length) return '';
      // Prefer brand-looking domains first (e.g., synthcore)
      const preferred = candidates.find(u => u.toLowerCase().includes('synthcore')) || candidates[0];
      return preferred;
    } catch (_) {
      return '';
    }
  }

  // Hydrate personality from integrations and knowledge base details
  async _hydratePersonalityFromIntegrationsAndKnowledge() {
    try {
      // 1) Integrations mapping (business name)
      try {
        const integrationsPath = path.join(__dirname, '..', 'data', 'integrations.json');
        const raw = await fs.readFile(integrationsPath, 'utf8');
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed.integrations) ? parsed.integrations : [];
        if (list.length) {
          const locId = (this.ghlService && this.ghlService.locationId) || process.env.GHL_LOCATION_ID || '';
          const integ = list.find(i => i.ghlLocationId === locId) || list[0];
          if (integ) {
            const nameCandidate = integ.businessName || integ.ghlLocationName || '';
            if (nameCandidate && this._isPlaceholderCompany(this.aiPersonality.company)) {
              this.aiPersonality.company = nameCandidate;
            }
          }
        }
      } catch (_) {}

      // 2) Knowledge base derived website and contact info
      const kbWebsite = this._extractPrimaryWebsiteFromKnowledge();
      if (kbWebsite && this._isPlaceholderWebsite(this.aiPersonality.website)) {
        this.aiPersonality.website = kbWebsite;
      }

      const kbDetails = this._extractBrandContactDetails();
      if (!this.aiPersonality.supportEmail && kbDetails.email) this.aiPersonality.supportEmail = kbDetails.email;
      if (!this.aiPersonality.supportPhone && kbDetails.phone) this.aiPersonality.supportPhone = kbDetails.phone;
      if (!this.aiPersonality.supportLink && kbDetails.supportLink) this.aiPersonality.supportLink = kbDetails.supportLink;
      if (!this.aiPersonality.address && kbDetails.address) this.aiPersonality.address = kbDetails.address;
      if (!this.aiPersonality.businessHours && kbDetails.hours) this.aiPersonality.businessHours = kbDetails.hours;

      // Normalize website and links
      if (this.aiPersonality.website) this.aiPersonality.website = this._normalizeWebsite(this.aiPersonality.website);
      if (this.aiPersonality.supportLink) this.aiPersonality.supportLink = this._normalizeWebsite(this.aiPersonality.supportLink);
    } catch (_) {}
  }

  // Ensure personality is loaded (idempotent)
  async ensurePersonalityLoaded() {
    if (this._personalityLoaded) return;
    try {
      await this.loadPersonality();
    } catch (_) {
      // keep defaults if load fails
    }
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

  // Load AI personality from file
  async loadPersonality() {
    try {
      const data = await fs.readFile(this.personalityPath, 'utf8');
      const personality = JSON.parse(data);
      this.aiPersonality = {
        name: personality.name || 'AI Assistant',
        role: personality.role || 'Customer Support Representative',
        company: personality.company || 'Your Business',
        website: personality.website || 'www.yourbusiness.com',
        tone: personality.tone || 'professional and helpful',
        traits: personality.traits || ['helpful', 'empathetic', 'solution-oriented'],
        // Optional structured brand fields for deterministic answers
        supportEmail: personality.supportEmail || personality.email || '',
        supportLink: personality.supportLink || personality.contactLink || '',
        address: personality.address || '',
        businessHours: personality.businessHours || personality.hours || '',
        supportPhone: personality.supportPhone || personality.phone || ''
      };
      // Normalize website to include scheme and prevent placeholder leakage
      if (this.aiPersonality.website && !/^https?:\/\//i.test(this.aiPersonality.website)) {
        this.aiPersonality.website = `https://${this.aiPersonality.website}`;
      }
      // Normalize links if present
      if (this.aiPersonality.supportLink && !/^https?:\/\//i.test(this.aiPersonality.supportLink)) {
        this.aiPersonality.supportLink = `https://${String(this.aiPersonality.supportLink).replace(/^\/*/, '')}`;
      }
      // Hydrate from integrations and knowledge base to prioritize real business context
      await this._hydratePersonalityFromIntegrationsAndKnowledge();
      this._personalityLoaded = true;
      console.log('🤖 AI personality loaded from file:', this.aiPersonality);
    } catch (error) {
      console.log('⚠️ Could not load AI personality from file, using defaults');
      // Keep the default personality that was set in constructor
    }
  }

  // Update AI personality
  updatePersonality(newPersonality) {
    this.aiPersonality = { ...this.aiPersonality, ...newPersonality };
    console.log('🤖 AI personality updated:', this.aiPersonality);
  }

  // Get AI personality
  getPersonality() {
    return this.aiPersonality;
  }

  // Add knowledge file (PDF, DOC, TXT, etc.)
  async addKnowledgeFile(file, category = 'general', description = '', tenantId = null) {
    try {
      console.log(`📄 Processing knowledge file: ${file.originalname}`);
      
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = path.basename(file.originalname, fileExtension);
      const filePath = file.path;
      
      let extractedContent = '';
      let metadata = {
        filename: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploadedAt: new Date().toISOString()
      };

      // Process different file types
      if (fileExtension === '.pdf') {
        // Use PDF processing service if available
        try {
          const PDFProcessingService = require('./pdfProcessingService');
          const pdfService = new PDFProcessingService(this.embeddings);
          const pdfResult = await pdfService.processPDF(filePath);
          extractedContent = pdfResult.text;
          metadata = { ...metadata, ...pdfResult.metadata };
        } catch (pdfError) {
          console.warn('PDF processing service not available, trying direct pdf-parse:', pdfError.message);
          // Fallback to direct pdf-parse
          try {
            const pdfParse = require('pdf-parse');
            const fs = require('fs').promises;
            const pdfBuffer = await fs.readFile(filePath);
            const pdfData = await pdfParse(pdfBuffer);
            extractedContent = pdfData.text;
            metadata = { 
              ...metadata, 
              pages: pdfData.numpages,
              info: pdfData.info
            };
          } catch (directPdfError) {
            console.warn('Direct PDF parsing failed:', directPdfError.message);
            extractedContent = `PDF document: ${fileName}. Content extraction failed. Please ensure pdf-parse package is properly installed.`;
          }
        }
      } else if (fileExtension === '.doc' || fileExtension === '.docx') {
        // Process DOC/DOCX files using mammoth
        try {
          const mammoth = require('mammoth');
          const fs = require('fs').promises;
          const docBuffer = await fs.readFile(filePath);
          const result = await mammoth.extractRawText({ buffer: docBuffer });
          extractedContent = result.value;
          if (result.messages && result.messages.length > 0) {
            console.log('Document conversion messages:', result.messages);
          }
        } catch (docError) {
          console.warn('DOC/DOCX processing failed:', docError.message);
          extractedContent = `Document: ${fileName}. Content extraction for ${fileExtension} files failed. Please ensure mammoth package is properly installed or convert to PDF format.`;
        }
      } else if (fileExtension === '.txt' || fileExtension === '.md') {
        // Process text files
        const fs = require('fs').promises;
        extractedContent = await fs.readFile(filePath, 'utf8');
      } else if (fileExtension === '.json') {
        // Process JSON files
        const fs = require('fs').promises;
        const jsonData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        extractedContent = JSON.stringify(jsonData, null, 2);
      } else if (fileExtension === '.csv') {
        // Process CSV files
        const fs = require('fs').promises;
        const csvContent = await fs.readFile(filePath, 'utf8');
        // Convert CSV to readable format
        const lines = csvContent.split('\n');
        const headers = lines[0] ? lines[0].split(',') : [];
        extractedContent = `CSV Data (${lines.length} rows):\n\nHeaders: ${headers.join(', ')}\n\nContent:\n${csvContent.substring(0, 2000)}${csvContent.length > 2000 ? '...' : ''}`;
      } else {
        // Fallback for other file types
        extractedContent = `File: ${fileName}. Unsupported file type ${fileExtension}. Supported formats: PDF, DOC, DOCX, TXT, MD, JSON, CSV.`;
      }

      // Create knowledge base entry
      const knowledgeEntry = {
        id: `file-${Date.now()}`,
        title: fileName,
        content: extractedContent,
        filename: file.originalname,
        category: category,
        description: description,
        metadata: metadata,
        createdAt: new Date().toISOString(),
        source: 'file_upload'
      };

      // Add to knowledge base
      this.knowledgeBase.set(knowledgeEntry.id, knowledgeEntry);
      await this.saveKnowledgeBase();

      // Index into embeddings store for RAG
      try {
        if (extractedContent && extractedContent.length > 50) {
          await this.embeddings.indexText({
            conversationId: null,
            sourceType: 'document',
            sourceId: knowledgeEntry.id,
            text: extractedContent,
            chunkMeta: { 
              filename: file.originalname,
              title: fileName,
              description: description, 
              category: category,
              fileType: fileExtension,
              uploadedAt: metadata.uploadedAt,
              tenantId: tenantId || undefined,
              tenant_tags: tenantId ? [tenantId] : undefined
            },
            tenantId
          });
          console.log(`📚 Indexed document content into embeddings: ${knowledgeEntry.id}`);
        }
      } catch (embeddingError) {
        console.warn('Failed to index into embeddings:', embeddingError.message);
      }

      // Clean up uploaded file
      try {
        const fs = require('fs').promises;
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError.message);
      }

      console.log(`✅ Knowledge file processing completed: ${file.originalname}`);
      return {
        success: true,
        id: knowledgeEntry.id,
        filename: file.originalname,
        title: fileName,
        content: extractedContent.substring(0, 200) + '...',
        category: category,
        contentLength: extractedContent.length,
        metadata: metadata
      };
    } catch (error) {
      console.error('Error processing knowledge file:', error);
      return {
        success: false,
        error: error.message,
        filename: file.originalname
      };
    }
  }

  // Website training method
  async trainFromWebsite(url, description = '', category = 'general', tenantId = null) {
    try {
      console.log(`🌐 Training AI from website: ${url}`);
      
      // Extract content from website
      const extractedData = await this.extractWebsiteContent(url);
      
      // Check if extraction failed
      if (extractedData.error) {
        return {
          success: false,
          error: extractedData.content
        };
      }
      
      // Create knowledge base entry
      const knowledgeEntry = {
        id: `website-${Date.now()}`,
        title: extractedData.title,
        content: extractedData.content,
        source: url,
        description: description || extractedData.description,
        category: category,
        createdAt: new Date().toISOString(),
        extractedAt: extractedData.extractedAt
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
          text: extractedData.content,
          chunkMeta: { 
            url, 
            title: extractedData.title,
            description: knowledgeEntry.description, 
            category,
            tenantId: tenantId || undefined,
            tenant_tags: tenantId ? [tenantId] : undefined
          },
          tenantId
        });
        console.log(`📚 Indexed website content into embeddings: ${knowledgeEntry.id}`);
      } catch (embeddingError) {
        console.warn('Failed to index into embeddings:', embeddingError.message);
      }
      
      console.log(`✅ Website training completed: ${url}`);
      return {
        success: true,
        id: knowledgeEntry.id,
        title: extractedData.title,
        content: extractedData.content.substring(0, 200) + '...',
        url: url,
        contentLength: extractedData.content.length
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
      console.log(`🌐 Extracting content from: ${url}`);
      
      // Import axios and cheerio
      const axios = require('axios');
      const cheerio = require('cheerio');
      
      // Configure axios with better settings
      const response = await axios.get(url, {
        timeout: 15000, // 15 seconds timeout
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-media, .comments').remove();
      
      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
      
      // Extract meta description
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';
      
      // Extract main content - prioritize main content areas
      let content = '';
      
      // Try to find main content areas
      const contentSelectors = [
        'main', 
        'article', 
        '.content', 
        '.main-content', 
        '.post-content', 
        '.entry-content',
        '#content',
        '.container'
      ];
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text();
          break;
        }
      }
      
      // Fallback to body if no main content found
      if (!content) {
        content = $('body').text();
      }
      
      // Clean up the text
      content = content
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .trim();
      
      // Limit content length but try to break at sentence boundaries
      const maxLength = 8000;
      if (content.length > maxLength) {
        const truncated = content.substring(0, maxLength);
        const lastSentence = truncated.lastIndexOf('.');
        if (lastSentence > maxLength * 0.8) {
          content = truncated.substring(0, lastSentence + 1);
        } else {
          content = truncated + '...';
        }
      }
      
      console.log(`✅ Extracted ${content.length} characters from ${url}`);
      
      return {
        title,
        description,
        content,
        url,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error extracting website content:', error);
      
      // Return a more informative error response
      return {
        title: `Content from ${url}`,
        description: `Failed to extract content: ${error.message}`,
        content: `Unable to extract content from ${url}. Error: ${error.message}. Please check if the URL is accessible and try again.`,
        url,
        extractedAt: new Date().toISOString(),
        error: true
      };
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

  // Get all knowledge base items
  getKnowledgeBase() {
    try {
      const items = [];
      for (const [id, entry] of this.knowledgeBase) {
        const meta = entry.metadata || {};
        const uploadedAt = meta.uploadedAt || entry.createdAt || new Date().toISOString();
        const sizeBytes = typeof meta.size === 'number' ? meta.size : (entry.content ? Buffer.byteLength(entry.content, 'utf8') : 0);
        const processed = !!(entry.content && entry.content.length > 0);

        items.push({
          id: entry.id || id,
          filename: entry.filename || entry.title || 'Untitled',
          category: entry.category || 'general',
          uploadedAt,
          size: sizeBytes,
          processed,
          description: entry.description || ''
        });
      }
      return items.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    } catch (error) {
      console.error('Error getting knowledge base:', error);
      return [];
    }
  }

  // Get specific knowledge base item
  getKnowledgeItem(id) {
    try {
      return this.knowledgeBase.get(id) || null;
    } catch (error) {
      console.error('Error getting knowledge item:', error);
      return null;
    }
  }

  // Delete knowledge base item
  async deleteKnowledgeItem(id) {
    try {
      const deleted = this.knowledgeBase.delete(id);
      if (deleted) {
        await this.saveKnowledgeBase();
        console.log(`🗑️ Deleted knowledge item: ${id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      return false;
    }
  }

  // Get knowledge base statistics
  getKnowledgeBaseStats() {
    try {
      const totalEntries = this.knowledgeBase.size;
      const categories = new Map();
      const sources = new Map();
      
      for (const [id, entry] of this.knowledgeBase) {
        // Count by category
        const category = entry.category || 'uncategorized';
        categories.set(category, (categories.get(category) || 0) + 1);
        
        // Count by source type
        const sourceType = entry.source ? 
          (entry.source.startsWith('http') ? 'website' : 'document') : 
          'manual';
        sources.set(sourceType, (sources.get(sourceType) || 0) + 1);
      }
      
      return {
        totalEntries,
        categories: Object.fromEntries(categories),
        sources: Object.fromEntries(sources),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      return {
        totalEntries: 0,
        categories: {},
        sources: {},
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

module.exports = EnhancedAIService;