require('dotenv').config();
const axios = require('axios');

async function testOpenRouterKey() {
    console.log('🔑 Testing OpenRouter API Key...');
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT FOUND');
    
    if (!apiKey) {
        console.log('❌ No API key found in environment');
        return;
    }
    
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'anthropic/claude-3-haiku',
            messages: [
                { role: 'user', content: 'Hello, this is a test message.' }
            ],
            max_tokens: 50
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000'
            }
        });
        
        console.log('✅ API Key is working!');
        console.log('Response:', response.data.choices[0].message.content);
        
    } catch (error) {
        console.log('❌ API Key test failed:');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data || error.message);
    }
}

testOpenRouterKey();