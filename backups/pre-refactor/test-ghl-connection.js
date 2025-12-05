#!/usr/bin/env node

require('dotenv').config();
const GHLService = require('./services/ghlService');

async function testGHLConnection() {
    console.log('🔍 Testing GHL API Connection');
    console.log('=' .repeat(40));
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`   GHL_API_KEY: ${process.env.GHL_API_KEY ? process.env.GHL_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`   GHL_LOCATION_ID: ${process.env.GHL_LOCATION_ID || 'NOT SET'}`);
    console.log(`   GHL_BASE_URL: ${process.env.GHL_BASE_URL || 'NOT SET'}`);
    console.log('');
    
    try {
        const ghlService = new GHLService();
        
        console.log('🔧 GHL Service Configuration:');
        console.log(`   API Key: ${ghlService.apiKey ? ghlService.apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
        console.log(`   Location ID: ${ghlService.locationId || 'NOT SET'}`);
        console.log(`   Base URL: ${ghlService.baseUrl}`);
        console.log(`   Is Configured: ${ghlService.isConfigured()}`);
        console.log('');
        
        if (!ghlService.isConfigured()) {
            console.log('❌ GHL Service is not configured properly');
            return;
        }
        
        console.log('📞 Testing API Connection...');
        
        // Test getting contacts
        const contacts = await ghlService.getContacts();
        console.log(`✅ Successfully retrieved ${contacts.length} contacts from GHL`);
        
        if (contacts.length > 0) {
            console.log('');
            console.log('👥 Sample Contacts:');
            contacts.slice(0, 3).forEach((contact, index) => {
                console.log(`   ${index + 1}. ${contact.firstName || 'No Name'} ${contact.lastName || ''}`);
                console.log(`      Phone: ${contact.phone || 'No phone'}`);
                console.log(`      Email: ${contact.email || 'No email'}`);
                console.log(`      Company: ${contact.companyName || 'No company'}`);
                console.log(`      Source: ${contact.source || 'No source'}`);
                console.log('');
            });
            
            // Test finding a specific contact
            const testPhone = contacts[0].phone;
            if (testPhone) {
                console.log(`🔍 Testing contact lookup for: ${testPhone}`);
                const foundContact = await ghlService.findContactByPhone(testPhone);
                if (foundContact) {
                    console.log(`✅ Successfully found contact: ${foundContact.firstName} ${foundContact.lastName}`);
                } else {
                    console.log('❌ Could not find contact by phone');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ GHL Connection Test Failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testGHLConnection().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});