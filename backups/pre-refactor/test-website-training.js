const axios = require('axios');

// Test the website training functionality
async function testWebsiteTraining() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing AI Knowledge Base Website Training...\n');
  
  try {
    // Test 1: Check server status
    console.log('1. Checking server status...');
    const statusResponse = await axios.get(`${baseUrl}/api/whatsapp/status`);
    console.log('✅ Server is running:', statusResponse.data);
    
    // Test 2: Train from a simple website
    console.log('\n2. Training from website...');
    const trainingResponse = await axios.post(`${baseUrl}/api/ai/train-website`, {
      websiteUrl: 'https://example.com',
      description: 'Test website for AI training',
      category: 'test'
    });
    console.log('✅ Website training result:', trainingResponse.data);
    
    // Test 3: Get knowledge base stats
    console.log('\n3. Getting knowledge base stats...');
    const statsResponse = await axios.get(`${baseUrl}/api/knowledge/stats`);
    console.log('✅ Knowledge base stats:', statsResponse.data);
    
    // Test 4: Get all knowledge items
    console.log('\n4. Getting all knowledge items...');
    const knowledgeResponse = await axios.get(`${baseUrl}/api/ai/knowledge`);
    console.log('✅ Knowledge items count:', knowledgeResponse.data.total);
    if (knowledgeResponse.data.knowledge && knowledgeResponse.data.knowledge.length > 0) {
      console.log('Latest item:', knowledgeResponse.data.knowledge[0]);
    }
    
    // Test 5: Get training history
    console.log('\n5. Getting training history...');
    const historyResponse = await axios.get(`${baseUrl}/api/ai/training-history`);
    console.log('✅ Training history:', historyResponse.data);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

// Run the test
testWebsiteTraining();