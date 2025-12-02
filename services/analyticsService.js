/**
 * Analytics Service for WhatsApp AI Chatbot
 * Handles tracking conversation metrics, response accuracy, and performance
 */

class AnalyticsService {
  constructor() {
    this.conversations = [];
    this.accuracyFeedback = [];
    this.knowledgeBaseStats = {
      totalDocuments: 0,
      totalWebsites: 0,
      lastUpdated: null
    };
  }

  /**
   * Log a new conversation for analytics
   */
  logConversation(data) {
    const conversation = {
      id: Date.now().toString(),
      timestamp: new Date(),
      contactId: data.contactId,
      phoneNumber: data.phoneNumber,
      message: data.message,
      response: data.response,
      responseTime: data.responseTime || 0,
      usedKnowledgeBase: data.usedKnowledgeBase || false,
      aiModel: data.aiModel || 'default'
    };
    
    this.conversations.push(conversation);
    // Keep only last 1000 conversations for memory efficiency
    if (this.conversations.length > 1000) {
      this.conversations = this.conversations.slice(-1000);
    }
    
    return conversation;
  }

  /**
   * Record accuracy feedback for a conversation
   */
  recordAccuracyFeedback(conversationId, isAccurate, feedback = '') {
    const entry = {
      conversationId,
      timestamp: new Date(),
      isAccurate,
      feedback
    };
    
    this.accuracyFeedback.push(entry);
    return entry;
  }

  /**
   * Update knowledge base statistics
   */
  updateKnowledgeBaseStats(stats) {
    this.knowledgeBaseStats = {
      ...this.knowledgeBaseStats,
      ...stats,
      lastUpdated: new Date()
    };
  }

  /**
   * Get dashboard metrics for the analytics UI
   */
  getDashboardMetrics() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filter recent conversations
    const recentConversations = this.conversations.filter(
      conv => new Date(conv.timestamp) >= oneWeekAgo
    );
    
    // Calculate conversation trends (daily)
    const conversationTrends = this._calculateDailyTrends(recentConversations);
    
    // Calculate response times
    const responseTimes = this._calculateResponseTimes(recentConversations);
    
    // Calculate accuracy metrics
    const accuracyMetrics = this._calculateAccuracyMetrics();
    
    // Get most recent conversations
    const latestConversations = this.conversations
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    
    return {
      conversationTrends,
      responseTimes,
      accuracyMetrics,
      latestConversations,
      knowledgeBaseStats: this.knowledgeBaseStats,
      summary: {
        totalConversations: this.conversations.length,
        activeUsers: this._countUniqueUsers(),
        avgResponseTime: this._calculateAvgResponseTime(),
        accuracyRate: accuracyMetrics.overallAccuracy
      }
    };
  }

  /**
   * Calculate daily conversation trends
   */
  _calculateDailyTrends(conversations) {
    const dailyCounts = {};
    const now = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyCounts[dateStr] = 0;
    }
    
    // Count conversations by day
    conversations.forEach(conv => {
      const dateStr = new Date(conv.timestamp).toISOString().split('T')[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    });
    
    return Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count
    }));
  }

  /**
   * Calculate response time metrics
   */
  _calculateResponseTimes(conversations) {
    if (conversations.length === 0) return [];
    
    const responseTimes = conversations
      .filter(conv => conv.responseTime > 0)
      .map(conv => ({
        timestamp: conv.timestamp,
        responseTime: conv.responseTime
      }));
    
    return responseTimes;
  }

  /**
   * Calculate accuracy metrics based on feedback
   */
  _calculateAccuracyMetrics() {
    if (this.accuracyFeedback.length === 0) {
      return {
        overallAccuracy: 0,
        dailyAccuracy: []
      };
    }
    
    // Calculate overall accuracy
    const accurateCount = this.accuracyFeedback.filter(f => f.isAccurate).length;
    const overallAccuracy = (accurateCount / this.accuracyFeedback.length) * 100;
    
    // Group by day for daily accuracy
    const dailyAccuracy = {};
    const now = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyAccuracy[dateStr] = {
        total: 0,
        accurate: 0,
        rate: 0
      };
    }
    
    // Calculate daily accuracy
    this.accuracyFeedback.forEach(feedback => {
      const dateStr = new Date(feedback.timestamp).toISOString().split('T')[0];
      if (dailyAccuracy[dateStr]) {
        dailyAccuracy[dateStr].total++;
        if (feedback.isAccurate) {
          dailyAccuracy[dateStr].accurate++;
        }
        dailyAccuracy[dateStr].rate = 
          (dailyAccuracy[dateStr].accurate / dailyAccuracy[dateStr].total) * 100;
      }
    });
    
    return {
      overallAccuracy,
      dailyAccuracy: Object.entries(dailyAccuracy).map(([date, data]) => ({
        date,
        ...data
      }))
    };
  }

  /**
   * Count unique users based on phone numbers
   */
  _countUniqueUsers() {
    const uniquePhoneNumbers = new Set();
    this.conversations.forEach(conv => {
      if (conv.phoneNumber) {
        uniquePhoneNumbers.add(conv.phoneNumber);
      }
    });
    return uniquePhoneNumbers.size;
  }

  /**
   * Calculate average response time
   */
  _calculateAvgResponseTime() {
    const responseTimes = this.conversations
      .filter(conv => conv.responseTime > 0)
      .map(conv => conv.responseTime);
    
    if (responseTimes.length === 0) return 0;
    
    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / responseTimes.length;
  }
}

module.exports = AnalyticsService;