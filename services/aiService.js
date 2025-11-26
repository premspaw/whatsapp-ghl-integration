const axios = require('axios');
const ModelSelector = require('../utils/modelSelector');

class AIService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';
    this.modelSelector = new ModelSelector();
    
    this.systemPrompts = {
      default: `You are a helpful WhatsApp assistant. Respond to messages in a friendly, professional manner. Keep responses concise and relevant.`,
      sales: `You are a sales assistant for WhatsApp conversations. Help qualify leads, answer questions about products/services, and guide prospects through the sales process. Be helpful but not pushy.`,
      support: `You are a customer support assistant. Help customers with their questions, provide solutions to problems, and maintain a positive, helpful tone.`,
      general: `You are a general assistant. Help users with their questions and provide useful information. Be friendly and professional.`
    };
  }

  async generateReply(message, context = {}) {
    try {
      if (!this.apiKey) {
        console.warn('OpenRouter API key not configured');
        return null;
      }

      const conversationHistory = context.messages || [];
      const conversationType = context.type || 'default';
      
      // Select optimal model based on conversation type
      const selectedModel = this.selectModelForConversation(conversationType, context);
      
      const systemPrompt = this.systemPrompts[conversationType] || this.systemPrompts.default;
      
      // Build conversation context
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Add recent conversation history (last 10 messages)
      const recentMessages = conversationHistory.slice(-10);
      for (const msg of recentMessages) {
        if (msg.from === 'ai') {
          messages.push({ role: 'assistant', content: msg.body });
        } else {
          messages.push({ role: 'user', content: msg.body });
        }
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: selectedModel,
        messages: messages,
        max_tokens: 150,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
          'X-Title': 'WhatsApp GHL Integration'
        }
      });

      const aiReply = response.data.choices[0].message.content.trim();
      
      // Log the interaction for debugging
      console.log('AI Reply generated:', {
        originalMessage: message,
        aiReply: aiReply,
        conversationType: conversationType,
        model: this.model
      });

      return aiReply;
    } catch (error) {
      console.error('Error generating AI reply:', error.response?.data || error.message);
      return null;
    }
  }

  async generateCustomReply(message, customPrompt, context = {}) {
    try {
      if (!this.apiKey) {
        console.warn('OpenRouter API key not configured');
        return null;
      }

      const conversationHistory = context.messages || [];
      const conversationType = context.type || 'default';
      // Prefer a speed-optimized model for WhatsApp quick replies; honor tenant llmTag override when provided
      const selectedModel = this.selectModelForConversation(conversationType, { prioritizeSpeed: true, llmTag: context.llmTag });
      
      const messages = [
        { role: 'system', content: customPrompt }
      ];

      // Add recent conversation history
      const recentMessages = conversationHistory.slice(-10);
      for (const msg of recentMessages) {
        if (msg.from === 'ai') {
          messages.push({ role: 'assistant', content: msg.body });
        } else {
          messages.push({ role: 'user', content: msg.body });
        }
      }

      messages.push({ role: 'user', content: message });

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: selectedModel,
        messages: messages,
        max_tokens: 140,
        temperature: 0.5,
        presence_penalty: 0.0,
        frequency_penalty: 0.0
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
          'X-Title': 'WhatsApp GHL Integration'
        },
        timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '10000', 10)
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating custom AI reply:', error.response?.data || error.message);
      return null;
    }
  }

  async analyzeSentiment(message) {
    try {
      if (!this.apiKey) {
        return null;
      }

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the given message. Respond with only one word: positive, negative, or neutral.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
          'X-Title': 'WhatsApp GHL Integration'
        }
      });

      return response.data.choices[0].message.content.trim().toLowerCase();
    } catch (error) {
      console.error('Error analyzing sentiment:', error.response?.data || error.message);
      return null;
    }
  }

  async extractIntent(message) {
    try {
      if (!this.apiKey) {
        return null;
      }

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Extract the main intent from the message. Respond with one of: question, complaint, request, greeting, goodbye, or other.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 20,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
          'X-Title': 'WhatsApp GHL Integration'
        }
      });

      return response.data.choices[0].message.content.trim().toLowerCase();
    } catch (error) {
      console.error('Error extracting intent:', error.response?.data || error.message);
      return null;
    }
  }

  async generateSummary(messages) {
    try {
      if (!this.apiKey || !messages.length) {
        return null;
      }

      const conversationText = messages
        .map(msg => `${msg.from}: ${msg.body}`)
        .join('\n');

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Summarize this WhatsApp conversation in 2-3 sentences. Focus on the main topics and outcomes.'
          },
          {
            role: 'user',
            content: conversationText
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
          'X-Title': 'WhatsApp GHL Integration'
        }
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating summary:', error.response?.data || error.message);
      return null;
    }
  }

  selectModelForConversation(conversationType, context = {}) {
    // Allow per-tenant override via llm_tag when provided
    if (context && typeof context.llmTag === 'string' && context.llmTag.trim()) {
      const override = context.llmTag.trim();
      console.log(`🤖 Using tenant override model tag for ${conversationType}: ${override}`);
      return override;
    }

    // Use model selector to choose optimal model
    const requirements = {
      prioritizeSpeed: context.prioritizeSpeed || false,
      prioritizeCost: context.prioritizeCost || false,
      prioritizeQuality: context.prioritizeQuality || false
    };

    const selectedModel = this.modelSelector.selectModel(conversationType, requirements);
    console.log(`🤖 Selected model for ${conversationType}: ${selectedModel}`);
    return selectedModel;
  }

  getModelRecommendations() {
    return this.modelSelector.getRecommendations();
  }

  getAllModels() {
    return this.modelSelector.getAllModels();
  }

  getStatus() {
    return {
      isConfigured: !!this.apiKey,
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : null,
      model: this.model,
      baseURL: this.baseURL,
      availablePrompts: Object.keys(this.systemPrompts),
      modelSelector: this.modelSelector.getComparisonTable()
    };
  }
}

module.exports = AIService;
