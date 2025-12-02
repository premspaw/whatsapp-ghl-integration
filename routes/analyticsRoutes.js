const express = require('express');
const router = express.Router();

// Analytics service for data processing
class AnalyticsService {
  constructor(conversationManager, enhancedAIService) {
    this.conversationManager = conversationManager;
    this.enhancedAIService = enhancedAIService;
    this.metrics = {
      conversations: [],
      responseTimes: [],
      accuracy: {
        accurate: 0,
        needsImprovement: 0,
        incorrect: 0
      }
    };
    
    // Initialize with some sample data
    this.initSampleData();
  }
  
  // Initialize with sample data for demonstration
  initSampleData() {
    // Sample conversation data
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < 30; i++) {
      this.metrics.conversations.push({
        timestamp: now - (i * day),
        count: Math.floor(Math.random() * 50) + 10
      });
      
      this.metrics.responseTimes.push({
        hour: i % 24,
        avgTime: Math.floor(Math.random() * 1000) + 200
      });
    }
    
    // Sample accuracy data
    this.metrics.accuracy = {
      accurate: Math.floor(Math.random() * 100) + 100,
      needsImprovement: Math.floor(Math.random() * 50) + 20,
      incorrect: Math.floor(Math.random() * 20) + 5
    };
  }
  
  // Get dashboard data based on date range
  async getDashboardData(range = 'week') {
    try {
      // Get date range limits
      const now = Date.now();
      let startTime;
      
      switch (range) {
        case 'today':
          startTime = new Date().setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startTime = new Date().setHours(0, 0, 0, 0) - (24 * 60 * 60 * 1000);
          break;
        case 'week':
          startTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startTime = now - (30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startTime = now - (90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = now - (7 * 24 * 60 * 60 * 1000);
      }
      
      // Filter data by date range
      const filteredConversations = this.metrics.conversations.filter(
        c => c.timestamp >= startTime
      );
      
      // Get conversation trend data
      const conversationTrend = {
        labels: filteredConversations.map(c => new Date(c.timestamp).toLocaleDateString()),
        values: filteredConversations.map(c => c.count)
      };
      
      // Get response time data
      const responseTimes = {
        labels: this.metrics.responseTimes.map(r => `${r.hour}:00`),
        values: this.metrics.responseTimes.map(r => r.avgTime)
      };
      
      // Calculate summary metrics
      const totalConversations = filteredConversations.reduce((sum, c) => sum + c.count, 0);
      const activeUsers = Math.floor(totalConversations * 0.7); // Estimate unique users
      const avgResponseTime = Math.floor(
        this.metrics.responseTimes.reduce((sum, r) => sum + r.avgTime, 0) / 
        this.metrics.responseTimes.length
      );
      
      const totalAccuracy = this.metrics.accuracy.accurate + 
                           this.metrics.accuracy.needsImprovement + 
                           this.metrics.accuracy.incorrect;
                           
      const accuracyRate = Math.floor(
        (this.metrics.accuracy.accurate / totalAccuracy) * 100
      );
      
      const handoffRate = Math.floor(Math.random() * 20) + 5; // Sample handoff rate
      
      // Get recent conversations (would come from database in production)
      const recentConversations = await this.getRecentConversations(10);
      
      // Get knowledge base stats
      const knowledgeBaseStats = await this.getKnowledgeBaseStats();
      
      return {
        summary: {
          totalConversations,
          activeUsers,
          avgResponseTime,
          accuracyRate,
          handoffRate
        },
        conversationTrend,
        responseTimes,
        accuracy: this.metrics.accuracy,
        recentConversations,
        knowledgeBase: knowledgeBaseStats
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }
  
  // Get recent conversations
  async getRecentConversations(limit = 10) {
    try {
      // In production, this would query the database
      // For now, generate sample data
      const conversations = [];
      const now = Date.now();
      const hour = 60 * 60 * 1000;
      
      const sampleQueries = [
        "What are your business hours?",
        "How do I reset my password?",
        "Can you tell me about your pricing?",
        "I need help with my order",
        "Do you offer refunds?",
        "How long does shipping take?",
        "Is there a warranty on your products?",
        "Can I speak to a human agent?",
        "What payment methods do you accept?",
        "How do I track my order?"
      ];
      
      const sampleResponses = [
        "Our business hours are Monday to Friday, 9 AM to 5 PM.",
        "You can reset your password by clicking the 'Forgot Password' link on the login page.",
        "We offer several pricing tiers starting at $9.99/month. Would you like me to provide more details?",
        "I'd be happy to help with your order. Could you please provide your order number?",
        "Yes, we offer a 30-day money-back guarantee on all our products.",
        "Standard shipping takes 3-5 business days, while express shipping is 1-2 business days.",
        "All our products come with a 1-year limited warranty covering manufacturing defects.",
        "I'll connect you with a human agent right away. Please hold for a moment.",
        "We accept credit cards, PayPal, and bank transfers.",
        "You can track your order by logging into your account and viewing your order history."
      ];
      
      const accuracyOptions = ['accurate', 'needs_improvement', 'incorrect'];
      
      for (let i = 0; i < limit; i++) {
        const randomIndex = Math.floor(Math.random() * sampleQueries.length);
        const randomAccuracy = Math.random();
        let accuracy;
        
        if (randomAccuracy > 0.7) {
          accuracy = 'accurate';
        } else if (randomAccuracy > 0.2) {
          accuracy = 'needs_improvement';
        } else {
          accuracy = 'incorrect';
        }
        
        conversations.push({
          id: `conv-${i}`,
          timestamp: now - (i * hour),
          user: `+1234567${Math.floor(Math.random() * 1000)}`,
          query: sampleQueries[randomIndex],
          response: sampleResponses[randomIndex],
          accuracy: accuracy
        });
      }
      
      return conversations;
    } catch (error) {
      console.error('Error getting recent conversations:', error);
      return [];
    }
  }
  
  // Get knowledge base statistics
  async getKnowledgeBaseStats() {
    try {
      // In production, this would query the database
      // For now, return sample data
      return {
        totalDocuments: Math.floor(Math.random() * 50) + 10,
        totalWebsites: Math.floor(Math.random() * 10) + 2,
        totalEmbeddings: Math.floor(Math.random() * 5000) + 1000,
        usage: {
          labels: ['PDFs', 'Websites', 'Manual Entries'],
          values: [
            Math.floor(Math.random() * 100) + 50,
            Math.floor(Math.random() * 100) + 30,
            Math.floor(Math.random() * 50) + 10
          ]
        }
      };
    } catch (error) {
      console.error('Error getting knowledge base stats:', error);
      return {
        totalDocuments: 0,
        totalWebsites: 0,
        totalEmbeddings: 0
      };
    }
  }
  
  // Log conversation for analytics
  async logConversation(conversation) {
    try {
      // In production, this would store the conversation in a database
      console.log('Logging conversation for analytics:', conversation.id);
      
      // Update metrics (simplified)
      const today = new Date().setHours(0, 0, 0, 0);
      const existingIndex = this.metrics.conversations.findIndex(c => c.timestamp === today);
      
      if (existingIndex >= 0) {
        this.metrics.conversations[existingIndex].count++;
      } else {
        this.metrics.conversations.push({
          timestamp: today,
          count: 1
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error logging conversation:', error);
      return false;
    }
  }
  
  // Log response accuracy feedback
  async logAccuracyFeedback(conversationId, isAccurate) {
    try {
      // In production, this would update the conversation in a database
      console.log(`Logging accuracy feedback for conversation ${conversationId}: ${isAccurate}`);
      
      // Update metrics (simplified)
      if (isAccurate === true) {
        this.metrics.accuracy.accurate++;
      } else if (isAccurate === false) {
        this.metrics.accuracy.incorrect++;
      } else {
        this.metrics.accuracy.needsImprovement++;
      }
      
      return true;
    } catch (error) {
      console.error('Error logging accuracy feedback:', error);
      return false;
    }
  }
}

module.exports = function(conversationManager, enhancedAIService) {
  const analyticsService = new AnalyticsService(conversationManager, enhancedAIService);
  
  // Get dashboard data
  router.get('/dashboard', async (req, res) => {
    try {
      const { range } = req.query;
      const data = await analyticsService.getDashboardData(range);
      
      res.json(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // Log conversation
  router.post('/log/conversation', async (req, res) => {
    try {
      const { conversation } = req.body;
      
      if (!conversation) {
        return res.status(400).json({
          success: false,
          error: 'Conversation data is required'
        });
      }
      
      const result = await analyticsService.logConversation(conversation);
      
      res.json({
        success: result
      });
    } catch (error) {
      console.error('Error logging conversation:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // Log accuracy feedback
  router.post('/log/accuracy', async (req, res) => {
    try {
      const { conversationId, isAccurate } = req.body;
      
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: 'Conversation ID is required'
        });
      }
      
      const result = await analyticsService.logAccuracyFeedback(conversationId, isAccurate);
      
      res.json({
        success: result
      });
    } catch (error) {
      console.error('Error logging accuracy feedback:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  return router;
};