#!/usr/bin/env node

require('dotenv').config();
const GHLService = require('./services/ghlService');
const EnhancedAIService = require('./services/enhancedAIService');

async function testPersonalizedResponses() {
    console.log('🤖 Testing AI Personalized Responses with GHL Data');
    console.log('=' .repeat(50));
    
    try {
        const ghlService = new GHLService();
        const aiService = new EnhancedAIService(ghlService);
        
        // Get real contacts from GHL
        console.log('📞 Fetching contacts from GHL...');
        const contacts = await ghlService.getContacts();
        console.log(`✅ Retrieved ${contacts.length} contacts`);
        console.log('');
        
        if (contacts.length === 0) {
            console.log('❌ No contacts found in GHL');
            return;
        }
        
        // Test with each contact
        for (let i = 0; i < Math.min(contacts.length, 3); i++) {
            const contact = contacts[i];
            console.log(`👤 Testing with Contact ${i + 1}:`);
            console.log(`   Name: ${contact.firstName || 'Unknown'} ${contact.lastName || ''}`);
            console.log(`   Phone: ${contact.phone || 'No phone'}`);
            console.log(`   Email: ${contact.email || 'No email'}`);
            console.log(`   Company: ${contact.companyName || 'No company'}`);
            console.log(`   Source: ${contact.source || 'No source'}`);
            console.log('');
            
            // Test different types of messages
            const testMessages = [
                "Hi, I need help with my account",
                "What services do you offer?",
                "I'm interested in your products",
                "Can you help me with pricing?"
            ];
            
            for (const message of testMessages) {
                console.log(`💬 User Message: "${message}"`);
                
                try {
                    // Generate AI response using contact data
                    const response = await aiService.generateContextualReply(
                        message,
                        contact.phone || contact.id,
                        {
                            contactInfo: contact,
                            userContext: {
                                name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                                phone: contact.phone,
                                email: contact.email,
                                company: contact.companyName,
                                source: contact.source,
                                customFields: contact.customFields || {}
                            }
                        }
                    );
                    
                    if (response) {
                        console.log(`🤖 AI Response: ${response}`);
                    } else {
                        console.log('❌ AI returned null response');
                    }
                    
                } catch (error) {
                    console.log(`❌ Error generating response: ${error.message}`);
                }
                
                console.log('-'.repeat(40));
            }
            
            console.log('');
        }
        
        // Test without user context (generic response)
        console.log('🔄 Testing Generic Response (No User Data):');
        const genericResponse = await aiService.generateContextualReply(
            "Hi, I need help with my account",
            "unknown_user",
            {}
        );
        
        if (genericResponse) {
            console.log(`🤖 Generic Response: ${genericResponse}`);
        } else {
            console.log('❌ Generic response returned null');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testPersonalizedResponses().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});