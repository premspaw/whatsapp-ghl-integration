#!/usr/bin/env node

const path = require('path');

// Add the project root to the module path
const projectRoot = path.join(__dirname, '..');
require('module').globalPaths.push(path.join(projectRoot, 'node_modules'));

// Load environment variables
require('dotenv').config({ path: path.join(projectRoot, '.env') });

// Import services
const GHLService = require('../services/ghlService');
const UserContextService = require('../services/userContextService');
const EnhancedAIService = require('../services/enhancedAIService');
const AITrainingService = require('../services/aiTrainingService');

class PersonalizedAITester {
    constructor() {
        this.ghlService = new GHLService();
        this.userContextService = new UserContextService();
        this.enhancedAIService = new EnhancedAIService();
        this.aiTrainingService = new AITrainingService(
            this.ghlService,
            this.userContextService,
            this.enhancedAIService
        );
    }

    async testPersonalizedResponses() {
        console.log('🎯 Testing Personalized AI Responses');
        console.log('=' .repeat(50));
        
        try {
            // Load user profiles
            const userProfiles = this.aiTrainingService.loadUserProfiles();
            const profiles = Object.values(userProfiles.profiles || {});
            
            if (profiles.length === 0) {
                console.log('❌ No user profiles found. Please run training first:');
                console.log('   node scripts/train-ai-with-ghl-data.js train');
                return;
            }
            
            console.log(`📋 Found ${profiles.length} user profiles for testing`);
            console.log('');
            
            // Test with different user types
            const testCases = [
                {
                    message: "Hello, I'm interested in your services",
                    description: "General inquiry"
                },
                {
                    message: "What are your pricing options?",
                    description: "Pricing question"
                },
                {
                    message: "I need help with my account",
                    description: "Support request"
                },
                {
                    message: "Can we schedule a meeting?",
                    description: "Meeting request"
                },
                {
                    message: "Thank you for your help!",
                    description: "Gratitude message"
                }
            ];
            
            // Test with first few profiles
            const testProfiles = profiles.slice(0, 3);
            
            for (let i = 0; i < testProfiles.length; i++) {
                const profile = testProfiles[i];
                console.log(`👤 Testing User ${i + 1}: ${profile.basic.name || profile.id}`);
                console.log(`   Company: ${profile.basic.company || 'N/A'}`);
                console.log(`   Communication Style: ${profile.preferences?.communicationStyle || 'N/A'}`);
                console.log(`   Segment: ${this.getUserSegment(profile, userProfiles.segments)}`);
                console.log('');
                
                for (const testCase of testCases) {
                    console.log(`   📝 ${testCase.description}: "${testCase.message}"`);
                    
                    try {
                        const response = await this.aiTrainingService.generatePersonalizedResponse(
                            testCase.message,
                            profile.id,
                            `test-conversation-${Date.now()}`
                        );
                        
                        if (response) {
                            console.log(`   🤖 AI Response: "${response}"`);
                        } else {
                            console.log(`   ⚠️  No response generated (API key may be missing)`);
                        }
                        
                    } catch (error) {
                        console.log(`   ❌ Error: ${error.message}`);
                    }
                    
                    console.log('');
                }
                
                console.log('-' .repeat(40));
                console.log('');
            }
            
            // Show comparison with standard responses
            console.log('🔄 Comparison: Standard vs Personalized');
            console.log('=' .repeat(50));
            
            const sampleMessage = "Hello, I'm interested in your services";
            const samplePhone = testProfiles[0]?.id || '+1234567890';
            
            console.log(`📝 Test Message: "${sampleMessage}"`);
            console.log('');
            
            try {
                // Standard response
                console.log('🤖 Standard AI Response:');
                const standardResponse = await this.enhancedAIService.generateContextualReply(
                    sampleMessage,
                    samplePhone,
                    `test-standard-${Date.now()}`
                );
                console.log(`   "${standardResponse || 'No response (API key missing)'}"`);
                console.log('');
                
                // Personalized response
                console.log('🎯 Personalized AI Response:');
                const personalizedResponse = await this.aiTrainingService.generatePersonalizedResponse(
                    sampleMessage,
                    samplePhone,
                    `test-personalized-${Date.now()}`
                );
                console.log(`   "${personalizedResponse || 'No response (API key missing)'}"`);
                
            } catch (error) {
                console.log(`❌ Comparison failed: ${error.message}`);
            }
            
        } catch (error) {
            console.error('❌ Testing failed:', error.message);
        }
    }

