const EventEmitter = require('events');

class MockWhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.isReady = false;
    this.mockConversations = [];
    this.mockMessages = [];
    this.initializeMockData();
  }

  initializeMockData() {
    // Create some mock conversations
    this.mockConversations = [
      {
        id: 'mock_contact_1',
        name: 'John Doe',
        phone: '+1234567890',
        lastMessage: 'Hello, I need help with my order',
        timestamp: Date.now() - 300000, // 5 minutes ago
        unreadCount: 2
      },
      {
        id: 'mock_contact_2', 
        name: 'Sarah Wilson',
        phone: '+1987654321',
        lastMessage: 'Thank you for your service!',
        timestamp: Date.now() - 600000, // 10 minutes ago
        unreadCount: 0
      },
      {
        id: 'mock_contact_3',
        name: 'Mike Johnson',
        phone: '+1122334455',
        lastMessage: 'Can you send me more information?',
        timestamp: Date.now() - 900000, // 15 minutes ago
        unreadCount: 1
      }
    ];

    // Create some mock messages
    this.mockMessages = [
      {
        id: 'msg_1',
        from: 'mock_contact_1',
        body: 'Hello, I need help with my order',
        timestamp: Date.now() - 300000,
        type: 'text'
      },
      {
        id: 'msg_2',
        from: 'mock_contact_1',
        body: 'My order number is #12345',
        timestamp: Date.now() - 240000,
        type: 'text'
      },
      {
        id: 'msg_3',
        from: 'mock_contact_2',
        body: 'Thank you for your service!',
        timestamp: Date.now() - 600000,
        type: 'text'
      },
      {
        id: 'msg_4',
        from: 'mock_contact_3',
        body: 'Can you send me more information?',
        timestamp: Date.now() - 900000,
        type: 'text'
      }
    ];
  }

  initialize() {
    console.log('Initializing Mock WhatsApp Service...');
    
    // Simulate connection process
    setTimeout(() => {
      console.log('Mock WhatsApp client is ready!');
      this.isReady = true;
      this.emit('ready');
    }, 2000);

    // Simulate receiving messages periodically
    this.startMockMessageSimulation();
  }

  startMockMessageSimulation() {
    // Mock message simulation disabled by default
    // Uncomment the lines below to enable mock messages for testing
    /*
    setInterval(() => {
      if (this.isReady) {
        this.simulateIncomingMessage();
      }
    }, 30000);
    */
    console.log('📱 Mock WhatsApp message simulation disabled');
  }

  simulateIncomingMessage() {
    const contacts = this.mockConversations;
    const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
    
    const mockMessages = [
      'Hello, how are you?',
      'I have a question about your services',
      'Can you help me with something?',
      'Thank you for your response',
      'I need more information',
      'When will this be available?',
      'Can you send me a quote?',
      'I\'m interested in your product',
      'What are your business hours?',
      'Do you have any discounts?'
    ];

    const randomMessage = mockMessages[Math.floor(Math.random() * mockMessages.length)];
    
    const message = {
      id: { _serialized: `mock_msg_${Date.now()}` },
      from: randomContact.id,
      body: randomMessage,
      timestamp: Date.now(),
      type: 'text'
    };

    console.log('Mock WhatsApp message received:', message.body);
    this.emit('message', message);
  }

  async sendMessage(to, message) {
    if (!this.isReady) {
      throw new Error('Mock WhatsApp client is not ready');
    }

    console.log(`Mock WhatsApp: Sending message to ${to}: ${message}`);
    
    // Simulate message sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a mock response
    const result = {
      id: { _serialized: `sent_${Date.now()}` },
      from: 'me',
      to: to,
      body: message,
      timestamp: Date.now()
    };

    console.log('Mock WhatsApp: Message sent successfully');
    return result;
  }

  async getChats() {
    if (!this.isReady) {
      throw new Error('Mock WhatsApp client is not ready');
    }

    return this.mockConversations.map(conv => ({
      id: { _serialized: conv.id },
      name: conv.name,
      lastMessage: {
        body: conv.lastMessage,
        timestamp: conv.timestamp
      },
      unreadCount: conv.unreadCount
    }));
  }

  async getChatMessages(chatId, limit = 50) {
    if (!this.isReady) {
      throw new Error('Mock WhatsApp client is not ready');
    }

    const messages = this.mockMessages
      .filter(msg => msg.from === chatId)
      .slice(-limit)
      .map(msg => ({
        id: { _serialized: msg.id },
        from: msg.from,
        body: msg.body,
        timestamp: msg.timestamp,
        type: msg.type
      }));

    return messages;
  }

  async getContactInfo(contactId) {
    if (!this.isReady) {
      throw new Error('Mock WhatsApp client is not ready');
    }

    const contact = this.mockConversations.find(c => c.id === contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    return {
      id: { _serialized: contact.id },
      name: contact.name,
      number: contact.phone,
      isGroup: false,
      isUser: true
    };
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isConnected: true,
      isMock: true
    };
  }

  // Method to manually trigger a mock message (for testing)
  triggerMockMessage(contactId, message) {
    const mockMessage = {
      id: { _serialized: `mock_trigger_${Date.now()}` },
      from: contactId,
      body: message,
      timestamp: Date.now(),
      type: 'text'
    };

    console.log('Mock WhatsApp: Triggered message:', message);
    this.emit('message', mockMessage);
  }

  // Method to simulate different conversation scenarios
  simulateConversationScenario(scenario) {
    const scenarios = {
      'customer_support': () => {
        this.triggerMockMessage('mock_contact_1', 'I have an issue with my order #12345');
      },
      'sales_inquiry': () => {
        this.triggerMockMessage('mock_contact_2', 'I\'m interested in your premium package');
      },
      'complaint': () => {
        this.triggerMockMessage('mock_contact_3', 'I\'m not satisfied with the service');
      },
      'general_question': () => {
        this.triggerMockMessage('mock_contact_1', 'What are your business hours?');
      }
    };

    if (scenarios[scenario]) {
      scenarios[scenario]();
    }
  }

  async disconnect() {
    this.isReady = false;
    console.log('Mock WhatsApp client disconnected');
  }
}

module.exports = MockWhatsAppService;
