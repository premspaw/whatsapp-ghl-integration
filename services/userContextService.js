const EventEmitter = require('events');
const ConversationAnalyticsService = require('./conversationAnalyticsService');

/**
 * User Context Service - RAG Integration for GHL User Data
 * 
 * This service aggregates all available user data from GHL to provide
 * rich context for AI responses, implementing a RAG (Retrieval Augmented Generation) approach.
 */
class UserContextService extends EventEmitter {
  constructor(ghlService) {
    super();
    this.ghlService = ghlService;
    this.conversationAnalytics = new ConversationAnalyticsService(ghlService);
    this.userContextCache = new Map(); // Cache user contexts
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes cache
    this.maxCacheSize = 1000; // Maximum cached contexts
  }

  /**
   * Get comprehensive user context for AI RAG
   * @param {string} phoneNumber - User's phone number
   * @param {string} conversationId - Current conversation ID
   * @returns {Object} Complete user context for AI
   */
  async getUserContext(phoneNumber, conversationId = null) {
    try {
      console.log('🔍 Building comprehensive user context for:', phoneNumber);

      // Check cache first
      const cacheKey = `context:${phoneNumber}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('📋 Using cached user context');
        return cached;
      }

      // Build comprehensive context
      const context = await this.buildUserContext(phoneNumber, conversationId);
      
      // Cache the context
      this.setCache(cacheKey, context);
      
      console.log('✅ User context built successfully');
      return context;

    } catch (error) {
      console.error('❌ Error building user context:', error);
      return this.getMinimalContext(phoneNumber);
    }
  }

  /**
   * Build comprehensive user context from all GHL data sources
   */
  async buildUserContext(phoneNumber, conversationId) {
    const normalizedPhone = this.ghlService.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return this.getMinimalContext(phoneNumber);
    }

    // Get base contact information
    const contact = await this.ghlService.findContactByPhone(normalizedPhone);
    if (!contact) {
      return this.getMinimalContext(phoneNumber);
    }

    // Parallel data fetching for performance
    const [
      opportunities,
      conversations,
      tags,
      pipelines
    ] = await Promise.allSettled([
      this.ghlService.getOpportunities(contact.id),
      this.ghlService.getConversations(contact.id),
      this.ghlService.getTags(),
      this.ghlService.getPipelines()
    ]);

    // 7. Behavioral Analysis (NEW)
    const behavioralAnalysis = await this.getBehavioralAnalysis(phoneNumber, conversations.value || []);
    
    // 8. Conversation Intelligence (NEW)
    const conversationIntelligence = await this.getConversationIntelligence(phoneNumber, conversations.value || []);

    // Build comprehensive context object
    const context = {
      // Basic Information
      basic: {
        id: contact.id,
        name: this.getFullName(contact),
        firstName: contact.firstName || 'Unknown',
        lastName: contact.lastName || '',
        email: contact.email || null,
        phone: contact.phone,
        source: contact.source || 'Unknown',
        dateAdded: contact.dateAdded,
        lastActivity: contact.lastActivity
      },

      // Business Context
      business: {
        company: contact.companyName || null,
        jobTitle: contact.jobTitle || null,
        industry: contact.industry || null,
        website: contact.website || null,
        address: this.formatAddress(contact),
        timezone: contact.timezone || null
      },

      // Relationship Context
      relationship: {
        customerType: this.determineCustomerType(contact, opportunities.value || []),
        relationshipStage: this.determineRelationshipStage(contact, opportunities.value || []),
        totalValue: this.calculateTotalValue(opportunities.value || []),
        lastInteraction: this.getLastInteraction(conversations.value || []),
        interactionCount: (conversations.value || []).length,
        preferredChannel: this.determinePreferredChannel(conversations.value || [])
      },

      // Sales Context
      sales: {
        opportunities: this.formatOpportunities(opportunities.value || []),
        activeDeals: this.getActiveDeals(opportunities.value || []),
        closedDeals: this.getClosedDeals(opportunities.value || []),
        totalRevenue: this.calculateRevenue(opportunities.value || []),
        averageDealSize: this.calculateAverageDealSize(opportunities.value || []),
        salesStage: this.getCurrentSalesStage(opportunities.value || [])
      },

      // Behavioral Context (NEW)
      behavioral: behavioralAnalysis,

      // Conversation Intelligence (NEW)
      conversationIntelligence: conversationIntelligence,

      // Behavioral Context
      behavior: {
        tags: this.formatTags(contact.tags || [], tags.value || []),
        customFields: this.formatCustomFields(contact.customFields || {}),
        preferences: this.extractPreferences(contact, conversations.value || []),
        painPoints: this.identifyPainPoints(conversations.value || []),
        interests: this.identifyInterests(conversations.value || []),
        communicationStyle: this.analyzeCommunicationStyle(conversations.value || [])
      },

      // Conversation Context
      conversation: {
        history: this.formatConversationHistory(conversations.value || []),
        recentTopics: this.extractRecentTopics(conversations.value || []),
        commonQuestions: this.identifyCommonQuestions(conversations.value || []),
        sentiment: this.analyzeSentiment(conversations.value || []),
        responsePatterns: this.analyzeResponsePatterns(conversations.value || [])
      },

      // Context Metadata
      meta: {
        contextBuiltAt: new Date().toISOString(),
        dataFreshness: this.calculateDataFreshness(contact),
        completeness: this.calculateContextCompleteness(contact, opportunities.value, conversations.value),
        reliability: this.calculateReliability(contact, conversations.value || []),
        phoneNumber: phoneNumber,
        conversationId: conversationId
      }
    };

    return context;
  }

  /**
   * Helper Methods for Context Building
   */

  getFullName(contact) {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`;
    }
    return contact.firstName || contact.name || contact.lastName || 'Unknown Contact';
  }

