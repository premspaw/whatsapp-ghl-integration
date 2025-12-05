const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class UserDataExportService {
    constructor(ghlService, userContextService) {
        this.ghlService = ghlService;
        this.userContextService = userContextService;
        this.exportDir = path.join(__dirname, '..', 'exports');
        
        // Ensure export directory exists
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    /**
     * Export all user data to Excel format
     */
    async exportToExcel(options = {}) {
        console.log('📊 Starting Excel export of user data...');
        
        try {
            const workbook = new ExcelJS.Workbook();
            
            // Create worksheets
            const contactsSheet = workbook.addWorksheet('Contacts');
            const conversationsSheet = workbook.addWorksheet('Conversations');
            const behaviorSheet = workbook.addWorksheet('Behavior Analysis');
            const tagsSheet = workbook.addWorksheet('Tags & Custom Fields');
            
            // Get all contacts from GHL
            const contacts = await this.ghlService.getContacts();
            console.log(`📋 Found ${contacts.length} contacts to export`);
            
            // Export contacts data
            await this.exportContactsToSheet(contactsSheet, contacts);
            
            // Export conversation data
            await this.exportConversationsToSheet(conversationsSheet, contacts);
            
            // Export behavior analysis
            await this.exportBehaviorAnalysisToSheet(behaviorSheet, contacts);
            
            // Export tags and custom fields
            await this.exportTagsAndCustomFieldsToSheet(tagsSheet, contacts);
            
            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `user_data_export_${timestamp}.xlsx`;
            const filepath = path.join(this.exportDir, filename);
            
            // Save workbook
            await workbook.xlsx.writeFile(filepath);
            
            console.log(`✅ Excel export completed: ${filename}`);
            return {
                success: true,
                filename,
                filepath,
                recordCount: contacts.length
            };
            
        } catch (error) {
            console.error('❌ Excel export failed:', error);
            throw error;
        }
    }

    /**
     * Export contacts to Excel sheet
     */
    async exportContactsToSheet(sheet, contacts) {
        // Define headers
        sheet.columns = [
            { header: 'Contact ID', key: 'id', width: 15 },
            { header: 'First Name', key: 'firstName', width: 20 },
            { header: 'Last Name', key: 'lastName', width: 20 },
            { header: 'Full Name', key: 'fullName', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Company', key: 'companyName', width: 25 },
            { header: 'Source', key: 'source', width: 20 },
            { header: 'Date Created', key: 'dateAdded', width: 20 },
            { header: 'Last Activity', key: 'lastActivity', width: 20 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'City', key: 'city', width: 20 },
            { header: 'State', key: 'state', width: 15 },
            { header: 'Country', key: 'country', width: 15 },
            { header: 'Postal Code', key: 'postalCode', width: 15 },
            { header: 'Tags Count', key: 'tagsCount', width: 15 },
            { header: 'Custom Fields Count', key: 'customFieldsCount', width: 20 }
        ];

        // Style header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        // Add data rows
        for (const contact of contacts) {
            sheet.addRow({
                id: contact.id,
                firstName: contact.firstName || '',
                lastName: contact.lastName || '',
                fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                email: contact.email || '',
                phone: contact.phone || '',
                companyName: contact.companyName || '',
                source: contact.source || '',
                dateAdded: contact.dateAdded ? new Date(contact.dateAdded) : '',
                lastActivity: contact.lastActivity ? new Date(contact.lastActivity) : '',
                address: contact.address1 || '',
                city: contact.city || '',
                state: contact.state || '',
                country: contact.country || '',
                postalCode: contact.postalCode || '',
                tagsCount: contact.tags ? contact.tags.length : 0,
                customFieldsCount: contact.customFields ? Object.keys(contact.customFields).length : 0
            });
        }

        console.log(`📋 Exported ${contacts.length} contacts to Excel`);
    }

    /**
     * Export conversation data to Excel sheet
     */
    async exportConversationsToSheet(sheet, contacts) {
        sheet.columns = [
            { header: 'Contact ID', key: 'contactId', width: 15 },
            { header: 'Contact Name', key: 'contactName', width: 25 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Total Messages', key: 'totalMessages', width: 15 },
            { header: 'AI Messages', key: 'aiMessages', width: 15 },
            { header: 'User Messages', key: 'userMessages', width: 15 },
            { header: 'First Message Date', key: 'firstMessage', width: 20 },
            { header: 'Last Message Date', key: 'lastMessage', width: 20 },
            { header: 'Avg Response Time (min)', key: 'avgResponseTime', width: 25 },
            { header: 'Conversation Status', key: 'status', width: 20 }
        ];

        // Style header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF70AD47' }
        };

        // Get conversation data for each contact
        for (const contact of contacts) {
            try {
                const conversations = await this.ghlService.getConversations(contact.id);
                const stats = this.calculateConversationStats(conversations);
                
                sheet.addRow({
                    contactId: contact.id,
                    contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                    phone: contact.phone,
                    totalMessages: stats.totalMessages,
                    aiMessages: stats.aiMessages,
                    userMessages: stats.userMessages,
                    firstMessage: stats.firstMessage ? new Date(stats.firstMessage) : '',
                    lastMessage: stats.lastMessage ? new Date(stats.lastMessage) : '',
                    avgResponseTime: stats.avgResponseTime,
                    status: stats.status
                });
            } catch (error) {
                console.log(`⚠️ Could not get conversations for contact ${contact.id}`);
            }
        }

        console.log(`💬 Exported conversation data for ${contacts.length} contacts`);
    }

    /**
     * Export behavior analysis to Excel sheet
     */
    async exportBehaviorAnalysisToSheet(sheet, contacts) {
        sheet.columns = [
            { header: 'Contact ID', key: 'contactId', width: 15 },
            { header: 'Contact Name', key: 'contactName', width: 25 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Engagement Level', key: 'engagementLevel', width: 20 },
            { header: 'Response Pattern', key: 'responsePattern', width: 20 },
            { header: 'Preferred Time', key: 'preferredTime', width: 20 },
            { header: 'Communication Style', key: 'communicationStyle', width: 25 },
            { header: 'Interest Topics', key: 'interestTopics', width: 30 },
            { header: 'Sentiment Score', key: 'sentimentScore', width: 20 },
            { header: 'Churn Risk', key: 'churnRisk', width: 15 }
        ];

        // Style header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF6B35' }
        };

        // Get behavior analysis for each contact
        for (const contact of contacts) {
            try {
                if (contact.phone) {
                    const userContext = await this.userContextService.getUserContext(contact.phone);
                    const behavior = userContext.behavior || {};
                    
                    sheet.addRow({
                        contactId: contact.id,
                        contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                        phone: contact.phone,
                        engagementLevel: behavior.engagementLevel || 'Unknown',
                        responsePattern: behavior.responsePattern || 'Unknown',
                        preferredTime: behavior.preferredContactTime || 'Unknown',
                        communicationStyle: behavior.communicationStyle || 'Unknown',
                        interestTopics: behavior.interests ? behavior.interests.join(', ') : '',
                        sentimentScore: behavior.sentimentTrend || 'Unknown',
                        churnRisk: behavior.churnRisk || 'Unknown'
                    });
                }
            } catch (error) {
                console.log(`⚠️ Could not get behavior analysis for contact ${contact.id}`);
            }
        }

        console.log(`🧠 Exported behavior analysis for ${contacts.length} contacts`);
    }

    /**
     * Export tags and custom fields to Excel sheet
     */
    async exportTagsAndCustomFieldsToSheet(sheet, contacts) {
        sheet.columns = [
            { header: 'Contact ID', key: 'contactId', width: 15 },
            { header: 'Contact Name', key: 'contactName', width: 25 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Tags', key: 'tags', width: 40 },
            { header: 'Custom Fields', key: 'customFields', width: 60 }
        ];

        // Style header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF9A4993' }
        };

        // Add data for each contact
        for (const contact of contacts) {
            const tags = contact.tags ? (Array.isArray(contact.tags) ? contact.tags.join(', ') : contact.tags) : '';
            const customFields = contact.customFields ? JSON.stringify(contact.customFields, null, 2) : '';
            
            sheet.addRow({
                contactId: contact.id,
                contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                phone: contact.phone,
                tags: tags,
                customFields: customFields
            });
        }

        console.log(`🏷️ Exported tags and custom fields for ${contacts.length} contacts`);
    }

    /**
     * Calculate conversation statistics
     */
    calculateConversationStats(conversations) {
        if (!conversations || conversations.length === 0) {
            return {
                totalMessages: 0,
                aiMessages: 0,
                userMessages: 0,
                firstMessage: null,
                lastMessage: null,
                avgResponseTime: 0,
                status: 'No conversations'
            };
        }

        let totalMessages = 0;
        let aiMessages = 0;
        let userMessages = 0;
        let firstMessage = null;
        let lastMessage = null;
        const responseTimes = [];

        for (const conversation of conversations) {
            if (conversation.messages) {
                totalMessages += conversation.messages.length;
                
                for (const message of conversation.messages) {
                    if (message.type === 'ai' || message.direction === 'outbound') {
                        aiMessages++;
                    } else {
                        userMessages++;
                    }
                    
                    const messageDate = new Date(message.dateAdded || message.timestamp);
                    if (!firstMessage || messageDate < firstMessage) {
                        firstMessage = messageDate;
                    }
                    if (!lastMessage || messageDate > lastMessage) {
                        lastMessage = messageDate;
                    }
                }
            }
        }

        const avgResponseTime = responseTimes.length > 0 
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
            : 0;

        return {
            totalMessages,
            aiMessages,
            userMessages,
            firstMessage,
            lastMessage,
            avgResponseTime: Math.round(avgResponseTime),
            status: totalMessages > 0 ? 'Active' : 'Inactive'
        };
    }

    /**
     * Export specific user data by phone number
     */
    async exportUserByPhone(phoneNumber, format = 'excel') {
        console.log(`📊 Exporting data for user: ${phoneNumber}`);
        
        try {
            // Get comprehensive user context
            const userContext = await this.userContextService.getUserContext(phoneNumber);
            
            if (format === 'excel') {
                return await this.exportSingleUserToExcel(phoneNumber, userContext);
            } else if (format === 'json') {
                return await this.exportSingleUserToJSON(phoneNumber, userContext);
            }
            
        } catch (error) {
            console.error(`❌ Failed to export user ${phoneNumber}:`, error);
            throw error;
        }
    }

    /**
     * Export single user to Excel
     */
    async exportSingleUserToExcel(phoneNumber, userContext) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('User Profile');
        
        // Add user information
        sheet.addRow(['User Profile Report']);
        sheet.addRow(['Generated:', new Date().toISOString()]);
        sheet.addRow(['Phone Number:', phoneNumber]);
        sheet.addRow([]);
        
        // Basic Information
        sheet.addRow(['BASIC INFORMATION']);
        sheet.addRow(['Name:', userContext.basic?.name || 'Unknown']);
        sheet.addRow(['Email:', userContext.basic?.email || 'Not provided']);
        sheet.addRow(['Phone:', userContext.basic?.phone || phoneNumber]);
        sheet.addRow(['Source:', userContext.basic?.source || 'Unknown']);
        sheet.addRow([]);
        
        // Business Information
        if (userContext.business) {
            sheet.addRow(['BUSINESS INFORMATION']);
            sheet.addRow(['Company:', userContext.business.company || 'Not provided']);
            sheet.addRow(['Industry:', userContext.business.industry || 'Not provided']);
            sheet.addRow(['Address:', userContext.business.address || 'Not provided']);
            sheet.addRow([]);
        }
        
        // Behavior Analysis
        if (userContext.behavior) {
            sheet.addRow(['BEHAVIOR ANALYSIS']);
            sheet.addRow(['Engagement Level:', userContext.behavior.engagementLevel || 'Unknown']);
            sheet.addRow(['Communication Style:', userContext.behavior.communicationStyle || 'Unknown']);
            sheet.addRow(['Response Pattern:', userContext.behavior.responsePattern || 'Unknown']);
            sheet.addRow(['Preferred Contact Time:', userContext.behavior.preferredContactTime || 'Unknown']);
            sheet.addRow(['Sentiment Trend:', userContext.behavior.sentimentTrend || 'Unknown']);
            sheet.addRow(['Churn Risk:', userContext.behavior.churnRisk || 'Unknown']);
            sheet.addRow([]);
        }
        
        // Tags
        if (userContext.behavior?.tags?.length > 0) {
            sheet.addRow(['TAGS']);
            userContext.behavior.tags.forEach(tag => {
                sheet.addRow(['', tag.name || tag]);
            });
            sheet.addRow([]);
        }
        
        // Custom Fields
        if (userContext.behavior?.customFields && Object.keys(userContext.behavior.customFields).length > 0) {
            sheet.addRow(['CUSTOM FIELDS']);
            Object.entries(userContext.behavior.customFields).forEach(([key, value]) => {
                sheet.addRow([key, value]);
            });
        }
        
        // Style the sheet
        sheet.getColumn(1).width = 25;
        sheet.getColumn(2).width = 40;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `user_profile_${phoneNumber.replace(/[^0-9]/g, '')}_${timestamp}.xlsx`;
        const filepath = path.join(this.exportDir, filename);
        
        await workbook.xlsx.writeFile(filepath);
        
        return {
            success: true,
            filename,
            filepath,
            userContext
        };
    }

    /**
     * Export single user to JSON
     */
    async exportSingleUserToJSON(phoneNumber, userContext) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `user_profile_${phoneNumber.replace(/[^0-9]/g, '')}_${timestamp}.json`;
        const filepath = path.join(this.exportDir, filename);
        
        const exportData = {
            exportInfo: {
                phoneNumber,
                exportDate: new Date().toISOString(),
                exportType: 'user_profile'
            },
            userContext
        };
        
        fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
        
        return {
            success: true,
            filename,
            filepath,
            userContext
        };
    }

    /**
     * Get export directory path
     */
    getExportDirectory() {
        return this.exportDir;
    }

    /**
     * List all export files
     */
    listExports() {
        if (!fs.existsSync(this.exportDir)) {
            return [];
        }
        
        return fs.readdirSync(this.exportDir)
            .filter(file => file.endsWith('.xlsx') || file.endsWith('.json'))
            .map(file => ({
                filename: file,
                filepath: path.join(this.exportDir, file),
                size: fs.statSync(path.join(this.exportDir, file)).size,
                created: fs.statSync(path.join(this.exportDir, file)).mtime
            }));
    }
}

module.exports = UserDataExportService;