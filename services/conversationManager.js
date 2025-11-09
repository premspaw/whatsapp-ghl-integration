const fs = require('fs').promises;
const path = require('path');
const { upsertContactByPhone, findByPhone } = require('./db/contactRepo');
const { upsertConversation, touchLastMessageAt } = require('./db/conversationRepo');
const { createMessage } = require('./db/messageRepo');
const { normalize: normalizePhone, isValidPhoneNumber } = require('../utils/phoneNormalizer');

class ConversationManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.conversationsFile = path.join(this.dataDir, 'conversations.json');
    this.conversations = new Map();
    
    this.initializeDataDirectory();
  }

  // Normalize phone number to consistent format: +918123133382
  normalizePhoneNumber(phone) {
    return normalizePhone(phone);
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
      
      // Migrate and normalize phone numbers
      const normalizedConversations = new Map();
      
      for (const [id, conversation] of Object.entries(conversationsData)) {
        // Normalize the phone number
        const normalizedPhone = this.normalizePhoneNumber(conversation.phone || conversation.phoneNumber || id);
        
        if (normalizedPhone) {
          // Check if we already have a conversation with this normalized number
          const existing = normalizedConversations.get(normalizedPhone);
          
          if (existing) {
            // Merge messages from duplicate conversation
            console.log(`🔄 Merging duplicate conversation: ${id} -> ${normalizedPhone}`);
            if (conversation.messages && conversation.messages.length > 0) {
              existing.messages = [...existing.messages, ...conversation.messages];
              // Sort by timestamp
              existing.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
              // Update timestamp to latest
              existing.updatedAt = Math.max(existing.updatedAt || 0, conversation.updatedAt || 0);
            }
          } else {
            // Update conversation with normalized phone
            conversation.id = normalizedPhone;
            conversation.phone = normalizedPhone;
            conversation.phoneNumber = normalizedPhone;
            normalizedConversations.set(normalizedPhone, conversation);
          }
        } else {
          // If normalization fails, keep only valid E.164 IDs; skip bad entries like '+91' or '[object Object]'
          if (typeof id === 'string' && isValidPhoneNumber(id)) {
            this.conversations.set(id, conversation);
          } else {
            console.warn(`Skipping invalid conversation id during load: ${String(id)}`);
          }
        }
      }
      
      // Add all normalized conversations
      for (const [id, conversation] of normalizedConversations.entries()) {
        this.conversations.set(id, conversation);
      }
      
      console.log(`Loaded ${this.conversations.size} conversations (normalized)`);
      
      // Save the normalized conversations
      await this.saveConversations();
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

  async addMessage(message, conversationId = null, contactName = null) {
    try {
      // Normalize the phone number/ID to consistent format
      let rawId = conversationId || message.from;
      // Guard against non-string conversationId (e.g., objects)
      if (typeof rawId !== 'string') {
        rawId = String(message.from || '');
      }
      let phoneNumber = message.from;
      
      // For AI messages, use the conversation ID as the phone number
      if (message.from === 'ai' && conversationId) {
        phoneNumber = conversationId;
      }
      
      // Normalize phone number to consistent format (+918123133382)
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Use normalized phone as the conversation ID
      const id = normalizedPhone || (typeof rawId === 'string' ? rawId : String(rawId));
      
      let conversation = this.conversations.get(id);
      
      if (!conversation) {
        conversation = {
          id: id,
          phone: normalizedPhone || phoneNumber,
          phoneNumber: normalizedPhone || phoneNumber, // Add phoneNumber field for consistency
          name: contactName || 'Unknown Contact',
          contactName: contactName || 'Unknown Contact',
          type: message.type || 'whatsapp', // whatsapp, sms, email, etc.
          channel: this.determineChannel(message),
          messages: [],
          aiEnabled: true, // Enable AI by default for new conversations
          syncToGHL: true, // Enable GHL sync by default
          lastSyncedMessageId: 0,
          isRead: false, // Add read status
          unreadCount: 0, // Add unread count
          createdAt: Date.now(),
          updatedAt: Date.now(),
          context: {
            type: 'default',
            messages: []
          }
        };
      } else {
        // Update existing conversation with contact name if provided
        if (contactName && (conversation.name === 'Unknown Contact' || !conversation.contactName)) {
          conversation.name = contactName;
          conversation.contactName = contactName;
          console.log('📞 Updated contact name for existing conversation:', contactName);
        }
        
        // Ensure phone number is normalized and set correctly
        const normalizedExisting = this.normalizePhoneNumber(conversation.phone);
        if (normalizedExisting && conversation.phone !== normalizedExisting) {
          conversation.phone = normalizedExisting;
          conversation.phoneNumber = normalizedExisting;
        }
        if (!conversation.phoneNumber && conversation.phone) {
          conversation.phoneNumber = conversation.phone;
        }
      }

      // Ensure messages array exists
      if (!conversation.messages) {
        conversation.messages = [];
      }

      // Add message to conversation
      // Determine if message is from AI or user (better detection)
      const isFromAI = message.from === 'ai' || message.from === 'bot' || message.direction === 'outbound';
      
      const messageData = {
        id: (message.id && message.id._serialized) || message.id || `msg_${Date.now()}`,
        from: isFromAI ? 'ai' : 'user',
        direction: isFromAI ? 'outbound' : 'inbound', // Add direction for better tracking
        body: message.body,
        timestamp: message.timestamp || Date.now(),
        type: message.type || 'text'
      };

      conversation.messages.push(messageData);
      conversation.updatedAt = Date.now();
      
      // Update unread count for incoming messages (not from AI)
      if (!isFromAI) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        conversation.isRead = false;
      }
      
      // Update context for AI - ensure context exists
      if (!conversation.context) {
        conversation.context = { type: 'default', messages: [] };
      }
      conversation.context.messages = conversation.messages.slice(-20); // Keep last 20 messages

      this.conversations.set(id, conversation);
      await this.saveConversations();

      // Write-through to Supabase if configured
      try {
        const phoneE164 = (conversation.phoneNumber || '').replace('@c.us','');
        // Upsert contact
        const dbContact = await upsertContactByPhone({ phone: phoneE164, name: conversation.contactName || conversation.name || null });
        if (dbContact) {
          // Upsert conversation
          const dbConv = await upsertConversation({ contactId: dbContact.id, channel: conversation.channel && conversation.channel.includes('email') ? 'email' : (conversation.channel && conversation.channel.includes('sms') ? 'sms' : 'whatsapp') });
          if (dbConv) {
            await createMessage({
              conversationId: dbConv.id,
              contactId: dbContact.id,
              direction: messageData.from === 'ai' ? 'OUTGOING' : 'INCOMING',
              providerMessageId: messageData.id,
              content: messageData.body,
              media: [],
              meta: { source: 'whatsapp' }
            });
            await touchLastMessageAt(dbConv.id);
          }
        }
      } catch (dbErr) {
        // Non-fatal
      }

      return conversation;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async getConversation(conversationId) {
    // Try direct lookup first
    let conversation = this.conversations.get(conversationId);
    
    // If not found, try normalizing the phone number and looking up again
    if (!conversation) {
      const normalizedId = this.normalizePhoneNumber(conversationId);
      if (normalizedId && normalizedId !== conversationId) {
        conversation = this.conversations.get(normalizedId);
      }
    }
    
    return conversation || null;
  }

  async updateConversation(conversation) {
    try {
      this.conversations.set(conversation.id, conversation);
      await this.saveConversations();
      return conversation;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
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
        conversation.isRead = true;
        conversation.unreadCount = 0;
        conversation.updatedAt = Date.now();
        this.conversations.set(conversationId, conversation);
        await this.saveConversations();
        console.log('✅ Conversation marked as read:', conversationId);
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  async markAsUnread(conversationId) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.isRead = false;
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        conversation.updatedAt = Date.now();
        this.conversations.set(conversationId, conversation);
        await this.saveConversations();
        console.log('✅ Conversation marked as unread:', conversationId);
      }
    } catch (error) {
      console.error('Error marking conversation as unread:', error);
      throw error;
    }
  }

  async getUnreadConversations() {
    const conversations = Array.from(this.conversations.values());
    return conversations.filter(conv => !conv.isRead || (conv.unreadCount && conv.unreadCount > 0));
  }

  async getReadConversations() {
    const conversations = Array.from(this.conversations.values());
    return conversations.filter(conv => conv.isRead && (!conv.unreadCount || conv.unreadCount === 0));
  }

  async addConversation(conversation) {
    try {
      this.conversations.set(conversation.id, conversation);
      await this.saveConversations();
      console.log('✅ Conversation added:', conversation.id);
    } catch (error) {
      console.error('❌ Error adding conversation:', error);
      throw error;
    }
  }

  async updateConversation(conversation) {
    try {
      this.conversations.set(conversation.id, conversation);
      await this.saveConversations();
      console.log('✅ Conversation updated:', conversation.id);
    } catch (error) {
      console.error('❌ Error updating conversation:', error);
      throw error;
    }
  }
}

module.exports = ConversationManager;
