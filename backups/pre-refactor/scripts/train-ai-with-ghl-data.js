#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

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

class AITrainingManager {
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

    async runTraining() {
        console.log('🚀 Starting AI Training with GHL User Data');
        console.log('=' .repeat(50));
        
        try {
            // Check if GHL is configured
            if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) {
                console.log('❌ GHL API not configured. Please set GHL_API_KEY and GHL_LOCATION_ID in .env file');
                return;
            }
            
            // Show current training stats
            console.log('📊 Current Training Statistics:');
            const currentStats = this.aiTrainingService.getTrainingStats();
            console.log(`   - Total Users: ${currentStats.totalUsers}`);
            console.log(`   - Total Interactions: ${currentStats.totalInteractions}`);
            console.log(`   - User Segments: ${currentStats.segments}`);
            console.log(`   - Business Contexts: ${currentStats.businessContexts}`);
            console.log(`   - Last Updated: ${currentStats.lastUpdated}`);
            console.log('');
            
            // Run training
            const result = await this.aiTrainingService.trainWithGHLUserData();
            
            console.log('');
            console.log('✅ Training Completed Successfully!');
            console.log('=' .repeat(50));
            console.log(`📈 Results:`);
            console.log(`   - Processed Contacts: ${result.processedContacts}`);
            console.log(`   - Total Contacts: ${result.totalContacts}`);
            console.log(`   - Success Rate: ${((result.processedContacts / result.totalContacts) * 100).toFixed(1)}%`);
            
            // Show insights
            if (result.insights) {
                console.log('');
                console.log('🧠 Training Insights:');
                console.log(`   - Total Users: ${result.insights.totalUsers}`);
                
                console.log('   - User Segments:');
                Object.entries(result.insights.segments).forEach(([segment, data]) => {
                    console.log(`     * ${segment}: ${data.count} users (${data.percentage}%)`);
                });
                
                console.log('   - Common Message Types:');
                const messageTypes = result.insights.commonPatterns.messageTypes || {};
                Object.entries(messageTypes)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .forEach(([type, count]) => {
                        console.log(`     * ${type}: ${count} messages`);
                    });
                
                console.log('   - Peak Activity Times:');
                const timePatterns = result.insights.commonPatterns.timePatterns || {};
                Object.entries(timePatterns)
                    .sort(([,a], [,b]) => b - a)
                    .forEach(([time, count]) => {
                        console.log(`     * ${time}: ${count} messages`);
                    });
                
                if (result.insights.recommendations.length > 0) {
                    console.log('');
                    console.log('💡 Recommendations:');
                    result.insights.recommendations.forEach((rec, index) => {
                        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
                    });
                }
            }
            
            // Show file locations
            console.log('');
            console.log('📁 Training Data Files:');
            console.log(`   - Training Data: data/ai-training-data.json`);
            console.log(`   - User Profiles: data/user-profiles-training.json`);
            
            console.log('');
            console.log('🎯 Next Steps:');
            console.log('   1. Review the generated user profiles and training data');
            console.log('   2. Test personalized responses with: node scripts/test-personalized-ai.js');
            console.log('   3. Export user data with: node scripts/export-user-data.js');
            console.log('   4. Configure OpenRouter API for enhanced AI responses');
            
        } catch (error) {
            console.error('❌ Training failed:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }

    async showTrainingData() {
        console.log('📋 Current Training Data Overview');
        console.log('=' .repeat(40));
        
        try {
            const stats = this.aiTrainingService.getTrainingStats();
            const trainingData = this.aiTrainingService.loadTrainingData();
            const userProfiles = this.aiTrainingService.loadUserProfiles();
            
            console.log('📊 Statistics:');
            console.log(`   - Total Users: ${stats.totalUsers}`);
            console.log(`   - Total Interactions: ${stats.totalInteractions}`);
            console.log(`   - User Segments: ${stats.segments}`);
            console.log(`   - Business Contexts: ${stats.businessContexts}`);
            console.log(`   - Last Updated: ${stats.lastUpdated}`);
            
            if (stats.totalUsers > 0) {
                console.log('');
                console.log('👥 User Segments:');
                Object.entries(userProfiles.segments || {}).forEach(([segment, users]) => {
                    console.log(`   - ${segment}: ${users.length} users`);
                });
                
                console.log('');
                console.log('🏢 Business Contexts:');
                Object.entries(trainingData.businessContext || {}).forEach(([industry, data]) => {
                    console.log(`   - ${industry}: ${data.contactCount} contacts`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error loading training data:', error.message);
        }
    }

    async clearTrainingData() {
        console.log('🗑️  Clearing Training Data...');
        
        try {
            const dataDir = path.join(__dirname, '..', 'data');
            const trainingFile = path.join(dataDir, 'ai-training-data.json');
            const profilesFile = path.join(dataDir, 'user-profiles-training.json');
            
            if (fs.existsSync(trainingFile)) {
                fs.unlinkSync(trainingFile);
                console.log('✅ Cleared ai-training-data.json');
            }
            
            if (fs.existsSync(profilesFile)) {
                fs.unlinkSync(profilesFile);
                console.log('✅ Cleared user-profiles-training.json');
            }
            
            // Reinitialize
            this.aiTrainingService.initializeTrainingData();
            console.log('✅ Training data cleared and reinitialized');
            
        } catch (error) {
            console.error('❌ Error clearing training data:', error.message);
        }
    }
}

// Main execution
async function main() {
    const manager = new AITrainingManager();
    const command = process.argv[2];
    
    switch (command) {
        case 'train':
            await manager.runTraining();
            break;
        case 'show':
        case 'stats':
            await manager.showTrainingData();
            break;
        case 'clear':
            await manager.clearTrainingData();
            break;
        default:
            console.log('🧠 AI Training Manager');
            console.log('');
            console.log('Usage:');
            console.log('  node scripts/train-ai-with-ghl-data.js train  - Run AI training with GHL data');
            console.log('  node scripts/train-ai-with-ghl-data.js show   - Show current training statistics');
            console.log('  node scripts/train-ai-with-ghl-data.js clear  - Clear all training data');
            console.log('');
            console.log('Examples:');
            console.log('  node scripts/train-ai-with-ghl-data.js train');
            console.log('  node scripts/train-ai-with-ghl-data.js show');
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

module.exports = AITrainingManager;