  formatAddress(contact) {
    const parts = [
      contact.address1,
      contact.city,
      contact.state,
      contact.postalCode,
      contact.country
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  determineCustomerType(contact, opportunities) {
    if (opportunities.length === 0) return 'prospect';
    
    const closedWon = opportunities.filter(opp => 
      opp.status === 'won' || opp.stage?.toLowerCase().includes('closed won')
    );
    
    if (closedWon.length > 0) {
      return closedWon.length > 1 ? 'repeat_customer' : 'customer';
    }
    
    return opportunities.length > 0 ? 'qualified_lead' : 'prospect';
  }

  determineRelationshipStage(contact, opportunities) {
    const stages = ['new', 'engaged', 'qualified', 'negotiating', 'customer', 'advocate'];
    
    if (opportunities.length === 0) return 'new';
    
    const activeOpps = opportunities.filter(opp => opp.status !== 'lost' && opp.status !== 'won');
    if (activeOpps.length > 0) {
      const stage = activeOpps[0].stage?.toLowerCase() || '';
      if (stage.includes('negotiat') || stage.includes('proposal')) return 'negotiating';
      if (stage.includes('qualif')) return 'qualified';
      return 'engaged';
    }
    
    const wonOpps = opportunities.filter(opp => opp.status === 'won');
    return wonOpps.length > 0 ? 'customer' : 'qualified';
  }

  calculateTotalValue(opportunities) {
    return opportunities.reduce((total, opp) => {
      const value = parseFloat(opp.monetaryValue || opp.value || 0);
      return total + value;
    }, 0);
  }

  getLastInteraction(conversations) {
    if (conversations.length === 0) return null;
    
    const sorted = conversations.sort((a, b) => 
      new Date(b.lastMessageTime || b.updatedAt) - new Date(a.lastMessageTime || a.updatedAt)
    );
    
    return {
      date: sorted[0].lastMessageTime || sorted[0].updatedAt,
      type: sorted[0].type || 'message',
      channel: sorted[0].type || 'whatsapp'
    };
  }

  determinePreferredChannel(conversations) {
    const channels = {};
    conversations.forEach(conv => {
      const channel = conv.type || 'whatsapp';
      channels[channel] = (channels[channel] || 0) + 1;
    });
    
    return Object.keys(channels).reduce((a, b) => 
      channels[a] > channels[b] ? a : b, 'whatsapp'
    );
  }

  formatOpportunities(opportunities) {
    return opportunities.map(opp => ({
      id: opp.id,
      name: opp.name,
      stage: opp.stage,
      status: opp.status,
      value: parseFloat(opp.monetaryValue || opp.value || 0),
      probability: opp.probability || null,
      expectedCloseDate: opp.expectedCloseDate,
      source: opp.source,
      createdAt: opp.dateAdded,
      updatedAt: opp.updatedAt
    }));
  }

  getActiveDeals(opportunities) {
    return opportunities.filter(opp => 
      opp.status !== 'won' && opp.status !== 'lost' && opp.status !== 'abandoned'
    );
  }

  getClosedDeals(opportunities) {
    return opportunities.filter(opp => opp.status === 'won');
  }

  calculateRevenue(opportunities) {
    return this.getClosedDeals(opportunities).reduce((total, opp) => {
      return total + parseFloat(opp.monetaryValue || opp.value || 0);
    }, 0);
  }

  calculateAverageDealSize(opportunities) {
    const closedDeals = this.getClosedDeals(opportunities);
    if (closedDeals.length === 0) return 0;
    
    const totalRevenue = this.calculateRevenue(opportunities);
    return totalRevenue / closedDeals.length;
  }

  getCurrentSalesStage(opportunities) {
    const activeDeals = this.getActiveDeals(opportunities);
    if (activeDeals.length === 0) return null;
    
    // Return the most advanced stage
    const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'closing'];
    let currentStage = 'lead';
    
    activeDeals.forEach(deal => {
      const stage = deal.stage?.toLowerCase() || '';
      stageOrder.forEach((s, index) => {
        if (stage.includes(s) && stageOrder.indexOf(currentStage) < index) {
          currentStage = s;
        }
      });
    });
    
    return currentStage;
  }

  formatTags(contactTags, allTags) {
    const tagMap = new Map(allTags.map(tag => [tag.id, tag.name]));
    
    return (contactTags || []).map(tagId => ({
      id: tagId,
      name: tagMap.get(tagId) || tagId,
      category: this.categorizeTag(tagMap.get(tagId) || tagId)
    }));
  }

  categorizeTag(tagName) {
    const tag = tagName.toLowerCase();
    if (tag.includes('vip') || tag.includes('priority')) return 'priority';
    if (tag.includes('lead') || tag.includes('prospect')) return 'sales';
    if (tag.includes('customer') || tag.includes('client')) return 'relationship';
    if (tag.includes('whatsapp') || tag.includes('sms')) return 'channel';
    if (tag.includes('ai') || tag.includes('bot')) return 'automation';
    return 'general';
  }

  formatCustomFields(customFields) {
    const formatted = {};
    
    if (Array.isArray(customFields)) {
      customFields.forEach(field => {
        if (field.key && field.value) {
          formatted[field.key] = field.value;
        }
      });
    } else if (typeof customFields === 'object') {
      Object.assign(formatted, customFields);
    }
    
    return formatted;
  }

  extractPreferences(contact, conversations) {
    const preferences = {
      communicationTime: this.analyzePreferredTime(conversations),
      responseSpeed: this.analyzeResponseSpeed(conversations),
      messageLength: this.analyzeMessageLength(conversations),
      topics: this.extractPreferredTopics(conversations)
    };
    
    return preferences;
  }

  identifyPainPoints(conversations) {
    const painKeywords = [
      'problem', 'issue', 'trouble', 'difficult', 'frustrated', 'urgent',
      'help', 'stuck', 'broken', 'error', 'wrong', 'not working'
    ];
    
    const painPoints = [];
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          const text = (msg.body || '').toLowerCase();
          painKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
              painPoints.push({
                keyword,
                context: msg.body.substring(0, 100),
                date: msg.timestamp
              });
            }
          });
        });
      }
    });
    
    return painPoints.slice(0, 5); // Top 5 pain points
  }

  identifyInterests(conversations) {
    const interestKeywords = [
      'interested', 'like', 'love', 'want', 'need', 'looking for',
      'prefer', 'excited', 'amazing', 'great', 'perfect'
    ];
    
    const interests = [];
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          const text = (msg.body || '').toLowerCase();
          interestKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
              interests.push({
                keyword,
                context: msg.body.substring(0, 100),
                date: msg.timestamp
              });
            }
          });
        });
      }
    });
    
    return interests.slice(0, 5); // Top 5 interests
  }

  analyzeCommunicationStyle(conversations) {
    let totalMessages = 0;
    let totalLength = 0;
    let questionCount = 0;
    let exclamationCount = 0;
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (msg.from === 'user' || msg.from === 'customer') {
            totalMessages++;
            totalLength += (msg.body || '').length;
            if ((msg.body || '').includes('?')) questionCount++;
            if ((msg.body || '').includes('!')) exclamationCount++;
          }
        });
      }
    });
    
    return {
      averageMessageLength: totalMessages > 0 ? Math.round(totalLength / totalMessages) : 0,
      questionFrequency: totalMessages > 0 ? (questionCount / totalMessages) : 0,
      excitementLevel: totalMessages > 0 ? (exclamationCount / totalMessages) : 0,
      communicationStyle: this.determineCommunicationStyle(totalLength / Math.max(totalMessages, 1))
    };
  }

  determineCommunicationStyle(avgLength) {
    if (avgLength < 20) return 'brief';
    if (avgLength < 50) return 'concise';
    if (avgLength < 100) return 'detailed';
    return 'verbose';
  }

  formatConversationHistory(conversations) {
    return conversations.slice(-5).map(conv => ({
      id: conv.id,
      type: conv.type,
      status: conv.status,
      lastMessage: conv.lastMessage,
      lastMessageTime: conv.lastMessageTime,
      messageCount: conv.messageCount || 0,
      unreadCount: conv.unreadCount || 0
    }));
  }

  extractRecentTopics(conversations) {
    const topics = new Set();
    const recentConversations = conversations.slice(-3);
    
    recentConversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.slice(-5).forEach(msg => {
          const words = (msg.body || '').toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length > 4 && !this.isCommonWord(word)) {
              topics.add(word);
            }
          });
        });
      }
    });
    
    return Array.from(topics).slice(0, 10);
  }

  identifyCommonQuestions(conversations) {
    const questions = [];
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if ((msg.body || '').includes('?') && (msg.from === 'user' || msg.from === 'customer')) {
            questions.push({
              question: msg.body,
              date: msg.timestamp,
              conversationId: conv.id
            });
          }
        });
      }
    });
    
    return questions.slice(-5); // Last 5 questions
  }

  analyzeSentiment(conversations) {
    let positiveCount = 0;
    let negativeCount = 0;
    let totalMessages = 0;
    
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'love', 'like', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed'];
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (msg.from === 'user' || msg.from === 'customer') {
            totalMessages++;
            const text = (msg.body || '').toLowerCase();
            
            positiveWords.forEach(word => {
              if (text.includes(word)) positiveCount++;
            });
            
            negativeWords.forEach(word => {
              if (text.includes(word)) negativeCount++;
            });
          }
        });
      }
    });
    
    return {
      overall: this.calculateOverallSentiment(positiveCount, negativeCount),
      positiveSignals: positiveCount,
      negativeSignals: negativeCount,
      neutralMessages: totalMessages - positiveCount - negativeCount
    };
  }

  calculateOverallSentiment(positive, negative) {
    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  analyzeResponsePatterns(conversations) {
    let quickResponses = 0;
    let slowResponses = 0;
    let totalResponses = 0;
    
    conversations.forEach(conv => {
      if (conv.messages && conv.messages.length > 1) {
        for (let i = 1; i < conv.messages.length; i++) {
          const current = conv.messages[i];
          const previous = conv.messages[i - 1];
          
          if ((current.from === 'user' || current.from === 'customer') && 
              (previous.from === 'ai' || previous.from === 'assistant')) {
            
            const responseTime = new Date(current.timestamp) - new Date(previous.timestamp);
            totalResponses++;
            
            if (responseTime < 5 * 60 * 1000) { // 5 minutes
              quickResponses++;
            } else {
              slowResponses++;
            }
          }
        }
      }
    });
    
    return {
      averageResponseTime: this.calculateAverageResponseTime(conversations),
      quickResponseRate: totalResponses > 0 ? (quickResponses / totalResponses) : 0,
      engagementLevel: this.calculateEngagementLevel(quickResponses, totalResponses)
    };
  }

  calculateAverageResponseTime(conversations) {
    // Simplified calculation - in production, you'd want more sophisticated timing analysis
    return 'moderate'; // Could be 'quick', 'moderate', 'slow'
  }

  calculateEngagementLevel(quickResponses, totalResponses) {
    if (totalResponses === 0) return 'unknown';
    const rate = quickResponses / totalResponses;
    if (rate > 0.7) return 'high';
    if (rate > 0.3) return 'medium';
    return 'low';
  }

  calculateDataFreshness(contact) {
    const lastActivity = new Date(contact.lastActivity || contact.updatedAt || contact.dateAdded);
    const now = new Date();
    const daysSinceActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);
    
    if (daysSinceActivity < 1) return 'very_fresh';
    if (daysSinceActivity < 7) return 'fresh';
    if (daysSinceActivity < 30) return 'moderate';
    return 'stale';
  }

  calculateContextCompleteness(contact, opportunities, conversations) {
    let score = 0;
    let maxScore = 10;
    
    // Basic info completeness
    if (contact.firstName) score += 1;
    if (contact.email) score += 1;
    if (contact.companyName) score += 1;
    
    // Business context
    if (opportunities && opportunities.length > 0) score += 2;
    if (contact.tags && contact.tags.length > 0) score += 1;
    if (contact.customFields && Object.keys(contact.customFields).length > 0) score += 1;
    
    // Interaction history
    if (conversations && conversations.length > 0) score += 2;
    if (contact.lastActivity) score += 1;
    
    return Math.round((score / maxScore) * 100);
  }

  calculateReliability(contact, conversations) {
    let reliabilityScore = 0.5; // Base reliability
    
    // More conversations = more reliable data
    if (conversations.length > 5) reliabilityScore += 0.2;
    if (conversations.length > 10) reliabilityScore += 0.1;
    
    // Recent activity = more reliable
    const lastActivity = new Date(contact.lastActivity || contact.dateAdded);
    const daysSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity < 7) reliabilityScore += 0.2;
    
    return Math.min(reliabilityScore, 1.0);
  }

  /**
   * Utility Methods
   */

  isCommonWord(word) {
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'she', 'use', 'her', 'many', 'oil', 'sit', 'word', 'but', 'not', 'what', 'all', 'were', 'they', 'we', 'when', 'your', 'can', 'said', 'there', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'has', 'two', 'more', 'very', 'what', 'know', 'just', 'first', 'get', 'over', 'think', 'also', 'your', 'work', 'life', 'only', 'can', 'still', 'should', 'after', 'being', 'now', 'made', 'before', 'here', 'through', 'when', 'where', 'much', 'go', 'me', 'back', 'with', 'well', 'were'];
    return commonWords.includes(word.toLowerCase());
  }

  analyzePreferredTime(conversations) {
    const hours = [];
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (msg.from === 'user' || msg.from === 'customer') {
            const hour = new Date(msg.timestamp).getHours();
            hours.push(hour);
          }
        });
      }
    });
    
    if (hours.length === 0) return 'unknown';
    
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
    if (avgHour < 12) return 'morning';
    if (avgHour < 17) return 'afternoon';
    return 'evening';
  }

  analyzeResponseSpeed(conversations) {
    // Simplified - in production you'd analyze actual response times
    return 'moderate';
  }

  analyzeMessageLength(conversations) {
    let totalLength = 0;
    let messageCount = 0;
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (msg.from === 'user' || msg.from === 'customer') {
            totalLength += (msg.body || '').length;
            messageCount++;
          }
        });
      }
    });
    
    const avgLength = messageCount > 0 ? totalLength / messageCount : 0;
    if (avgLength < 20) return 'short';
    if (avgLength < 100) return 'medium';
    return 'long';
  }

  extractPreferredTopics(conversations) {
    // Simplified topic extraction - in production you'd use NLP
    const topics = [];
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.slice(-3).forEach(msg => {
          if (msg.from === 'user' || msg.from === 'customer') {
            const words = (msg.body || '').toLowerCase().split(/\s+/);
            words.forEach(word => {
              if (word.length > 5 && !this.isCommonWord(word)) {
                topics.push(word);
              }
            });
          }
        });
      }
    });
    
    return [...new Set(topics)].slice(0, 5);
  }

  /**
   * Get behavioral analysis from conversation analytics
   * @param {string} phoneNumber - User's phone number
   * @param {Array} conversations - Conversation history
   * @returns {Object} Behavioral analysis
   */
  async getBehavioralAnalysis(phoneNumber, conversations) {
    try {
      console.log(`🧠 Analyzing behavioral patterns for ${phoneNumber}`);
      
      const analysis = await this.conversationAnalytics.analyzeConversationBehavior(phoneNumber, conversations);
      
      return {
        communicationStyle: analysis.communicationPatterns?.communicationStyle || 'unknown',
        engagementLevel: analysis.engagementMetrics?.engagementLevel || 0,
        responsiveness: analysis.responseBehavior?.responsiveness || 0,
        interactionStyle: analysis.responseBehavior?.interactionStyle || 'unknown',
        preferredTopics: analysis.topicPreferences?.preferredTopics || [],
        sentimentTrend: analysis.sentimentEvolution?.recentTrend || 0,
        activityPattern: analysis.interactionTiming?.activityPattern || 'unknown',
        supportLevel: analysis.supportNeeds?.supportLevel || 'low',
        satisfactionScore: analysis.supportNeeds?.satisfactionScore || 0.5,
        behavioralInsights: analysis.behavioralInsights || [],
        predictiveIndicators: analysis.predictiveIndicators || {}
      };
      
    } catch (error) {
      console.error('❌ Error getting behavioral analysis:', error);
      return {
        communicationStyle: 'unknown',
        engagementLevel: 0,
        responsiveness: 0,
        interactionStyle: 'unknown',
        preferredTopics: [],
        sentimentTrend: 0,
        activityPattern: 'unknown',
        supportLevel: 'low',
        satisfactionScore: 0.5,
        behavioralInsights: [],
        predictiveIndicators: {}
      };
    }
  }

  /**
   * Get conversation intelligence insights
   * @param {string} phoneNumber - User's phone number
   * @param {Array} conversations - Conversation history
   * @returns {Object} Conversation intelligence
   */
  async getConversationIntelligence(phoneNumber, conversations) {
    try {
      console.log(`🔍 Generating conversation intelligence for ${phoneNumber}`);
      
      const analysis = await this.conversationAnalytics.analyzeConversationBehavior(phoneNumber, conversations);
      
      // Extract key intelligence insights
      const intelligence = {
        // Communication Intelligence
        communication: {
          averageMessageLength: analysis.communicationPatterns?.averageMessageLength || 0,
          questionFrequency: analysis.communicationPatterns?.questionFrequency || 0,
          expressiveness: analysis.communicationPatterns?.expressiveness || 0,
          preferredResponseTime: analysis.communicationPatterns?.averageResponseDelay || 0
        },
        
        // Engagement Intelligence
        engagement: {
          totalSessions: analysis.engagementMetrics?.totalSessions || 0,
          messagesPerSession: analysis.engagementMetrics?.messagesPerSession || 0,
          initiationRate: analysis.engagementMetrics?.initiationRate || 0,
          completionRate: analysis.engagementMetrics?.completionRate || 0
        },
        
        // Topic Intelligence
        topics: {
          topTopics: analysis.topicPreferences?.topTopics || [],
          topicDiversity: analysis.topicPreferences?.topicDiversity || 0,
          preferredTopics: analysis.topicPreferences?.preferredTopics || [],
          avoidedTopics: analysis.topicPreferences?.avoidedTopics || []
        },
        
        // Sentiment Intelligence
        sentiment: {
          overallSentiment: analysis.sentimentEvolution?.overallSentiment || 0,
          recentSentiment: analysis.sentimentEvolution?.recentSentiment || 0,
          sentimentStability: analysis.sentimentEvolution?.sentimentStability || 0,
          moodPattern: analysis.sentimentEvolution?.moodPattern || 'unknown'
        },
        
        // Timing Intelligence
        timing: {
          preferredHours: analysis.interactionTiming?.preferredHours || [],
          preferredDays: analysis.interactionTiming?.preferredDays || [],
          consistency: analysis.interactionTiming?.consistency || 0,
          activityPattern: analysis.interactionTiming?.activityPattern || 'unknown'
        },
        
        // Question Intelligence
        questions: {
          totalQuestions: analysis.questionPatterns?.totalQuestions || 0,
          questionTypes: analysis.questionPatterns?.questionTypes || {},
          averageComplexity: analysis.questionPatterns?.averageComplexity || 0,
          commonQuestions: analysis.questionPatterns?.commonQuestions || []
        },
        
        // Support Intelligence
        support: {
          supportLevel: analysis.supportNeeds?.supportLevel || 'low',
          supportIndicators: analysis.supportNeeds?.supportIndicators || {},
          commonSupportTopics: analysis.supportNeeds?.commonSupportTopics || [],
          satisfactionScore: analysis.supportNeeds?.satisfactionScore || 0.5,
          supportTrend: analysis.supportNeeds?.supportTrend || 'stable'
        },
        
        // Predictive Intelligence
        predictions: {
          churnRisk: analysis.predictiveIndicators?.churnRisk || 0.5,
          upsellPotential: analysis.predictiveIndicators?.upsellPotential || 0.5,
          supportRisk: analysis.predictiveIndicators?.supportRisk || 0.5,
          engagementTrend: analysis.predictiveIndicators?.engagementTrend || 'stable',
          satisfactionTrend: analysis.predictiveIndicators?.satisfactionTrend || 'stable'
        },
        
        // Behavioral Insights
        insights: analysis.behavioralInsights || [],
        
        // Conversation Summary
        summary: this.generateConversationSummary(analysis)
      };
      
      return intelligence;
      
    } catch (error) {
      console.error('❌ Error generating conversation intelligence:', error);
      return {
        communication: {},
        engagement: {},
        topics: {},
        sentiment: {},
        timing: {},
        questions: {},
        support: {},
        predictions: {},
        insights: [],
        summary: 'No conversation intelligence available'
      };
    }
  }

  /**
   * Generate conversation summary from analysis
   * @param {Object} analysis - Behavioral analysis results
   * @returns {string} Conversation summary
   */
  generateConversationSummary(analysis) {
    try {
      const parts = [];
      
      // Communication style
      if (analysis.communicationPatterns?.communicationStyle) {
        parts.push(`Communication style: ${analysis.communicationPatterns.communicationStyle}`);
      }
      
      // Engagement level
      if (analysis.engagementMetrics?.engagementLevel > 0.7) {
        parts.push('Highly engaged user');
      } else if (analysis.engagementMetrics?.engagementLevel > 0.4) {
        parts.push('Moderately engaged user');
      } else {
        parts.push('Low engagement user');
      }
      
      // Sentiment
      if (analysis.sentimentEvolution?.overallSentiment > 0.3) {
        parts.push('Generally positive sentiment');
      } else if (analysis.sentimentEvolution?.overallSentiment < -0.3) {
        parts.push('Generally negative sentiment');
      } else {
        parts.push('Neutral sentiment');
      }
      
      // Support needs
      if (analysis.supportNeeds?.supportLevel === 'high') {
        parts.push('High support needs');
      } else if (analysis.supportNeeds?.supportLevel === 'medium') {
        parts.push('Moderate support needs');
      }
      
      // Responsiveness
      if (analysis.responseBehavior?.responsiveness > 0.7) {
        parts.push('Quick responder');
      } else if (analysis.responseBehavior?.responsiveness < 0.3) {
        parts.push('Slow responder');
      }
      
      // Predictive insights
      if (analysis.predictiveIndicators?.churnRisk > 0.7) {
        parts.push('High churn risk');
      }
      
      if (analysis.predictiveIndicators?.upsellPotential > 0.7) {
        parts.push('High upsell potential');
      }
      
      return parts.length > 0 ? parts.join(', ') : 'Standard user profile';
      
    } catch (error) {
      console.error('❌ Error generating conversation summary:', error);
      return 'Unable to generate conversation summary';
    }
  }

  getFromCache(key) {
    const cached = this.userContextCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.userContextCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  setCache(key, data) {
    // Implement LRU cache behavior
    if (this.userContextCache.size >= this.maxCacheSize) {
      const firstKey = this.userContextCache.keys().next().value;
      this.userContextCache.delete(firstKey);
    }
    
    this.userContextCache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL
    });
  }

  /**
   * Minimal context fallback
   */
  getMinimalContext(phoneNumber) {
    return {
      basic: {
        name: 'Unknown Contact',
        phone: phoneNumber,
        source: 'WhatsApp'
      },
      business: {},
      relationship: {
        customerType: 'prospect',
        relationshipStage: 'new'
      },
      sales: {
        opportunities: [],
        totalRevenue: 0
      },
      behavior: {
        tags: [],
        customFields: {},
        preferences: {}
      },
      conversation: {
        history: [],
        recentTopics: []
      },
      meta: {
        contextBuiltAt: new Date().toISOString(),
        completeness: 10,
        reliability: 0.1,
        phoneNumber: phoneNumber
      }
    };
  }

  /**
   * Clear cache for specific user or all users
   */
  clearCache(phoneNumber = null) {
    if (phoneNumber) {
      const cacheKey = `context:${phoneNumber}`;
      this.userContextCache.delete(cacheKey);
      console.log(`🗑️ Cleared cache for ${phoneNumber}`);
    } else {
      this.userContextCache.clear();
      console.log('🗑️ Cleared all user context cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.userContextCache.size,
      maxSize: this.maxCacheSize,
      ttl: this.cacheTTL,
      hitRate: this.cacheHits / Math.max(this.cacheRequests, 1)
    };
  }
}

module.exports = UserContextService;