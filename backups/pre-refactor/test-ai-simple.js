#!/usr/bin/env node

require('dotenv').config();
const AIService = require('./services/aiService');

async function testAISimple() {
    console.log('🔍 Testing AI Service Directly');
    console.log('=' .repeat(40));
    
    try {
        const aiService = new AIService();
        
        console.log('📋 Configuration:');
        console.log(`   API Key: ${process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET'}`);
        console.log(`   Model: ${process.env.OPENROUTER_MODEL || 'DEFAULT'}`);
        console.log('');
        
        // Test basic generateReply
        console.log('1️⃣ Testing generateReply...');
        const basicReply = await aiService.generateReply("Hello, how are you?");
        console.log(`   Result: ${basicReply || 'NULL'}`);
        console.log('');
        
        // Test generateCustomReply
        console.log('2️⃣ Testing generateCustomReply...');
        const customPrompt = "You are a helpful assistant. Respond to the user's message in a friendly way.";
        const customReply = await aiService.generateCustomReply("Hi, I need help", customPrompt);
        console.log(`   Result: ${customReply || 'NULL'}`);
        console.log('');
        
        // Test with context
        console.log('3️⃣ Testing with context...');
        const contextReply = await aiService.generateCustomReply(
            "What services do you offer?",
            "You are a customer service representative. Help the customer with their inquiry.",
            {
                messages: [
                    { from: 'user', body: 'Hello' },
                    { from: 'ai', body: 'Hi there! How can I help you today?' }
                ]
            }
        );
        console.log(`   Result: ${contextReply || 'NULL'}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testAISimple().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
