const axios = require('axios');
require('dotenv').config();

async function testAlternativeEndpoints() {
  console.log('🔍 Testing alternative endpoints for adding messages\n');
  
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  const baseUrl = 'https://services.leadconnectorhq.com';
  
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  });
  
  const contactId = '85wGgV7Rjun1e3SkvUhI';
  const conversationId = 'xtTApslkThBQsfgDXnqd';
  
  // Test 1: Try using the webhook endpoint
  console.log('1️⃣ Testing webhook endpoint...');
  try {
    const response = await client.post('/conversations/webhook', {
      contactId: contactId,
      message: 'Test message via webhook',
      type: 'text',
      direction: 'inbound',
      locationId: locationId
    });
    console.log('✅ Success with webhook:', response.data);
  } catch (error) {
    console.log('❌ Failed with webhook:', error.response?.data || error.message);
  }
  
  // Test 2: Try using a different message format
  console.log('\n2️⃣ Testing with different message format...');
  try {
    const response = await client.post('/conversations/messages', {
      contactId: contactId,
      conversationId: conversationId,
      message: 'Test message with different format',
      type: 'text', // Try lowercase
      direction: 'inbound',
      locationId: locationId,
      source: 'custom_whatsapp'
    });
    console.log('✅ Success with different format:', response.data);
  } catch (error) {
    console.log('❌ Failed with different format:', error.response?.data || error.message);
  }
  
  // Test 3: Try without conversationId
  console.log('\n3️⃣ Testing without conversationId...');
  try {
    const response = await client.post('/conversations/messages', {
      contactId: contactId,
      message: 'Test message without conversation ID',
      type: 'text',
      direction: 'inbound',
      locationId: locationId
    });
    console.log('✅ Success without conversationId:', response.data);
  } catch (error) {
    console.log('❌ Failed without conversationId:', error.response?.data || error.message);
  }
  
  // Test 4: Try with just the basic fields
  console.log('\n4️⃣ Testing with minimal required fields...');
  try {
    const response = await client.post('/conversations/messages', {
      contactId: contactId,
      message: 'Minimal test message',
      locationId: locationId
    });
    console.log('✅ Success with minimal fields:', response.data);
  } catch (error) {
    console.log('❌ Failed with minimal fields:', error.response?.data || error.message);
  }
  
  // Test 5: Try updating the conversation instead
  console.log('\n5️⃣ Testing conversation update...');
  try {
    const response = await client.put(`/conversations/${conversationId}`, {
      status: 'active',
      locationId: locationId
    });
    console.log('✅ Success updating conversation:', response.data);
  } catch (error) {
    console.log('❌ Failed updating conversation:', error.response?.data || error.message);
  }
}

testAlternativeEndpoints().catch(console.error);
