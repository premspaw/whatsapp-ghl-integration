const fs = require('fs');
const path = require('path');

class AITrainingService {
    constructor(ghlService, userContextService, enhancedAIService) {
        this.ghlService = ghlService;
        this.userContextService = userContextService;
        this.enhancedAIService = enhancedAIService;
        this.trainingDataPath = path.join(__dirname, '..', 'data', 'ai-training-data.json');
        this.userProfilesPath = path.join(__dirname, '..', 'data', 'user-profiles-training.json');
        
        // Initialize training data structure
        this.initializeTrainingData();
    }

    /**
     * Initialize training data files
     */
    initializeTrainingData() {
        if (!fs.existsSync(this.trainingDataPath)) {
            const initialData = {
                userInteractions: {},
                conversationPatterns: {},
                responseEffectiveness: {},
                userPreferences: {},
                businessContext: {},
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.trainingDataPath, JSON.stringify(initialData, null, 2));
        }

        if (!fs.existsSync(this.userProfilesPath)) {
            const initialProfiles = {
                profiles: {},
                segments: {},
                personalizations: {},
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.userProfilesPath, JSON.stringify(initialProfiles, null, 2));
        }
    }

    /**
     * Train AI with user data from GHL
     */
    async trainWithGHLUserData() {
        console.log('🧠 Starting AI training with GHL user data...');
        
        try {
            // Get all contacts from GHL
            const contacts = await this.ghlService.getContacts();
            console.log(`📋 Processing ${contacts.length} contacts for AI training`);
            
            const trainingData = this.loadTrainingData();
            const userProfiles = this.loadUserProfiles();
            
            let processedCount = 0;
            
            for (const contact of contacts) {
                try {
                    if (contact.phone) {
                        await this.processContactForTraining(contact, trainingData, userProfiles);
                        processedCount++;
                        
                        if (processedCount % 10 === 0) {
                            console.log(`📊 Processed ${processedCount}/${contacts.length} contacts`);
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Error processing contact ${contact.id}:`, error.message);
                }
            }
            
            // Save updated training data
            trainingData.lastUpdated = new Date().toISOString();
            userProfiles.lastUpdated = new Date().toISOString();
            
            this.saveTrainingData(trainingData);
            this.saveUserProfiles(userProfiles);
            
            // Generate training insights
            const insights = await this.generateTrainingInsights(trainingData, userProfiles);
            
            console.log(`✅ AI training completed! Processed ${processedCount} contacts`);
            return {
                success: true,
                processedContacts: processedCount,
                totalContacts: contacts.length,
                insights
            };
            
        } catch (error) {
            console.error('❌ AI training failed:', error);
            throw error;
        }
    }

    /**
     * Process individual contact for training
     */
    async processContactForTraining(contact, trainingData, userProfiles) {
        const phoneNumber = contact.phone;
        
        // Get comprehensive user context
        const userContext = await this.userContextService.getUserContext(phoneNumber);
        
        // Extract training features
        const features = this.extractTrainingFeatures(contact, userContext);
        
        // Update user interactions
        if (!trainingData.userInteractions[phoneNumber]) {
            trainingData.userInteractions[phoneNumber] = {
                contactInfo: {
                    id: contact.id,
                    name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                    email: contact.email,
                    company: contact.companyName,
                    source: contact.source,
                    dateAdded: contact.dateAdded
                },
                interactionHistory: [],
                preferences: {},
                effectiveness: {}
            };
        }
        
        // Update conversation patterns
        if (userContext.conversations && userContext.conversations.length > 0) {
            this.analyzeConversationPatterns(phoneNumber, userContext.conversations, trainingData);
        }
        
        // Update user preferences
        this.updateUserPreferences(phoneNumber, features, trainingData);
        
        // Update business context
        this.updateBusinessContext(contact, userContext, trainingData);
        
        // Create user profile for personalization
        this.createUserProfile(phoneNumber, contact, userContext, userProfiles);
    }

    /**
     * Extract training features from contact and context
     */
    extractTrainingFeatures(contact, userContext) {
        return {
            demographics: {
                hasName: !!(contact.firstName || contact.lastName),
                hasEmail: !!contact.email,
                hasCompany: !!contact.companyName,
                source: contact.source
            },
            behavior: {
                engagementLevel: userContext.behavior?.engagementLevel || 'unknown',
                communicationStyle: userContext.behavior?.communicationStyle || 'unknown',
                responsePattern: userContext.behavior?.responsePattern || 'unknown',
                preferredTime: userContext.behavior?.preferredContactTime || 'unknown',
                sentimentTrend: userContext.behavior?.sentimentTrend || 'neutral'
            },
            business: {
                industry: userContext.business?.industry || 'unknown',
                company: contact.companyName || 'unknown',
                role: userContext.business?.role || 'unknown'
            },
            engagement: {
                totalMessages: userContext.conversations?.length || 0,
                avgResponseTime: userContext.behavior?.avgResponseTime || 0,
                lastActivity: userContext.behavior?.lastActivity
            },
            tags: contact.tags || [],
            customFields: contact.customFields || {}
        };
    }

    /**
     * Analyze conversation patterns for training
     */
    analyzeConversationPatterns(phoneNumber, conversations, trainingData) {
        if (!trainingData.conversationPatterns[phoneNumber]) {
            trainingData.conversationPatterns[phoneNumber] = {
                messageTypes: {},
                responsePatterns: {},
                topicPreferences: {},
                timePatterns: {}
            };
        }
        
        const patterns = trainingData.conversationPatterns[phoneNumber];
        
        for (const conversation of conversations) {
            if (conversation.messages) {
                for (const message of conversation.messages) {
                    // Analyze message types
                    const messageType = this.categorizeMessage(message.body || message.text);
                    patterns.messageTypes[messageType] = (patterns.messageTypes[messageType] || 0) + 1;
                    
                    // Analyze time patterns
                    if (message.timestamp || message.dateAdded) {
                        const hour = new Date(message.timestamp || message.dateAdded).getHours();
                        const timeSlot = this.getTimeSlot(hour);
                        patterns.timePatterns[timeSlot] = (patterns.timePatterns[timeSlot] || 0) + 1;
                    }
                    
                    // Analyze topics
                    const topics = this.extractTopics(message.body || message.text);
                    topics.forEach(topic => {
                        patterns.topicPreferences[topic] = (patterns.topicPreferences[topic] || 0) + 1;
                    });
                }
            }
        }
    }

    /**
     * Update user preferences based on interactions
     */
    updateUserPreferences(phoneNumber, features, trainingData) {
        if (!trainingData.userPreferences[phoneNumber]) {
            trainingData.userPreferences[phoneNumber] = {
                communicationStyle: 'formal',
                responseLength: 'medium',
                personalityType: 'professional',
                topicInterests: [],
                preferredGreeting: 'standard'
            };
        }
        
        const prefs = trainingData.userPreferences[phoneNumber];
        
        // Update based on behavior analysis
        if (features.behavior.communicationStyle !== 'unknown') {
            prefs.communicationStyle = features.behavior.communicationStyle;
        }
        
        if (features.behavior.engagementLevel === 'high') {
            prefs.responseLength = 'detailed';
            prefs.personalityType = 'enthusiastic';
        } else if (features.behavior.engagementLevel === 'low') {
            prefs.responseLength = 'brief';
            prefs.personalityType = 'concise';
        }
        
        // Update greeting preference based on business context
        if (features.business.company !== 'unknown') {
            prefs.preferredGreeting = 'business';
        }
    }

    /**
     * Update business context for industry-specific training
     */
    updateBusinessContext(contact, userContext, trainingData) {
        const industry = userContext.business?.industry || 'general';
        
        if (!trainingData.businessContext[industry]) {
            trainingData.businessContext[industry] = {
                commonQuestions: {},
                responsePatterns: {},
                terminology: {},
                contactCount: 0
            };
        }
        
        trainingData.businessContext[industry].contactCount++;
        
        // Add company-specific context
        if (contact.companyName) {
            const company = contact.companyName.toLowerCase();
            if (!trainingData.businessContext[industry].companies) {
                trainingData.businessContext[industry].companies = {};
            }
            trainingData.businessContext[industry].companies[company] = 
                (trainingData.businessContext[industry].companies[company] || 0) + 1;
        }
    }

    /**
     * Create detailed user profile for personalization
     */
    createUserProfile(phoneNumber, contact, userContext, userProfiles) {
        const profile = {
            id: phoneNumber,
            basic: {
                name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                phone: phoneNumber,
                company: contact.companyName,
                source: contact.source
            },
            behavior: userContext.behavior || {},
            business: userContext.business || {},
            preferences: {
                communicationStyle: this.inferCommunicationStyle(userContext),
                responseStyle: this.inferResponseStyle(userContext),
                personalityMatch: this.inferPersonalityMatch(userContext)
            },
            aiPersonalization: {
                greetingStyle: this.generateGreetingStyle(contact, userContext),
                responseTemplate: this.generateResponseTemplate(contact, userContext),
                topicFocus: this.generateTopicFocus(userContext),
                toneAdjustment: this.generateToneAdjustment(userContext)
            },
            tags: contact.tags || [],
            customFields: contact.customFields || {},
            lastUpdated: new Date().toISOString()
        };
        
        userProfiles.profiles[phoneNumber] = profile;
        
        // Add to segments
        const segment = this.determineUserSegment(profile);
        if (!userProfiles.segments[segment]) {
            userProfiles.segments[segment] = [];
        }
        if (!userProfiles.segments[segment].includes(phoneNumber)) {
            userProfiles.segments[segment].push(phoneNumber);
        }
    }

    /**
     * Generate personalized AI response using training data
     */
    async generatePersonalizedResponse(message, phoneNumber, conversationId) {
        console.log(`🎯 Generating personalized AI response for ${phoneNumber}`);
        
        try {
            const userProfiles = this.loadUserProfiles();
            const trainingData = this.loadTrainingData();
            
            const userProfile = userProfiles.profiles[phoneNumber];
            if (!userProfile) {
                console.log(`⚠️ No profile found for ${phoneNumber}, using standard response`);
                return await this.enhancedAIService.generateContextualReply(message, phoneNumber, conversationId);
            }
            
            // Customize AI personality based on user profile
            const personalizedPrompt = this.buildPersonalizedPrompt(message, userProfile, trainingData);
            
            // Generate response with personalization
            const response = await this.enhancedAIService.generateEnhancedReply(
                message,
                phoneNumber,
                conversationId,
                userProfile,
                [],
                []
            );
            
            // Log effectiveness for future training
            this.logResponseEffectiveness(phoneNumber, message, response, trainingData);
            
            return response;
            
        } catch (error) {
            console.error('❌ Error generating personalized response:', error);
            // Fallback to standard response
            return await this.enhancedAIService.generateContextualReply(message, phoneNumber, conversationId);
        }
    }

    /**
     * Build personalized prompt based on user profile
     */
    buildPersonalizedPrompt(message, userProfile, trainingData) {
        let prompt = `You are responding to ${userProfile.basic.name || 'a customer'}`;
        
        if (userProfile.basic.company) {
            prompt += ` from ${userProfile.basic.company}`;
        }
        
        prompt += `. Based on their profile:\n`;
        
        // Add communication style
        if (userProfile.preferences.communicationStyle) {
            prompt += `- Communication style: ${userProfile.preferences.communicationStyle}\n`;
        }
        
        // Add business context
        if (userProfile.business.industry) {
            prompt += `- Industry: ${userProfile.business.industry}\n`;
        }
        
        // Add behavioral insights
        if (userProfile.behavior.engagementLevel) {
            prompt += `- Engagement level: ${userProfile.behavior.engagementLevel}\n`;
        }
        
        // Add personalization instructions
        if (userProfile.aiPersonalization) {
            prompt += `\nPersonalization guidelines:\n`;
            prompt += `- Greeting style: ${userProfile.aiPersonalization.greetingStyle}\n`;
            prompt += `- Response tone: ${userProfile.aiPersonalization.toneAdjustment}\n`;
            prompt += `- Focus topics: ${userProfile.aiPersonalization.topicFocus}\n`;
        }
        
        prompt += `\nUser message: "${message}"\n`;
        prompt += `Respond appropriately based on this context.`;
        
        return prompt;
    }

    /**
     * Helper methods for profile analysis
     */
    categorizeMessage(text) {
        if (!text) return 'unknown';
        
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
            return 'greeting';
        } else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('$')) {
            return 'pricing';
        } else if (lowerText.includes('help') || lowerText.includes('support') || lowerText.includes('?')) {
            return 'support';
        } else if (lowerText.includes('thank') || lowerText.includes('thanks')) {
            return 'gratitude';
        } else if (lowerText.includes('cancel') || lowerText.includes('stop') || lowerText.includes('unsubscribe')) {
            return 'cancellation';
        }
        
        return 'general';
    }

    getTimeSlot(hour) {
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }

    extractTopics(text) {
        if (!text) return [];
        
        const topics = [];
        const lowerText = text.toLowerCase();
        
        // Business topics
        if (lowerText.includes('business') || lowerText.includes('company')) topics.push('business');
        if (lowerText.includes('service') || lowerText.includes('product')) topics.push('services');
        if (lowerText.includes('price') || lowerText.includes('cost')) topics.push('pricing');
        if (lowerText.includes('support') || lowerText.includes('help')) topics.push('support');
        if (lowerText.includes('meeting') || lowerText.includes('appointment')) topics.push('scheduling');
        
        return topics;
    }

    inferCommunicationStyle(userContext) {
        if (userContext.behavior?.communicationStyle) {
            return userContext.behavior.communicationStyle;
        }
        
        // Infer from other data
        if (userContext.business?.company) {
            return 'professional';
        }
        
        return 'friendly';
    }

    inferResponseStyle(userContext) {
        const engagementLevel = userContext.behavior?.engagementLevel;
        
        if (engagementLevel === 'high') return 'detailed';
        if (engagementLevel === 'low') return 'brief';
        
        return 'balanced';
    }

    inferPersonalityMatch(userContext) {
        const sentiment = userContext.behavior?.sentimentTrend;
        
        if (sentiment === 'positive') return 'enthusiastic';
        if (sentiment === 'negative') return 'supportive';
        
        return 'professional';
    }

    generateGreetingStyle(contact, userContext) {
        if (contact.companyName) return 'business';
        if (userContext.behavior?.communicationStyle === 'casual') return 'friendly';
        return 'professional';
    }

    generateResponseTemplate(contact, userContext) {
        const style = userContext.behavior?.communicationStyle || 'professional';
        const engagement = userContext.behavior?.engagementLevel || 'medium';
        
        return `${style}_${engagement}`;
    }

    generateTopicFocus(userContext) {
        const interests = userContext.behavior?.interests || [];
        return interests.length > 0 ? interests.join(', ') : 'general business';
    }

    generateToneAdjustment(userContext) {
        const sentiment = userContext.behavior?.sentimentTrend;
        
        if (sentiment === 'positive') return 'enthusiastic';
        if (sentiment === 'negative') return 'empathetic';
        
        return 'professional';
    }

    determineUserSegment(profile) {
        if (profile.business.company && profile.behavior.engagementLevel === 'high') {
            return 'enterprise_engaged';
        } else if (profile.business.company) {
            return 'business_customer';
        } else if (profile.behavior.engagementLevel === 'high') {
            return 'engaged_individual';
        }
        
        return 'general_customer';
    }

    logResponseEffectiveness(phoneNumber, message, response, trainingData) {
        if (!trainingData.responseEffectiveness[phoneNumber]) {
            trainingData.responseEffectiveness[phoneNumber] = [];
        }
        
        trainingData.responseEffectiveness[phoneNumber].push({
            timestamp: new Date().toISOString(),
            userMessage: message,
            aiResponse: response,
            messageType: this.categorizeMessage(message)
        });
        
        // Keep only last 50 interactions per user
        if (trainingData.responseEffectiveness[phoneNumber].length > 50) {
            trainingData.responseEffectiveness[phoneNumber] = 
                trainingData.responseEffectiveness[phoneNumber].slice(-50);
        }
    }

    /**
     * Generate training insights
     */
    async generateTrainingInsights(trainingData, userProfiles) {
        const insights = {
            totalUsers: Object.keys(userProfiles.profiles).length,
            segments: {},
            commonPatterns: {},
            businessInsights: {},
            recommendations: []
        };
        
        // Analyze user segments
        for (const [segment, users] of Object.entries(userProfiles.segments)) {
            insights.segments[segment] = {
                count: users.length,
                percentage: (users.length / insights.totalUsers * 100).toFixed(1)
            };
        }
        
        // Analyze common patterns
        const allPatterns = Object.values(trainingData.conversationPatterns);
        insights.commonPatterns = this.analyzeCommonPatterns(allPatterns);
        
        // Business insights
        insights.businessInsights = trainingData.businessContext;
        
        // Generate recommendations
        insights.recommendations = this.generateRecommendations(trainingData, userProfiles);
        
        return insights;
    }

    analyzeCommonPatterns(patterns) {
        const combined = {
            messageTypes: {},
            timePatterns: {},
            topicPreferences: {}
        };
        
        patterns.forEach(pattern => {
            // Combine message types
            Object.entries(pattern.messageTypes || {}).forEach(([type, count]) => {
                combined.messageTypes[type] = (combined.messageTypes[type] || 0) + count;
            });
            
            // Combine time patterns
            Object.entries(pattern.timePatterns || {}).forEach(([time, count]) => {
                combined.timePatterns[time] = (combined.timePatterns[time] || 0) + count;
            });
            
            // Combine topic preferences
            Object.entries(pattern.topicPreferences || {}).forEach(([topic, count]) => {
                combined.topicPreferences[topic] = (combined.topicPreferences[topic] || 0) + count;
            });
        });
        
        return combined;
    }

    generateRecommendations(trainingData, userProfiles) {
        const recommendations = [];
        
        // Analyze user segments for recommendations
        const segments = userProfiles.segments;
        
        if (segments.enterprise_engaged?.length > 0) {
            recommendations.push({
                type: 'personalization',
                priority: 'high',
                message: `${segments.enterprise_engaged.length} enterprise customers show high engagement. Consider creating specialized business-focused responses.`
            });
        }
        
        if (segments.general_customer?.length > segments.business_customer?.length) {
            recommendations.push({
                type: 'targeting',
                priority: 'medium',
                message: 'Most users are general customers. Consider adding business qualification questions to identify potential B2B opportunities.'
            });
        }
        
        // Analyze business context
        const industries = Object.keys(trainingData.businessContext);
        if (industries.length > 3) {
            recommendations.push({
                type: 'specialization',
                priority: 'medium',
                message: `Detected ${industries.length} different industries. Consider creating industry-specific response templates.`
            });
        }
        
        return recommendations;
    }

    /**
     * File operations
     */
    loadTrainingData() {
        try {
            return JSON.parse(fs.readFileSync(this.trainingDataPath, 'utf8'));
        } catch (error) {
            console.log('⚠️ Could not load training data, using defaults');
            return {
                userInteractions: {},
                conversationPatterns: {},
                responseEffectiveness: {},
                userPreferences: {},
                businessContext: {}
            };
        }
    }

    saveTrainingData(data) {
        fs.writeFileSync(this.trainingDataPath, JSON.stringify(data, null, 2));
    }

    loadUserProfiles() {
        try {
            return JSON.parse(fs.readFileSync(this.userProfilesPath, 'utf8'));
        } catch (error) {
            console.log('⚠️ Could not load user profiles, using defaults');
            return {
                profiles: {},
                segments: {},
                personalizations: {}
            };
        }
    }

    saveUserProfiles(data) {
        fs.writeFileSync(this.userProfilesPath, JSON.stringify(data, null, 2));
    }

    /**
     * Get training statistics
     */
    getTrainingStats() {
        const trainingData = this.loadTrainingData();
        const userProfiles = this.loadUserProfiles();
        
        return {
            totalUsers: Object.keys(userProfiles.profiles).length,
            totalInteractions: Object.keys(trainingData.userInteractions).length,
            segments: Object.keys(userProfiles.segments).length,
            businessContexts: Object.keys(trainingData.businessContext).length,
            lastUpdated: trainingData.lastUpdated || 'Never'
        };
    }
}

module.exports = AITrainingService;