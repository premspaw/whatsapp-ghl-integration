const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { normalize: normalizePhone } = require('../utils/phoneNormalizer');

class MCPAIService extends EventEmitter {
  constructor(ghlService) {
    super();
    this.ghlService = ghlService;
    this.conversationMemory = new Map(); // Store last 10 conversations per user
    this.userProfiles = new Map(); // Cache user details from GHL
    this.knowledgeBase = new Map(); // Store knowledge base items
    this.trainingHistory = new Map(); // Store website training history
    this.maxConversationsPerUser = 10;
    this.knowledgeBasePath = path.join(__dirname, '..', 'data', 'knowledge-base.json');
    this.trainingHistoryPath = path.join(__dirname, '..', 'data', 'training-history.json');
    
    // AI Personality Configuration
    this.aiPersonality = {
      name: "Sarah",
      role: "Customer Success Manager", 
      company: "Your Business",
      tone: "friendly and professional",
      traits: ["helpful", "empathetic", "solution-oriented", "knowledgeable"]
    };
    
    // Initialize knowledge base and training history
    this.loadKnowledgeBase();
    this.loadTrainingHistory();
  }

  // Enhanced AI Reply with MCP Integration
  async generateContextualReply(message, phoneNumber, conversationId) {
    try {
      console.log(`🧠 MCP AI generating contextual reply for ${phoneNumber}`);

      // Get user profile from GHL (using MCP or local service)
      const userProfile = await this.getUserProfileFromGHL(phoneNumber);
      
      // Get conversation history
      const conversationHistory = this.getConversationHistory(phoneNumber);
      
      // Search knowledge base for relevant information
      const relevantKnowledge = this.searchKnowledgeBase(message);
      
      // Generate enhanced reply
      const aiReply = await this.generateEnhancedReply(
        message, 
        phoneNumber, 
        conversationId,
        userProfile,
        conversationHistory,
        relevantKnowledge
      );
      
      // Store conversation in memory
      this.storeConversation(phoneNumber, message, aiReply);
      
      return aiReply;
      
    } catch (error) {
      console.error('Error generating contextual reply:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Get user profile from GHL using MCP or local service
  async getUserProfileFromGHL(phoneNumber) {
    try {
      // First try to get from cache
      if (this.userProfiles.has(phoneNumber)) {
        return this.userProfiles.get(phoneNumber);
      }

      // Try to find contact in GHL
      const contact = await this.findContactInGHL(phoneNumber);
      
      if (contact) {
        const userProfile = {
          id: contact.id,
          name: contact.name || contact.firstName + ' ' + contact.lastName,
          phone: contact.phone,
          email: contact.email,
          company: contact.companyName,
          tags: contact.tags || [],
          customFields: contact.customFields || {},
          lastContact: contact.dateAdded,
          source: 'GHL'
        };
        
        // Cache the profile
        this.userProfiles.set(phoneNumber, userProfile);
        return userProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile from GHL:', error);
      return null;
    }
  }

  // Find contact in GHL (using local service for now)
  async findContactInGHL(phoneNumber) {
    try {
      // Use local GHL service to find contact
      const contacts = await this.ghlService.getContacts();
      
      if (contacts && contacts.length > 0) {
        // Find contact by phone number
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        const contact = contacts.find(c => 
          this.normalizePhoneNumber(c.phone) === normalizedPhone
        );
        return contact;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding contact in GHL:', error);
      return null;
    }
  }

  // Create new contact in GHL
  async createContactInGHL(contactData) {
    try {
      const contact = await this.ghlService.createContact({
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email,
        companyName: contactData.company,
        tags: contactData.tags || []
      });
      
      console.log(`✅ Created new contact in GHL: ${contact.id}`);
      return contact;
    } catch (error) {
      console.error('Error creating contact in GHL:', error);
      throw error;
    }
  }

  // Update contact in GHL
  async updateContactInGHL(contactId, updateData) {
    try {
      const contact = await this.ghlService.updateContact(contactId, updateData);
      console.log(`✅ Updated contact in GHL: ${contactId}`);
      return contact;
    } catch (error) {
      console.error('Error updating contact in GHL:', error);
      throw error;
    }
  }

  // Check if contact information is complete
  isContactInfoComplete(contact) {
    return contact && 
           contact.name && 
           contact.phone && 
           contact.email;
  }

  // Generate contact collection questions
  generateContactCollectionQuestions(contact) {
    const questions = [];
    
    if (!contact || !contact.name) {
      questions.push("What's your name?");
    }
    
    if (!contact || !contact.email) {
      questions.push("What's your email address?");
    }
    
    if (!contact || !contact.company) {
      questions.push("What company do you work for?");
    }
    
    return questions;
  }

  // Enhanced reply generation with GHL integration
  async generateEnhancedReply(message, phoneNumber, conversationId, userProfile, conversationHistory, relevantKnowledge) {
    try {
      // Check if this is a new contact or incomplete contact
      const isNewContact = !userProfile;
      const isIncompleteContact = userProfile && !this.isContactInfoComplete(userProfile);
      
      let aiReply = '';
      
      if (isNewContact) {
        // New contact - start with introduction and collect information
        aiReply = this.generateNewContactResponse(message, phoneNumber);
      } else if (isIncompleteContact) {
        // Incomplete contact - collect missing information
        const missingQuestions = this.generateContactCollectionQuestions(userProfile);
        if (missingQuestions.length > 0) {
          aiReply = `Hi ${userProfile.name}! I'd like to get to know you better. ${missingQuestions[0]}`;
        } else {
          aiReply = this.generateRegularResponse(message, userProfile, conversationHistory, relevantKnowledge);
        }
      } else {
        // Complete contact - provide personalized response
        aiReply = this.generateRegularResponse(message, userProfile, conversationHistory, relevantKnowledge);
      }
      
      return aiReply;
      
    } catch (error) {
      console.error('Error generating enhanced reply:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Generate response for new contacts
  generateNewContactResponse(message, phoneNumber) {
    const personality = this.aiPersonality;
    
    return `Hello! I'm ${personality.name}, your ${personality.role} at ${personality.company}. 

I'm here to help you with any questions or support you might need. To provide you with the best assistance, could you please tell me your name?`;
  }

  // Generate regular response for existing contacts
  generateRegularResponse(message, userProfile, conversationHistory, relevantKnowledge) {
    const personality = this.aiPersonality;
    const userName = userProfile.name || 'there';
    
    // Build context from user profile and knowledge
    let context = `User: ${userName}`;
    if (userProfile.company) context += ` from ${userProfile.company}`;
    if (userProfile.tags && userProfile.tags.length > 0) {
      context += ` (Tags: ${userProfile.tags.join(', ')})`;
    }
    
    // Add relevant knowledge
    if (relevantKnowledge.length > 0) {
      context += `\nRelevant Information: ${relevantKnowledge.join('; ')}`;
    }
    
    // Add conversation history
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-3).map(conv => 
        `User: ${conv.userMessage}\nAI: ${conv.aiResponse}`
      ).join('\n');
      context += `\nRecent conversation:\n${recentHistory}`;
    }
    
    // Generate response using the context
    const response = `Hi ${userName}! ${this.buildContextualResponse(message, context)}`;
    
    return response;
  }

  // Build contextual response
  buildContextualResponse(message, context) {
    // This is a simplified response builder
    // In a real implementation, you'd use an AI model here
    
    const responses = [
      "How can I help you today?",
      "What can I assist you with?",
      "I'm here to help! What do you need?",
      "How may I be of service to you today?"
    ];
    
    // Add some intelligence based on message content
    if (message.toLowerCase().includes('help')) {
      return "I'm here to help! What specific assistance do you need?";
    } else if (message.toLowerCase().includes('question')) {
      return "I'd be happy to answer your questions! What would you like to know?";
    } else if (message.toLowerCase().includes('problem') || message.toLowerCase().includes('issue')) {
      return "I understand you're having an issue. Let me help you resolve it. Can you tell me more details?";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Normalize phone number
  normalizePhoneNumber(phone) {
    return normalizePhone(phone);
  }

  // Get conversation history
  getConversationHistory(phoneNumber) {
    return this.conversationMemory.get(phoneNumber) || [];
  }

  // Store conversation
  storeConversation(phoneNumber, userMessage, aiResponse) {
    if (!this.conversationMemory.has(phoneNumber)) {
      this.conversationMemory.set(phoneNumber, []);
    }
    
    const history = this.conversationMemory.get(phoneNumber);
    history.push({
      userMessage,
      aiResponse,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 conversations
    if (history.length > this.maxConversationsPerUser) {
      history.shift();
    }
  }

  // Search knowledge base
  searchKnowledgeBase(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [id, item] of this.knowledgeBase) {
      if (item.content && item.content.toLowerCase().includes(queryLower)) {
        results.push(item.content.substring(0, 200) + '...');
      }
    }
    
    return results.slice(0, 3); // Return top 3 results
  }

  // Get fallback response
  getFallbackResponse(message) {
    const responses = [
      "I'm here to help! How can I assist you today?",
      "What can I do for you?",
      "I'm ready to help. What do you need?",
      "How may I be of service?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Load knowledge base
  async loadKnowledgeBase() {
    try {
      const data = await fs.readFile(this.knowledgeBasePath, 'utf8');
      const knowledgeData = JSON.parse(data);
      
      this.knowledgeBase.clear();
      knowledgeData.forEach(item => {
        this.knowledgeBase.set(item.id, item);
      });
      
      console.log(`📚 Loaded ${this.knowledgeBase.size} knowledge base items`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading knowledge base:', error);
      }
      this.knowledgeBase = new Map();
    }
  }

  // Load training history
  async loadTrainingHistory() {
    try {
      const data = await fs.readFile(this.trainingHistoryPath, 'utf8');
      const trainingData = JSON.parse(data);
      
      this.trainingHistory.clear();
      trainingData.forEach(item => {
        this.trainingHistory.set(item.id, item);
      });
      
      console.log(`🌐 Loaded ${this.trainingHistory.size} training history records`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading training history:', error);
      }
      this.trainingHistory = new Map();
    }
  }

  // Get AI personality
  getPersonality() {
    return this.aiPersonality;
  }

  // Update AI personality
  updatePersonality(newPersonality) {
    this.aiPersonality = { ...this.aiPersonality, ...newPersonality };
    console.log('🤖 AI personality updated:', this.aiPersonality);
  }

  // Get conversation stats
  getConversationStats() {
    return {
      totalUsers: this.conversationMemory.size,
      totalConversations: Array.from(this.conversationMemory.values())
        .reduce((total, history) => total + history.length, 0),
      knowledgeBaseItems: this.knowledgeBase.size,
      trainingHistoryItems: this.trainingHistory.size
    };
  }

  // Clear user memory
  clearUserMemory(phoneNumber) {
    this.conversationMemory.delete(phoneNumber);
    this.userProfiles.delete(phoneNumber);
    console.log(`🧹 Cleared memory for user: ${phoneNumber}`);
  }

  // Clear all memory
  clearAllMemory() {
    this.conversationMemory.clear();
    this.userProfiles.clear();
    console.log('🧹 Cleared all AI memory');
  }
}

module.exports = MCPAIService;
