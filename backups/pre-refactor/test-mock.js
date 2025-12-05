#!/usr/bin/env node

/**
 * Test script for Mock WhatsApp Integration
 * Run this to test the mock WhatsApp functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMockWhatsApp() {
  console.log('🧪 Testing Mock WhatsApp Integration...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Checking server status...');
    const response = await axios.get(`${BASE_URL}/api/mock/contacts`);
    console.log('✅ Server is running and mock WhatsApp is active\n');

    // Test 2: Get mock contacts
    console.log('2. Fetching mock contacts...');
    const contacts = await axios.get(`${BASE_URL}/api/mock/contacts`);
    console.log(`✅ Found ${contacts.data.length} mock contacts:`);
    contacts.data.forEach(contact => {
      console.log(`   - ${contact.name} (${contact.id})`);
    });
    console.log('');

    // Test 3: Trigger a mock message
    console.log('3. Triggering mock message...');
    const messageResponse = await axios.post(`${BASE_URL}/api/mock/trigger-message`, {
      contactId: 'mock_contact_1',
      message: 'Hello from test script!'
    });
    console.log('✅ Mock message triggered successfully\n');

    // Test 4: Simulate a scenario
    console.log('4. Simulating customer support scenario...');
    const scenarioResponse = await axios.post(`${BASE_URL}/api/mock/simulate-scenario`, {
      scenario: 'customer_support'
    });
    console.log('✅ Customer support scenario triggered\n');

    // Test 5: Check conversations
    console.log('5. Checking conversations...');
    const conversationsResponse = await axios.get(`${BASE_URL}/api/conversations`);
    console.log(`✅ Found ${conversationsResponse.data.length} conversations in system\n`);

    console.log('🎉 All tests passed! Mock WhatsApp integration is working correctly.');
    console.log('\n📱 Next steps:');
    console.log('   1. Open http://localhost:3000 to see the main interface');
    console.log('   2. Open http://localhost:3000/mock-test.html for testing interface');
    console.log('   3. Test the conversation tabs and AI replies');
    console.log('   4. When ready, switch to real WhatsApp by setting USE_MOCK_WHATSAPP=false');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the server is running: npm start');
    console.log('   2. Check that USE_MOCK_WHATSAPP=true in your .env file');
    console.log('   3. Verify the server is running on port 3000');
    process.exit(1);
  }
}

// Run the test
testMockWhatsApp();