    async testSpecificUser() {
        const phoneNumber = process.argv[3];
        if (!phoneNumber) {
            console.log('❌ Please provide a phone number to test');
            console.log('Usage: node scripts/test-personalized-ai.js user +1234567890');
            return;
        }
        
        console.log(`🎯 Testing Personalized AI for User: ${phoneNumber}`);
        console.log('=' .repeat(50));
        
        try {
            const userProfiles = this.aiTrainingService.loadUserProfiles();
            const profile = userProfiles.profiles[phoneNumber];
            
            if (!profile) {
                console.log(`❌ No profile found for ${phoneNumber}`);
                console.log('Available users:');
                Object.keys(userProfiles.profiles).forEach(phone => {
                    const p = userProfiles.profiles[phone];
                    console.log(`   - ${phone} (${p.basic.name || 'No name'})`);
                });
                return;
            }
            
            console.log('👤 User Profile:');
            console.log(`   Name: ${profile.basic.name || 'N/A'}`);
            console.log(`   Company: ${profile.basic.company || 'N/A'}`);
            console.log(`   Email: ${profile.basic.email || 'N/A'}`);
            console.log(`   Communication Style: ${profile.preferences?.communicationStyle || 'N/A'}`);
            console.log(`   Response Style: ${profile.preferences?.responseStyle || 'N/A'}`);
            console.log(`   Personality Match: ${profile.preferences?.personalityMatch || 'N/A'}`);
            console.log('');
            
            // Interactive testing
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            console.log('💬 Interactive Testing (type "exit" to quit):');
            console.log('');
            
            const askQuestion = () => {
                rl.question('Your message: ', async (message) => {
                    if (message.toLowerCase() === 'exit') {
                        rl.close();
                        return;
                    }
                    
                    try {
                        console.log('🤖 Generating personalized response...');
                        const response = await this.aiTrainingService.generatePersonalizedResponse(
                            message,
                            phoneNumber,
                            `interactive-test-${Date.now()}`
                        );
                        
                        console.log(`AI Response: "${response || 'No response (API key missing)'}"`);
                        console.log('');
                        
                    } catch (error) {
                        console.log(`❌ Error: ${error.message}`);
                        console.log('');
                    }
                    
                    askQuestion();
                });
            };
            
            askQuestion();
            
        } catch (error) {
            console.error('❌ User testing failed:', error.message);
        }
    }

    async showUserProfiles() {
        console.log('👥 User Profiles Overview');
        console.log('=' .repeat(40));
        
        try {
            const userProfiles = this.aiTrainingService.loadUserProfiles();
            const profiles = Object.values(userProfiles.profiles || {});
            
            if (profiles.length === 0) {
                console.log('❌ No user profiles found. Please run training first.');
                return;
            }
            
            console.log(`📋 Total Profiles: ${profiles.length}`);
            console.log('');
            
            // Show segments
            console.log('📊 User Segments:');
            Object.entries(userProfiles.segments || {}).forEach(([segment, users]) => {
                console.log(`   - ${segment}: ${users.length} users`);
            });
            console.log('');
            
            // Show sample profiles
            console.log('👤 Sample Profiles:');
            profiles.slice(0, 10).forEach((profile, index) => {
                console.log(`   ${index + 1}. ${profile.basic.name || 'No name'} (${profile.id})`);
                console.log(`      Company: ${profile.basic.company || 'N/A'}`);
                console.log(`      Style: ${profile.preferences?.communicationStyle || 'N/A'}`);
                console.log(`      Segment: ${this.getUserSegment(profile, userProfiles.segments)}`);
                console.log('');
            });
            
            if (profiles.length > 10) {
                console.log(`   ... and ${profiles.length - 10} more profiles`);
            }
            
        } catch (error) {
            console.error('❌ Error loading profiles:', error.message);
        }
    }

    getUserSegment(profile, segments) {
        for (const [segment, users] of Object.entries(segments || {})) {
            if (users.includes(profile.id)) {
                return segment;
            }
        }
        return 'unknown';
    }
}

// Main execution
async function main() {
    const tester = new PersonalizedAITester();
    const command = process.argv[2];
    
    switch (command) {
        case 'test':
            await tester.testPersonalizedResponses();
            break;
        case 'user':
            await tester.testSpecificUser();
            break;
        case 'profiles':
        case 'show':
            await tester.showUserProfiles();
            break;
        default:
            console.log('🎯 Personalized AI Response Tester');
            console.log('');
            console.log('Usage:');
            console.log('  node scripts/test-personalized-ai.js test              - Test personalized responses');
            console.log('  node scripts/test-personalized-ai.js user <phone>      - Test specific user interactively');
            console.log('  node scripts/test-personalized-ai.js profiles          - Show user profiles overview');
            console.log('');
            console.log('Examples:');
            console.log('  node scripts/test-personalized-ai.js test');
            console.log('  node scripts/test-personalized-ai.js user +1234567890');
            console.log('  node scripts/test-personalized-ai.js profiles');
            break;
    }
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = PersonalizedAITester;