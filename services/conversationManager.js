const fs = require('fs').promises;
const path = require('path');

class ConversationManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.conversationsFile = path.join(this.dataDir, 'conversations.json');
    this.conversations = new Map();
    
    this.initializeDataDirectory();
  }

  async initializeDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await this.loadConversations();
    } catch (error) {
      console.error('Error initializing data directory:', error);
    }
  }

  async loadConversations() {
    try {
      const data = await fs.readFile(this.conversationsFile, 'utf8');
      const conversationsData = JSON.parse(data);
      
      this.conversations.clear();
      for (const [id, conversation] of Object.entries(conversationsData)) {
        this.conversations.set(id, conversation);
      }
      
      console.log(`Loaded ${this.conversations.size} conversations`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading conversations:', error);
      }
      // File doesn't exist yet, start with empty conversations
    }
  }

  async saveConversations() {
    try {
      const conversationsData = Object.fromEntries(this.conversations);
      await fs.writeFile(this.conversationsFile, JSON.stringify(conversationsData, null, 2));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  }

  async addMessage(message, conversationId = null) {
    try {
      // If no conversation ID provided, use the message sender
      const id = conversationId || message.from;
      
      let conversation = this.conversations.get(id);
      
      if (!conversation) {
        conversation = {
          id: id,
          phone: message.from,
          name: 'Unknown Contact',
          type: message.type || 'whatsapp', // whatsapp, sms, email, etc.
          channel: this.determineChannel(message),
          messages: [],
          aiEnabled: false,
          syncToGHL: false,
          lastSyncedMessageId: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          context: {
            type: 'default',
            messages: []
          }
        };
      }

      // Add message to conversation
      const messageData = {
        id: (message.id && message.id._serialized) || message.id || `msg_${Date.now()}`,
        from: message.from === 'ai' ? 'ai' : 'user',
        body: message.body,
        timestamp: message.timestamp || Date.now(),
        type: message.type || 'text'
      };

      conversation.messages.push(messageData);
      conversation.updatedAt = Date.now();
      
      // Update context for AI
      conversation.context.messages = conversation.messages.slice(-20); // Keep last 20 messages

      this.conversations.set(id, conversation);
      await this.saveConversations();

      return conversation;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async getConversation(conversationId) {
    return this.conversations.get(conversationId) || null;
  }

  async getAllConversations() {
    const conversations = Array.from(this.conversations.values());
    
    // Sort by last message timestamp
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getConversationsByType(type) {
    const conversations = Array.from(this.conversations.values());
    return conversations.filter(conv => conv.type === type).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  determineChannel(message) {
    // Determine the channel based on message properties
    if (message.from && message.from.includes('@g.us')) {
      return 'whatsapp_group';
    } else if (message.from && message.from.includes('@c.us')) {
      return 'whatsapp_private';
    } else if (message.type === 'sms') {
      return 'sms';
    } else if (message.type === 'email') {
      return 'email';
    } else {
      return 'whatsapp_private';
    }
  }

  async updateConversationName(conversationId, name) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.name = name;
        conversation.updatedAt = Date.now();
        this.conversations.set(conversationId, conversation);
        await this.saveConversations();
      }
    } catch (error) {
      console.error('Error updating conversation name:', error);
      throw error;
    }
  }

  async toggleAI(conversationId, enabled) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.aiEnabled = enabled;
        conversation.updatedAt = Date.now();
        this.conversations.set(conversationId, conversation);
        await this.saveConversations();
      }
    } catch (error) {
      console.error('Error toggling AI:', error);
      throw error;
    }
  }

  async toggleGHLSync(conversationId, enabled) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.syncToGHL = enabled;
        conversation.updatedAt = Date.now();
        this.conversations.set(conversationId, conversation);
        await this.saveConversations();
      }
    } catch (error) {
      console.error('Error toggling GHL sync:', error);
      throw error;
    }
  }

  async updateConversationContext(conversationId, context) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.context = { ...conversation.context, ...context };
        conversation.updatedAt = Date.now();
        this.conversations.set(conversationId, conversation);
        await this.saveConversations();
      }
    } catch (error) {
      console.error('Error updating conversation context:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId) {
    try {
      this.conversations.delete(conversationId);
      await this.saveConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  async getConversationStats() {
    const conversations = Array.from(this.conversations.values());
    
    return {
      total: conversations.length,
      withAI: conversations.filter(c => c.aiEnabled).length,
      withGHLSync: conversations.filter(c => c.syncToGHL).length,
      totalMessages: conversations.reduce((sum, c) => sum + c.messages.length, 0),
      recentActivity: conversations.filter(c => 
        Date.now() - c.updatedAt < 24 * 60 * 60 * 1000 // Last 24 hours
      ).length
    };
  }

  async searchConversations(query) {
    const conversations = Array.from(this.conversations.values());
    
    return conversations.filter(conversation => {
      const searchText = `${conversation.name} ${conversation.phone} ${conversation.messages.map(m => m.body).join(' ')}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
  }

  async getConversationMessages(conversationId, limit = 50) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return [];
    }
    
    return conversation.messages.slice(-limit);
  }

  async markAsRead(conversationId) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.unreadCount = 0;
        conversation.updatedAt = Date.now();
        this.conversations.set(conversationId, conversation);
        await this.saveConversations();
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }
}

module.exports = ConversationManager;
