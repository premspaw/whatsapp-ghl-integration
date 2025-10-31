const axios = require('axios');

async function testCompleteRAGPipeline() {
  console.log('🧪 Testing Complete RAG Pipeline with GHL Integration\n');
  
  const baseURL = 'http://localhost:3000';
  
  try {
    // Test 1: WhatsApp Webhook with proper message format
    console.log('1️⃣ Testing WhatsApp Webhook with RAG Integration...');
    
    const whatsappMessage = {
      from: '+1234567890@c.us',
      phone: '+1234567890',
      message: 'Hello, I need help with your premium services and pricing information',
      text: {
        body: 'Hello, I need help with your premium services and pricing information'
      },
      timestamp: Date.now(),
      providerMessageId: `test_${Date.now()}`
    };
    
    const whatsappResponse = await axios.post(`${baseURL}/webhook/whatsapp`, whatsappMessage, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ WhatsApp Webhook Response:', whatsappResponse.status);
    console.log('📋 Response:', whatsappResponse.data);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: GHL Webhook (outbound message)
    console.log('\n2️⃣ Testing GHL Webhook (outbound message)...');
    
    const ghlMessage = {
      event: 'conversation.message.created',
      data: {
        message: {
          id: 'msg_test_123',
          direction: 'outbound',
          type: 'outbound',
          message: 'Thank you for your interest! Here are our premium service details...',
          contact: {
            id: 'contact_123',
            phone: '+1234567890'
          },
          conversationId: 'conv_123',
          timestamp: new Date().toISOString()
        }
      }
    };
    
    const ghlResponse = await axios.post(`${baseURL}/webhooks/ghl`, ghlMessage, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ GHL Webhook Response:', ghlResponse.status);
    console.log('📋 Response:', ghlResponse.data);
    
    // Test 3: Check if Enhanced AI Service is working
    console.log('\n3️⃣ Testing Enhanced AI Service directly...');
    
    const aiTestResponse = await axios.post(`${baseURL}/api/ai/enhanced/process`, {
      message: 'What are your business hours and contact information?',
      contactId: 'test_contact_123',
      phoneNumber: '+1234567890'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Enhanced AI Response:', aiTestResponse.status);
    console.log('🤖 AI Reply:', aiTestResponse.data);
    
    // Test 4: Test User Context Service
    console.log('\n4️⃣ Testing User Context Service...');
    
    const contextResponse = await axios.get(`${baseURL}/api/ai/context/test_contact_123`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ User Context Response:', contextResponse.status);
    console.log('👤 User Context:', JSON.stringify(contextResponse.data, null, 2));
    
    console.log('\n🎉 Complete RAG Pipeline Test Results:');
    console.log('✅ WhatsApp Webhook - Working');
    console.log('✅ GHL Webhook - Working');
    console.log('✅ Enhanced AI Service - Working');
    console.log('✅ User Context Service - Working');
    console.log('✅ RAG Pipeline - Fully Operational');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n🔍 Available endpoints check...');
      try {
        const healthCheck = await axios.get(`${baseURL}/api/whatsapp/health`);
        console.log('✅ WhatsApp API available');
      } catch (e) {
        console.log('❌ WhatsApp API not available');
      }
    }
  }
}

testCompleteRAGPipeline();