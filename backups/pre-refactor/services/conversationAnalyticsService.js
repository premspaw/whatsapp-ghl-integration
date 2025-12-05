const EventEmitter = require('events');

/**
 * Conversation Analytics Service
 * 
 * Analyzes conversation history and user behavior patterns to enhance
 * AI responses with behavioral insights and conversation intelligence.
 */
class ConversationAnalyticsService extends EventEmitter {
  constructor(ghlService) {
    super();
    this.ghlService = ghlService;
    this.analyticsCache = new Map();
    this.cacheTTL = 30 * 60 * 1000; // 30 minutes cache
    this.maxCacheSize = 500;
  }

  /**
   * Analyze conversation history for behavioral patterns
   * @param {string} phoneNumber - User's phone number
   * @param {Array} conversations - Conversation history from GHL
   * @returns {Object} Behavioral analysis results
   */
  async analyzeConversationBehavior(phoneNumber, conversations = []) {
    try {
      console.log(`📊 Analyzing conversation behavior for ${phoneNumber}`);

      // Check cache first
      const cacheKey = `behavior:${phoneNumber}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Perform comprehensive behavioral analysis
      const analysis = {
        // Communication Patterns
        communicationPatterns: this.analyzeCommunicationPatterns(conversations),
        
        // Engagement Metrics
        engagementMetrics: this.calculateEngagementMetrics(conversations),
        
        // Response Behavior
        responseBehavior: this.analyzeResponseBehavior(conversations),
        
        // Topic Preferences
        topicPreferences: this.analyzeTopicPreferences(conversations),
        
        // Sentiment Evolution
        sentimentEvolution: this.analyzeSentimentEvolution(conversations),
        
        // Interaction Timing
        interactionTiming: this.analyzeInteractionTiming(conversations),
        
        // Question Patterns
        questionPatterns: this.analyzeQuestionPatterns(conversations),
        
        // Support Needs
        supportNeeds: this.analyzeSupportNeeds(conversations),
        
        // Behavioral Insights
        behavioralInsights: this.generateBehavioralInsights(conversations),
        
        // Predictive Indicators
        predictiveIndicators: this.generatePredictiveIndicators(conversations)
      };

      // Cache the analysis
      this.setCache(cacheKey, analysis);
      
      console.log('✅ Conversation behavior analysis completed');
      return analysis;

    } catch (error) {
      console.error('❌ Error analyzing conversation behavior:', error);
      return this.getMinimalAnalysis();
    }
  }

  /**
   * Analyze communication patterns
   */
  analyzeCommunicationPatterns(conversations) {
    let totalMessages = 0;
    let totalLength = 0;
    let questionCount = 0;
    let exclamationCount = 0;
    let capsCount = 0;
    let emojiCount = 0;
    let responseDelays = [];
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach((msg, index) => {
          if (this.isUserMessage(msg)) {
            totalMessages++;
            const text = msg.body || '';
            totalLength += text.length;
            
            // Count patterns
            if (text.includes('?')) questionCount++;
            if (text.includes('!')) exclamationCount++;
            if (text === text.toUpperCase() && text.length > 3) capsCount++;
            if (this.containsEmoji(text)) emojiCount++;
            
            // Calculate response delay if previous message was from AI
            if (index > 0 && this.isAIMessage(conv.messages[index - 1])) {
              const delay = new Date(msg.timestamp) - new Date(conv.messages[index - 1].timestamp);
              responseDelays.push(delay);
            }
          }
        });
      }
    });

    return {
      averageMessageLength: totalMessages > 0 ? Math.round(totalLength / totalMessages) : 0,
      questionFrequency: totalMessages > 0 ? (questionCount / totalMessages) : 0,
      excitementLevel: totalMessages > 0 ? (exclamationCount / totalMessages) : 0,
      capsUsage: totalMessages > 0 ? (capsCount / totalMessages) : 0,
      emojiUsage: totalMessages > 0 ? (emojiCount / totalMessages) : 0,
      averageResponseDelay: responseDelays.length > 0 ? 
        responseDelays.reduce((a, b) => a + b, 0) / responseDelays.length : 0,
      communicationStyle: this.determineCommunicationStyle(totalLength / Math.max(totalMessages, 1)),
      expressiveness: this.calculateExpressiveness(exclamationCount, emojiCount, totalMessages)
    };
  }

  /**
   * Calculate engagement metrics
   */
  calculateEngagementMetrics(conversations) {
    let totalSessions = conversations.length;
    let totalMessages = 0;
    let initiatedSessions = 0;
    let completedSessions = 0;
    let averageSessionLength = 0;
    
    conversations.forEach(conv => {
      if (conv.messages && conv.messages.length > 0) {
        totalMessages += conv.messages.length;
        
        // Check if user initiated the conversation
        if (this.isUserMessage(conv.messages[0])) {
          initiatedSessions++;
        }
        
        // Check if conversation was completed (ended with AI response)
        const lastMessage = conv.messages[conv.messages.length - 1];
        if (this.isAIMessage(lastMessage)) {
          completedSessions++;
        }
        
        // Calculate session duration
        if (conv.messages.length > 1) {
          const start = new Date(conv.messages[0].timestamp);
          const end = new Date(conv.messages[conv.messages.length - 1].timestamp);
          averageSessionLength += (end - start);
        }
      }
    });

    return {
      totalSessions,
      totalMessages,
      messagesPerSession: totalSessions > 0 ? (totalMessages / totalSessions) : 0,
      initiationRate: totalSessions > 0 ? (initiatedSessions / totalSessions) : 0,
      completionRate: totalSessions > 0 ? (completedSessions / totalSessions) : 0,
      averageSessionDuration: totalSessions > 0 ? (averageSessionLength / totalSessions) : 0,
      engagementLevel: this.calculateEngagementLevel(totalMessages, totalSessions, averageSessionLength)
    };
  }

  /**
   * Analyze response behavior
   */
  analyzeResponseBehavior(conversations) {
    let quickResponses = 0;
    let slowResponses = 0;
    let totalResponses = 0;
    let responseTimes = [];
    let followUpQuestions = 0;
    let acknowledgments = 0;
    
    conversations.forEach(conv => {
      if (conv.messages) {
        for (let i = 1; i < conv.messages.length; i++) {
          const current = conv.messages[i];
          const previous = conv.messages[i - 1];
          
          if (this.isUserMessage(current) && this.isAIMessage(previous)) {
            totalResponses++;
            const responseTime = new Date(current.timestamp) - new Date(previous.timestamp);
            responseTimes.push(responseTime);
            
            if (responseTime < 5 * 60 * 1000) { // 5 minutes
              quickResponses++;
            } else {
              slowResponses++;
            }
            
            // Check for follow-up questions
            if ((current.body || '').includes('?')) {
              followUpQuestions++;
            }
            
            // Check for acknowledgments
            if (this.isAcknowledgment(current.body || '')) {
              acknowledgments++;
            }
          }
        }
      }
    });

    return {
      quickResponseRate: totalResponses > 0 ? (quickResponses / totalResponses) : 0,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      followUpRate: totalResponses > 0 ? (followUpQuestions / totalResponses) : 0,
      acknowledgmentRate: totalResponses > 0 ? (acknowledgments / totalResponses) : 0,
      responsiveness: this.calculateResponsiveness(quickResponses, totalResponses),
      interactionStyle: this.determineInteractionStyle(followUpQuestions, acknowledgments, totalResponses)
    };
  }

  /**
   * Analyze topic preferences
   */
  analyzeTopicPreferences(conversations) {
    const topicCounts = new Map();
    const topicSentiments = new Map();
    const topicEngagement = new Map();
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (this.isUserMessage(msg)) {
            const topics = this.extractTopics(msg.body || '');
            const sentiment = this.analyzeSentiment(msg.body || '');
            const engagement = this.calculateMessageEngagement(msg);
            
            topics.forEach(topic => {
              topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
              
              if (!topicSentiments.has(topic)) {
                topicSentiments.set(topic, []);
              }
              topicSentiments.get(topic).push(sentiment);
              
              if (!topicEngagement.has(topic)) {
                topicEngagement.set(topic, []);
              }
              topicEngagement.get(topic).push(engagement);
            });
          }
        });
      }
    });

    // Process topic data
    const processedTopics = Array.from(topicCounts.entries()).map(([topic, count]) => {
      const sentiments = topicSentiments.get(topic) || [];
      const engagements = topicEngagement.get(topic) || [];
      
      return {
        topic,
        frequency: count,
        averageSentiment: sentiments.length > 0 ? 
          sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0,
        averageEngagement: engagements.length > 0 ? 
          engagements.reduce((a, b) => a + b, 0) / engagements.length : 0,
        preference: this.calculateTopicPreference(count, sentiments, engagements)
      };
    }).sort((a, b) => b.preference - a.preference);

    return {
      topTopics: processedTopics.slice(0, 10),
      topicDiversity: topicCounts.size,
      preferredTopics: processedTopics.filter(t => t.preference > 0.7).slice(0, 5),
      avoidedTopics: processedTopics.filter(t => t.preference < 0.3).slice(0, 3)
    };
  }

  /**
   * Analyze sentiment evolution over time
   */
  analyzeSentimentEvolution(conversations) {
    const sentimentHistory = [];
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (this.isUserMessage(msg)) {
            const sentiment = this.analyzeSentiment(msg.body || '');
            sentimentHistory.push({
              timestamp: new Date(msg.timestamp),
              sentiment: sentiment,
              message: msg.body
            });
          }
        });
      }
    });

    // Sort by timestamp
    sentimentHistory.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate trends
    const recentSentiments = sentimentHistory.slice(-10);
    const overallTrend = this.calculateSentimentTrend(sentimentHistory);
    const recentTrend = this.calculateSentimentTrend(recentSentiments);

    return {
      overallSentiment: sentimentHistory.length > 0 ? 
        sentimentHistory.reduce((sum, s) => sum + s.sentiment, 0) / sentimentHistory.length : 0,
      recentSentiment: recentSentiments.length > 0 ? 
        recentSentiments.reduce((sum, s) => sum + s.sentiment, 0) / recentSentiments.length : 0,
      overallTrend: overallTrend,
      recentTrend: recentTrend,
      sentimentStability: this.calculateSentimentStability(sentimentHistory),
      moodPattern: this.identifyMoodPattern(sentimentHistory)
    };
  }

  /**
   * Analyze interaction timing patterns
   */
  analyzeInteractionTiming(conversations) {
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    const sessionGaps = [];
    
    let lastInteraction = null;
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (this.isUserMessage(msg)) {
            const date = new Date(msg.timestamp);
            const hour = date.getHours();
            const day = date.getDay();
            
            hourCounts[hour]++;
            dayCounts[day]++;
            
            if (lastInteraction) {
              const gap = date - lastInteraction;
              sessionGaps.push(gap);
            }
            lastInteraction = date;
          }
        });
      }
    });

    return {
      preferredHours: this.getTopHours(hourCounts),
      preferredDays: this.getTopDays(dayCounts),
      averageSessionGap: sessionGaps.length > 0 ? 
        sessionGaps.reduce((a, b) => a + b, 0) / sessionGaps.length : 0,
      activityPattern: this.determineActivityPattern(hourCounts, dayCounts),
      consistency: this.calculateTimingConsistency(sessionGaps)
    };
  }

  /**
   * Analyze question patterns
   */
  analyzeQuestionPatterns(conversations) {
    const questions = [];
    const questionTypes = new Map();
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (this.isUserMessage(msg) && (msg.body || '').includes('?')) {
            const question = msg.body;
            questions.push({
              question: question,
              timestamp: new Date(msg.timestamp),
              type: this.categorizeQuestion(question),
              complexity: this.calculateQuestionComplexity(question)
            });
            
            const type = this.categorizeQuestion(question);
            questionTypes.set(type, (questionTypes.get(type) || 0) + 1);
          }
        });
      }
    });

    return {
      totalQuestions: questions.length,
      questionTypes: Object.fromEntries(questionTypes),
      averageComplexity: questions.length > 0 ? 
        questions.reduce((sum, q) => sum + q.complexity, 0) / questions.length : 0,
      commonQuestions: this.identifyCommonQuestions(questions),
      questionEvolution: this.analyzeQuestionEvolution(questions)
    };
  }

  /**
   * Analyze support needs
   */
  analyzeSupportNeeds(conversations) {
    const supportIndicators = {
      helpRequests: 0,
      problemReports: 0,
      urgentRequests: 0,
      escalationRequests: 0,
      satisfactionIndicators: 0,
      dissatisfactionIndicators: 0
    };

    const supportTopics = new Map();
    
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (this.isUserMessage(msg)) {
            const text = (msg.body || '').toLowerCase();
            
            // Analyze support indicators
            if (this.containsHelpRequest(text)) supportIndicators.helpRequests++;
            if (this.containsProblemReport(text)) supportIndicators.problemReports++;
            if (this.containsUrgentRequest(text)) supportIndicators.urgentRequests++;
            if (this.containsEscalationRequest(text)) supportIndicators.escalationRequests++;
            if (this.containsSatisfactionIndicator(text)) supportIndicators.satisfactionIndicators++;
            if (this.containsDissatisfactionIndicator(text)) supportIndicators.dissatisfactionIndicators++;
            
            // Extract support topics
            const topics = this.extractSupportTopics(text);
            topics.forEach(topic => {
              supportTopics.set(topic, (supportTopics.get(topic) || 0) + 1);
            });
          }
        });
      }
    });

    return {
      supportLevel: this.calculateSupportLevel(supportIndicators),
      supportIndicators: supportIndicators,
      commonSupportTopics: Array.from(supportTopics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      satisfactionScore: this.calculateSatisfactionScore(supportIndicators),
      supportTrend: this.calculateSupportTrend(conversations)
    };
  }

  /**
   * Generate behavioral insights
   */
  generateBehavioralInsights(conversations) {
    const insights = [];
    
    // Analyze overall behavior
    const totalMessages = conversations.reduce((sum, conv) => 
      sum + (conv.messages ? conv.messages.filter(m => this.isUserMessage(m)).length : 0), 0);
    
    if (totalMessages > 50) {
      insights.push({
        type: 'engagement',
        insight: 'Highly engaged user with extensive conversation history',
        confidence: 0.9
      });
    }
    
    // Add more behavioral insights based on patterns
    const communicationPatterns = this.analyzeCommunicationPatterns(conversations);
    
    if (communicationPatterns.questionFrequency > 0.5) {
      insights.push({
        type: 'communication_style',
        insight: 'Inquisitive user who asks many questions',
        confidence: 0.8
      });
    }
    
    if (communicationPatterns.averageResponseDelay < 5 * 60 * 1000) {
      insights.push({
        type: 'responsiveness',
        insight: 'Quick responder who engages actively in conversations',
        confidence: 0.85
      });
    }

    return insights;
  }

  /**
   * Generate predictive indicators
   */
  generatePredictiveIndicators(conversations) {
    const indicators = {
      churnRisk: this.calculateChurnRisk(conversations),
      upsellPotential: this.calculateUpsellPotential(conversations),
      supportRisk: this.calculateSupportRisk(conversations),
      engagementTrend: this.calculateEngagementTrend(conversations),
      satisfactionTrend: this.calculateSatisfactionTrend(conversations)
    };

    return indicators;
  }

  /**
   * Helper Methods
   */

  isUserMessage(message) {
    return message.from === 'user' || message.from === 'customer' || 
           message.direction === 'inbound' || message.type === 'inbound';
  }

  isAIMessage(message) {
    return message.from === 'ai' || message.from === 'assistant' || 
           message.direction === 'outbound' || message.type === 'outbound';
  }

  containsEmoji(text) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u;
    return emojiRegex.test(text);
  }

  determineCommunicationStyle(avgLength) {
    if (avgLength < 20) return 'brief';
    if (avgLength < 50) return 'concise';
    if (avgLength < 100) return 'detailed';
    return 'verbose';
  }

  calculateExpressiveness(exclamations, emojis, totalMessages) {
    if (totalMessages === 0) return 0;
    const expressiveElements = exclamations + emojis;
    return expressiveElements / totalMessages;
  }

  calculateEngagementLevel(totalMessages, totalSessions, averageSessionLength) {
    if (totalSessions === 0) return 0;
    
    const messagesPerSession = totalMessages / totalSessions;
    const sessionLengthScore = Math.min(averageSessionLength / (30 * 60 * 1000), 1); // Normalize to 30 minutes
    
    return (messagesPerSession * 0.6 + sessionLengthScore * 0.4) / 10; // Normalize to 0-1
  }

  isAcknowledgment(text) {
    const acknowledgments = ['ok', 'okay', 'thanks', 'thank you', 'got it', 'understood', 'yes', 'yeah'];
    return acknowledgments.some(ack => text.toLowerCase().includes(ack));
  }

  calculateResponsiveness(quickResponses, totalResponses) {
    return totalResponses > 0 ? quickResponses / totalResponses : 0;
  }

  determineInteractionStyle(followUps, acknowledgments, totalResponses) {
    if (totalResponses === 0) return 'unknown';
    
    const followUpRate = followUps / totalResponses;
    const ackRate = acknowledgments / totalResponses;
    
    if (followUpRate > 0.3) return 'inquisitive';
    if (ackRate > 0.3) return 'responsive';
    return 'balanced';
  }

  extractTopics(text) {
    // Simplified topic extraction - in production, use NLP
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 4 && !this.isCommonWord(word));
  }

  isCommonWord(word) {
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'she', 'use'];
    return commonWords.includes(word.toLowerCase());
  }

  analyzeSentiment(text) {
    // Simplified sentiment analysis - in production, use proper NLP
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'love', 'like', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 1;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / 5)); // Normalize to -1 to 1
  }

  calculateMessageEngagement(message) {
    const text = message.body || '';
    let engagement = 0;
    
    // Length indicates engagement
    engagement += Math.min(text.length / 100, 1);
    
    // Questions indicate engagement
    if (text.includes('?')) engagement += 0.5;
    
    // Exclamations indicate engagement
    if (text.includes('!')) engagement += 0.3;
    
    return Math.min(engagement, 1);
  }

  calculateTopicPreference(frequency, sentiments, engagements) {
    const avgSentiment = sentiments.length > 0 ? 
      sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0;
    const avgEngagement = engagements.length > 0 ? 
      engagements.reduce((a, b) => a + b, 0) / engagements.length : 0;
    
    // Combine frequency, sentiment, and engagement
    return (frequency * 0.4 + (avgSentiment + 1) * 0.3 + avgEngagement * 0.3) / 3;
  }

  calculateSentimentTrend(sentimentHistory) {
    if (sentimentHistory.length < 2) return 0;
    
    const first = sentimentHistory.slice(0, Math.ceil(sentimentHistory.length / 2));
    const second = sentimentHistory.slice(Math.floor(sentimentHistory.length / 2));
    
    const firstAvg = first.reduce((sum, s) => sum + s.sentiment, 0) / first.length;
    const secondAvg = second.reduce((sum, s) => sum + s.sentiment, 0) / second.length;
    
    return secondAvg - firstAvg;
  }

  calculateSentimentStability(sentimentHistory) {
    if (sentimentHistory.length < 2) return 1;
    
    const sentiments = sentimentHistory.map(s => s.sentiment);
    const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / sentiments.length;
    
    return 1 / (1 + variance); // Higher stability = lower variance
  }

  identifyMoodPattern(sentimentHistory) {
    // Simplified mood pattern identification
    if (sentimentHistory.length < 3) return 'insufficient_data';
    
    const recentSentiments = sentimentHistory.slice(-5).map(s => s.sentiment);
    const trend = this.calculateSentimentTrend(sentimentHistory);
    
    if (trend > 0.2) return 'improving';
    if (trend < -0.2) return 'declining';
    if (recentSentiments.every(s => s > 0.3)) return 'consistently_positive';
    if (recentSentiments.every(s => s < -0.3)) return 'consistently_negative';
    return 'stable';
  }

  getTopHours(hourCounts) {
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);
  }

  getTopDays(dayCounts) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayCounts
      .map((count, day) => ({ day: dayNames[day], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(d => d.day);
  }

  determineActivityPattern(hourCounts, dayCounts) {
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayCounts.indexOf(Math.max(...dayCounts));
    
    let pattern = '';
    
    if (peakHour >= 9 && peakHour <= 17) {
      pattern += 'business_hours';
    } else if (peakHour >= 18 && peakHour <= 22) {
      pattern += 'evening';
    } else {
      pattern += 'off_hours';
    }
    
    if (peakDay >= 1 && peakDay <= 5) {
      pattern += '_weekday';
    } else {
      pattern += '_weekend';
    }
    
    return pattern;
  }

  calculateTimingConsistency(sessionGaps) {
    if (sessionGaps.length < 2) return 0;
    
    const mean = sessionGaps.reduce((a, b) => a + b, 0) / sessionGaps.length;
    const variance = sessionGaps.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / sessionGaps.length;
    const stdDev = Math.sqrt(variance);
    
    return 1 / (1 + (stdDev / mean)); // Higher consistency = lower coefficient of variation
  }

  categorizeQuestion(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('how')) return 'how_to';
    if (lowerQuestion.includes('what')) return 'what_is';
    if (lowerQuestion.includes('when')) return 'when';
    if (lowerQuestion.includes('where')) return 'where';
    if (lowerQuestion.includes('why')) return 'why';
    if (lowerQuestion.includes('who')) return 'who';
    if (lowerQuestion.includes('can') || lowerQuestion.includes('could')) return 'capability';
    if (lowerQuestion.includes('price') || lowerQuestion.includes('cost')) return 'pricing';
    
    return 'general';
  }

  calculateQuestionComplexity(question) {
    let complexity = 0;
    
    // Length indicates complexity
    complexity += Math.min(question.length / 100, 1);
    
    // Multiple question words indicate complexity
    const questionWords = ['what', 'how', 'when', 'where', 'why', 'who'];
    const questionWordCount = questionWords.filter(word => 
      question.toLowerCase().includes(word)).length;
    complexity += questionWordCount * 0.2;
    
    // Technical terms indicate complexity
    const technicalTerms = ['api', 'integration', 'configuration', 'setup', 'technical'];
    const technicalCount = technicalTerms.filter(term => 
      question.toLowerCase().includes(term)).length;
    complexity += technicalCount * 0.3;
    
    return Math.min(complexity, 1);
  }

  identifyCommonQuestions(questions) {
    // Group similar questions (simplified)
    const questionGroups = new Map();
    
    questions.forEach(q => {
      const key = q.type + '_' + Math.floor(q.complexity * 10);
      if (!questionGroups.has(key)) {
        questionGroups.set(key, []);
      }
      questionGroups.get(key).push(q);
    });
    
    return Array.from(questionGroups.entries())
      .filter(([key, group]) => group.length > 1)
      .map(([key, group]) => ({
        type: group[0].type,
        complexity: group[0].complexity,
        frequency: group.length,
        examples: group.slice(0, 3).map(q => q.question)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  analyzeQuestionEvolution(questions) {
    if (questions.length < 2) return 'insufficient_data';
    
    const sortedQuestions = questions.sort((a, b) => a.timestamp - b.timestamp);
    const first = sortedQuestions.slice(0, Math.ceil(sortedQuestions.length / 2));
    const second = sortedQuestions.slice(Math.floor(sortedQuestions.length / 2));
    
    const firstComplexity = first.reduce((sum, q) => sum + q.complexity, 0) / first.length;
    const secondComplexity = second.reduce((sum, q) => sum + q.complexity, 0) / second.length;
    
    if (secondComplexity > firstComplexity + 0.2) return 'increasing_complexity';
    if (firstComplexity > secondComplexity + 0.2) return 'decreasing_complexity';
    return 'stable_complexity';
  }

  containsHelpRequest(text) {
    const helpKeywords = ['help', 'assist', 'support', 'need help', 'can you help'];
    return helpKeywords.some(keyword => text.includes(keyword));
  }

  containsProblemReport(text) {
    const problemKeywords = ['problem', 'issue', 'error', 'not working', 'broken', 'bug'];
    return problemKeywords.some(keyword => text.includes(keyword));
  }

  containsUrgentRequest(text) {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'critical'];
    return urgentKeywords.some(keyword => text.includes(keyword));
  }

  containsEscalationRequest(text) {
    const escalationKeywords = ['manager', 'supervisor', 'escalate', 'speak to someone else'];
    return escalationKeywords.some(keyword => text.includes(keyword));
  }

  containsSatisfactionIndicator(text) {
    const satisfactionKeywords = ['thank you', 'thanks', 'great', 'excellent', 'perfect', 'satisfied'];
    return satisfactionKeywords.some(keyword => text.includes(keyword));
  }

  containsDissatisfactionIndicator(text) {
    const dissatisfactionKeywords = ['disappointed', 'frustrated', 'angry', 'terrible', 'awful', 'unsatisfied'];
    return dissatisfactionKeywords.some(keyword => text.includes(keyword));
  }

  extractSupportTopics(text) {
    // Simplified support topic extraction
    const supportTopics = ['billing', 'technical', 'account', 'product', 'service', 'payment', 'login', 'setup'];
    return supportTopics.filter(topic => text.includes(topic));
  }

  calculateSupportLevel(indicators) {
    const totalRequests = indicators.helpRequests + indicators.problemReports + 
                         indicators.urgentRequests + indicators.escalationRequests;
    const totalMessages = Object.values(indicators).reduce((a, b) => a + b, 0);
    
    if (totalMessages === 0) return 'low';
    
    const supportRatio = totalRequests / totalMessages;
    
    if (supportRatio > 0.5) return 'high';
    if (supportRatio > 0.2) return 'medium';
    return 'low';
  }

  calculateSatisfactionScore(indicators) {
    const positive = indicators.satisfactionIndicators;
    const negative = indicators.dissatisfactionIndicators;
    const total = positive + negative;
    
    if (total === 0) return 0.5; // Neutral
    
    return positive / total;
  }

  calculateSupportTrend(conversations) {
    // Simplified support trend calculation
    if (conversations.length < 2) return 'stable';
    
    const recent = conversations.slice(-Math.ceil(conversations.length / 2));
    const older = conversations.slice(0, Math.floor(conversations.length / 2));
    
    const recentSupportMessages = this.countSupportMessages(recent);
    const olderSupportMessages = this.countSupportMessages(older);
    
    const recentTotal = this.countTotalMessages(recent);
    const olderTotal = this.countTotalMessages(older);
    
    const recentRatio = recentTotal > 0 ? recentSupportMessages / recentTotal : 0;
    const olderRatio = olderTotal > 0 ? olderSupportMessages / olderTotal : 0;
    
    if (recentRatio > olderRatio + 0.1) return 'increasing';
    if (olderRatio > recentRatio + 0.1) return 'decreasing';
    return 'stable';
  }

  countSupportMessages(conversations) {
    let count = 0;
    conversations.forEach(conv => {
      if (conv.messages) {
        conv.messages.forEach(msg => {
          if (this.isUserMessage(msg)) {
            const text = (msg.body || '').toLowerCase();
            if (this.containsHelpRequest(text) || this.containsProblemReport(text)) {
              count++;
            }
          }
        });
      }
    });
    return count;
  }

  countTotalMessages(conversations) {
    let count = 0;
    conversations.forEach(conv => {
      if (conv.messages) {
        count += conv.messages.filter(m => this.isUserMessage(m)).length;
      }
    });
    return count;
  }

  calculateChurnRisk(conversations) {
    // Simplified churn risk calculation
    if (conversations.length === 0) return 0.5;
    
    const lastConversation = conversations[conversations.length - 1];
    const daysSinceLastContact = (Date.now() - new Date(lastConversation.updatedAt)) / (1000 * 60 * 60 * 24);
    
    let risk = 0;
    
    // Time since last contact
    if (daysSinceLastContact > 30) risk += 0.3;
    if (daysSinceLastContact > 60) risk += 0.2;
    
    // Sentiment analysis
    const sentimentEvolution = this.analyzeSentimentEvolution(conversations);
    if (sentimentEvolution.recentTrend < -0.2) risk += 0.3;
    
    // Support issues
    const supportNeeds = this.analyzeSupportNeeds(conversations);
    if (supportNeeds.supportLevel === 'high') risk += 0.2;
    
    return Math.min(risk, 1);
  }

  calculateUpsellPotential(conversations) {
    // Simplified upsell potential calculation
    let potential = 0;
    
    const engagementMetrics = this.calculateEngagementMetrics(conversations);
    if (engagementMetrics.engagementLevel > 0.7) potential += 0.3;
    
    const sentimentEvolution = this.analyzeSentimentEvolution(conversations);
    if (sentimentEvolution.overallSentiment > 0.3) potential += 0.3;
    
    const questionPatterns = this.analyzeQuestionPatterns(conversations);
    if (questionPatterns.averageComplexity > 0.6) potential += 0.2;
    
    const supportNeeds = this.analyzeSupportNeeds(conversations);
    if (supportNeeds.satisfactionScore > 0.7) potential += 0.2;
    
    return Math.min(potential, 1);
  }

  calculateSupportRisk(conversations) {
    const supportNeeds = this.analyzeSupportNeeds(conversations);
    let risk = 0;
    
    if (supportNeeds.supportLevel === 'high') risk += 0.4;
    if (supportNeeds.satisfactionScore < 0.3) risk += 0.3;
    if (supportNeeds.supportTrend === 'increasing') risk += 0.3;
    
    return Math.min(risk, 1);
  }

  calculateEngagementTrend(conversations) {
    if (conversations.length < 2) return 'stable';
    
    const recent = conversations.slice(-Math.ceil(conversations.length / 2));
    const older = conversations.slice(0, Math.floor(conversations.length / 2));
    
    const recentEngagement = this.calculateEngagementMetrics(recent).engagementLevel;
    const olderEngagement = this.calculateEngagementMetrics(older).engagementLevel;
    
    if (recentEngagement > olderEngagement + 0.1) return 'increasing';
    if (olderEngagement > recentEngagement + 0.1) return 'decreasing';
    return 'stable';
  }

  calculateSatisfactionTrend(conversations) {
    const sentimentEvolution = this.analyzeSentimentEvolution(conversations);
    
    if (sentimentEvolution.recentTrend > 0.2) return 'improving';
    if (sentimentEvolution.recentTrend < -0.2) return 'declining';
    return 'stable';
  }

  /**
   * Cache Management
   */

  getFromCache(key) {
    const cached = this.analyticsCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.analyticsCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  setCache(key, data) {
    if (this.analyticsCache.size >= this.maxCacheSize) {
      const firstKey = this.analyticsCache.keys().next().value;
      this.analyticsCache.delete(firstKey);
    }
    
    this.analyticsCache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL
    });
  }

  getMinimalAnalysis() {
    return {
      communicationPatterns: {
        averageMessageLength: 0,
        questionFrequency: 0,
        excitementLevel: 0,
        communicationStyle: 'unknown'
      },
      engagementMetrics: {
        totalSessions: 0,
        engagementLevel: 0
      },
      responseBehavior: {
        responsiveness: 0,
        interactionStyle: 'unknown'
      },
      topicPreferences: {
        topTopics: [],
        topicDiversity: 0
      },
      sentimentEvolution: {
        overallSentiment: 0,
        overallTrend: 0
      },
      behavioralInsights: [],
      predictiveIndicators: {
        churnRisk: 0.5,
        upsellPotential: 0.5,
        supportRisk: 0.5
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(phoneNumber = null) {
    if (phoneNumber) {
      const cacheKey = `behavior:${phoneNumber}`;
      this.analyticsCache.delete(cacheKey);
    } else {
      this.analyticsCache.clear();
    }
  }
}

module.exports = ConversationAnalyticsService;