const axios = require('axios');
require('dotenv').config();

async function testWhatsAppMessage() {
  console.log('📱 Testing WhatsApp message addition to GHL\n');
  
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
  
  // Test 1: Try with TYPE_WHATSAPP for inbound message
  console.log('1️⃣ Testing inbound message with TYPE_WHATSAPP...');
  try {
    const response = await client.post('/conversations/messages', {
      contactId: contactId,
      conversationId: conversationId,
      message: 'Hello! This is a test WhatsApp message from a customer.',
      type: 'TYPE_WHATSAPP',
      direction: 'inbound',
      locationId: locationId
    });
    console.log('✅ Success with TYPE_WHATSAPP inbound:', response.data);
  } catch (error) {
    console.log('❌ Failed with TYPE_WHATSAPP inbound:', error.response?.data || error.message);
  }
  
  // Test 2: Try with TYPE_WHATSAPP for outbound message
  console.log('\n2️⃣ Testing outbound message with TYPE_WHATSAPP...');
  try {
    const response = await client.post('/conversations/messages', {
      contactId: contactId,
      conversationId: conversationId,
      message: 'Hi! Thank you for reaching out. How can I help you today?',
      type: 'TYPE_WHATSAPP',
      direction: 'outbound',
      locationId: locationId
    });
    console.log('✅ Success with TYPE_WHATSAPP outbound:', response.data);
  } catch (error) {
    console.log('❌ Failed with TYPE_WHATSAPP outbound:', error.response?.data || error.message);
  }
  
  // Test 3: Try with TYPE_CUSTOM_PROVIDER_SMS
  console.log('\n3️⃣ Testing with TYPE_CUSTOM_PROVIDER_SMS...');
  try {
    const response = await client.post('/conversations/messages', {
      contactId: contactId,
      conversationId: conversationId,
      message: 'This is a test message using custom provider SMS type.',
      type: 'TYPE_CUSTOM_PROVIDER_SMS',
      direction: 'inbound',
      locationId: locationId
    });
    console.log('✅ Success with TYPE_CUSTOM_PROVIDER_SMS:', response.data);
  } catch (error) {
    console.log('❌ Failed with TYPE_CUSTOM_PROVIDER_SMS:', error.response?.data || error.message);
  }
  
  // Check messages after adding
  console.log('\n4️⃣ Checking messages in conversation...');
  try {
    const messagesResponse = await client.get(`/conversations/${conversationId}/messages`);
    console.log(`✅ Found ${messagesResponse.data.messages?.length || 0} messages in conversation`);
    
    if (messagesResponse.data.messages && messagesResponse.data.messages.length > 0) {
      console.log('\n📨 Messages in conversation:');
      messagesResponse.data.messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.direction || 'unknown'}] (${msg.type || 'no type'})`);
        console.log(`      ${msg.message || msg.body || 'No message content'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Could not fetch messages:', error.response?.data?.message || error.message);
  }
}

testWhatsAppMessage().catch(console.error);
