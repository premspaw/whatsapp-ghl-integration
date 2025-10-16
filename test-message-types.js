const GHLService = require('./services/ghlService');
require('dotenv').config();

async function testMessageTypes() {
  console.log('🧪 Testing different message types for GHL\n');
  
  const ghlService = new GHLService();
  
  const contactId = '85wGgV7Rjun1e3SkvUhI';
  const conversationId = 'xtTApslkThBQsfgDXnqd';
  
  // Test 1: Try without type field
  console.log('1️⃣ Testing without type field...');
  try {
    const result1 = await ghlService.addInboundMessage(contactId, {
      message: 'Test message without type field'
    }, conversationId);
    console.log('✅ Success without type field:', result1);
  } catch (error) {
    console.log('❌ Failed without type field:', error.response?.data?.message || error.message);
  }
  
  // Test 2: Try with TYPE_CALL
  console.log('\n2️⃣ Testing with TYPE_CALL...');
  try {
    const result2 = await ghlService.addInboundMessage(contactId, {
      message: 'Test message with TYPE_CALL',
      type: 'TYPE_CALL'
    }, conversationId);
    console.log('✅ Success with TYPE_CALL:', result2);
  } catch (error) {
    console.log('❌ Failed with TYPE_CALL:', error.response?.data?.message || error.message);
  }
  
  // Test 3: Try with TYPE_SMS
  console.log('\n3️⃣ Testing with TYPE_SMS...');
  try {
    const result3 = await ghlService.addInboundMessage(contactId, {
      message: 'Test message with TYPE_SMS',
      type: 'TYPE_SMS'
    }, conversationId);
    console.log('✅ Success with TYPE_SMS:', result3);
  } catch (error) {
    console.log('❌ Failed with TYPE_SMS:', error.response?.data?.message || error.message);
  }
}

testMessageTypes().catch(console.error);
