#!/usr/bin/env node

require('dotenv').config();
const GHLService = require('./services/ghlService');
const EnhancedAIService = require('./services/enhancedAIService');
const AIService = require('./services/aiService');

async function debugAIService() {
    console.log('🔍 Debugging AI Service');
    console.log('=' .repeat(40));
    
    try {
        // Test basic AI service first
        console.log('1️⃣ Testing Basic AI Service...');
        const basicAI = new AIService();
        
        console.log(`   OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET'}`);
        console.log(`   AI Service: ${process.env.AI_SERVICE || 'NOT SET'}`);
        
        const basicResponse = await basicAI.generateReply("Hello, how are you?");
        console.log(`   Basic AI Response: ${basicResponse || 'NULL'}`);
        console.log('');
        
        // Test GHL service
        console.log('2️⃣ Testing GHL Service...');
        const ghlService = new GHLService();
        console.log(`   GHL Configured: ${ghlService.isConfigured()}`);
        
        const contacts = await ghlService.getContacts();
        console.log(`   Contacts Retrieved: ${contacts.length}`);
        console.log('');
        
        // Test Enhanced AI service
        console.log('3️⃣ Testing Enhanced AI Service...');
        const enhancedAI = new EnhancedAIService(ghlService);
        
        // Test with a simple message first
        console.log('   Testing simple message...');
        const simpleResponse = await enhancedAI.generateContextualReply(
            "Hello",
            "test_user",
            {}
        );
        console.log(`   Simple Response: ${simpleResponse || 'NULL'}`);
        
        // Test with contact data
        if (contacts.length > 0) {
            const contact = contacts[0];
            console.log(`   Testing with contact: ${contact.firstName} ${contact.lastName}`);
            
            const contextualResponse = await enhancedAI.generateContextualReply(
                "Hi, I need help",
                contact.phone,
                {
                    contactInfo: contact,
                    userContext: {
                        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                        phone: contact.phone,
                        email: contact.email
                    }
                }
            );
            console.log(`   Contextual Response: ${contextualResponse || 'NULL'}`);
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug
debugAIService().catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});