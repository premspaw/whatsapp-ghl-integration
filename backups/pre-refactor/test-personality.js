const EnhancedAIService = require('./services/enhancedAIService');

async function testPersonality() {
  console.log('🧪 Testing AI Personality Configuration');
  console.log('=====================================');
  
  const aiService = new EnhancedAIService();
  
  // Load personality from file
  await aiService.loadPersonality();
  
  console.log('\n📋 Current AI Personality:');
  console.log(JSON.stringify(aiService.getPersonality(), null, 2));
  
  console.log('\n🔍 Testing Business Name Question...');
  try {
    const response1 = await aiService.generateContextualReply(
      "What's your business name?", 
      "+1234567890", 
      "test-conversation"
    );
    console.log('✅ Response:', response1);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n🔍 Testing Website Question...');
  try {
    const response2 = await aiService.generateContextualReply(
      "What's your website?", 
      "+1234567890", 
      "test-conversation"
    );
    console.log('✅ Response:', response2);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n🔍 Testing Greeting...');
  try {
    const response3 = await aiService.generateContextualReply(
      "Hi there!", 
      "+1234567890", 
      "test-conversation"
    );
    console.log('✅ Response:', response3);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testPersonality().catch(console.error);