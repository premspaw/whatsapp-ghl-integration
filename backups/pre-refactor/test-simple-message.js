const axios = require('axios');
require('dotenv').config();

async function testSimpleMessage() {
  console.log('🧪 Testing simple message addition to GHL\n');
  
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
  
  // Try the simplest possible payload
  console.log('1️⃣ Testing with minimal payload...');
  try {
    const response = await client.post('/conversations/messages', {
      contactId: contactId,
      message: 'Simple test message',
      locationId: locationId
    });
    console.log('✅ Success with minimal payload:', response.data);
  } catch (error) {
    console.log('❌ Failed with minimal payload:', error.response?.data || error.message);
  }
  
  // Try with conversationId
  console.log('\n2️⃣ Testing with conversationId...');
  try {
    const response = await client.post('/conversations/messages', {
      contactId: contactId,
      conversationId: conversationId,
      message: 'Test message with conversation ID',
      locationId: locationId
    });
    console.log('✅ Success with conversationId:', response.data);
  } catch (error) {
    console.log('❌ Failed with conversationId:', error.response?.data || error.message);
  }
  
  // Try different endpoint
  console.log('\n3️⃣ Testing different endpoint...');
  try {
    const response = await client.post(`/conversations/${conversationId}/messages`, {
      message: 'Test message to conversation endpoint',
      locationId: locationId
    });
    console.log('✅ Success with conversation endpoint:', response.data);
  } catch (error) {
    console.log('❌ Failed with conversation endpoint:', error.response?.data || error.message);
  }
}

testSimpleMessage().catch(console.error);
