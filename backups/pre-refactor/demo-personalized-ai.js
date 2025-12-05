#!/usr/bin/env node

require('dotenv').config();
const GHLService = require('./services/ghlService');
const EnhancedAIService = require('./services/enhancedAIService');

async function demoPersonalizedAI() {
    console.log('🤖 DEMO: AI Using GHL User Data for Personalized Responses');
    console.log('=' .repeat(60));
    
    try {
        // Initialize services
        const ghlService = new GHLService();
        const aiService = new EnhancedAIService(ghlService);
        
        // Get real contacts from GHL
        console.log('📞 Getting contacts from GHL...');
        const contacts = await ghlService.getContacts();
        console.log(`✅ Found ${contacts.length} contacts in GHL\n`);
        
        if (contacts.length === 0) {
            console.log('❌ No contacts found. Please add some contacts to GHL first.');
            return;
        }
        
        // Demo with each contact
        for (let i = 0; i < Math.min(contacts.length, 2); i++) {
            const contact = contacts[i];
            
            console.log(`👤 CONTACT ${i + 1}: ${contact.firstName || 'Unknown'} ${contact.lastName || ''}`);
            console.log(`   📱 Phone: ${contact.phone || 'No phone'}`);
            console.log(`   📧 Email: ${contact.email || 'No email'}`);
            console.log(`   🏢 Company: ${contact.companyName || 'No company'}`);
            console.log(`   📍 Source: ${contact.source || 'No source'}`);
            console.log('');
            
            // Test different scenarios
            const scenarios = [
                {
                    message: "Hi, I need help with my account",
                    description: "Account Help Request"
                },
                {
                    message: "What services do you offer?",
                    description: "Services Inquiry"
                },
                {
                    message: "I'm interested in pricing",
                    description: "Pricing Question"
                }
            ];
            
            for (const scenario of scenarios) {
                console.log(`💬 ${scenario.description}: "${scenario.message}"`);
                
                try {
                    const response = await aiService.generateContextualReply(
                        scenario.message,
                        contact.phone || `contact_${contact.id}`,
                        {
                            contactInfo: contact,
                            userContext: {
                                name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                                phone: contact.phone,
                                email: contact.email,
                                company: contact.companyName,
                                source: contact.source
                            }
                        }
                    );
                    
                    if (response) {
                        console.log(`🤖 AI Response: ${response}`);
                    } else {
                        console.log('❌ No response generated');
                    }
                    
                } catch (error) {
                    console.log(`❌ Error: ${error.message}`);
                }
                
                console.log('-'.repeat(50));
            }
            
            console.log('\n');
        }
        
        // Show comparison: Generic vs Personalized
        console.log('🔄 COMPARISON: Generic vs Personalized Response');
        console.log('=' .repeat(50));
        
        const testMessage = "Hi, I need help with my account";
        
        // Generic response (no user data)
        console.log('💬 Message: "Hi, I need help with my account"');
        console.log('');
        
        console.log('🤖 GENERIC Response (No User Data):');
        const genericResponse = await aiService.generateContextualReply(
            testMessage,
            "unknown_user",
            {}
        );
        console.log(`   ${genericResponse || 'No response'}`);
        console.log('');
        
        // Personalized response (with user data)
        if (contacts.length > 0) {
            const contact = contacts[0];
            console.log(`🎯 PERSONALIZED Response (Using ${contact.firstName || 'Contact'}'s Data):`);
            const personalizedResponse = await aiService.generateContextualReply(
                testMessage,
                contact.phone || `contact_${contact.id}`,
                {
                    contactInfo: contact,
                    userContext: {
                        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                        phone: contact.phone,
                        email: contact.email,
                        company: contact.companyName,
                        source: contact.source
                    }
                }
            );
            console.log(`   ${personalizedResponse || 'No response'}`);
        }
        
        console.log('\n🎉 DEMO COMPLETE! The AI is successfully using GHL user data for personalized responses.');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the demo
demoPersonalizedAI().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
});