const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');

class OpenRouterSetup {
    constructor() {
        this.envPath = path.join(__dirname, '.env');
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async setup() {
        console.log('🚀 OpenRouter API Setup');
        console.log('========================');
        console.log('');
        console.log('This will help you configure OpenRouter API for AI responses.');
        console.log('You can get your API key from: https://openrouter.ai/keys');
        console.log('');

        try {
            // Check if .env exists
            if (!fs.existsSync(this.envPath)) {
                console.log('📝 Creating .env file...');
                fs.writeFileSync(this.envPath, '# Environment Variables\n');
            }

            // Get API key
            const apiKey = await this.getApiKey();
            
            // Test the API key
            console.log('🔍 Testing API key...');
            const isValid = await this.testApiKey(apiKey);
            
            if (!isValid) {
                console.log('❌ Invalid API key. Please check and try again.');
                this.rl.close();
                return;
            }

            // Get model preference
            const model = await this.getModelPreference();

            // Update .env file
            await this.updateEnvFile(apiKey, model);

            console.log('');
            console.log('✅ OpenRouter API configured successfully!');
            console.log('');
            console.log('Configuration:');
            console.log(`  API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
            console.log(`  Model: ${model}`);
            console.log('');
            console.log('🔄 Restart your server to apply changes:');
            console.log('  pm2 restart ghl-whatsapp');
            console.log('');

        } catch (error) {
            console.error('❌ Setup failed:', error.message);
        } finally {
            this.rl.close();
        }
    }

    async getApiKey() {
        return new Promise((resolve) => {
            this.rl.question('Enter your OpenRouter API key: ', (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async getModelPreference() {
        console.log('');
        console.log('Available models:');
        console.log('1. gpt-4o-mini (Fast, cost-effective)');
        console.log('2. gpt-4o (More capable, higher cost)');
        console.log('3. claude-3-haiku (Anthropic, fast)');
        console.log('4. claude-3-sonnet (Anthropic, balanced)');
        console.log('5. Custom model');
        console.log('');

        return new Promise((resolve) => {
            this.rl.question('Choose model (1-5) [default: 1]: ', (answer) => {
                const choice = answer.trim() || '1';
                
                switch (choice) {
                    case '1':
                        resolve('openai/gpt-4o-mini');
                        break;
                    case '2':
                        resolve('openai/gpt-4o');
                        break;
                    case '3':
                        resolve('anthropic/claude-3-haiku');
                        break;
                    case '4':
                        resolve('anthropic/claude-3-sonnet');
                        break;
                    case '5':
                        this.rl.question('Enter custom model name: ', (customModel) => {
                            resolve(customModel.trim());
                        });
                        break;
                    default:
                        resolve('openai/gpt-4o-mini');
                }
            });
        });
    }

    async testApiKey(apiKey) {
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'openai/gpt-4o-mini',
                messages: [
                    { role: 'user', content: 'Hello, this is a test message.' }
                ],
                max_tokens: 10
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return response.status === 200;
        } catch (error) {
            console.log('❌ API key test failed:', error.response?.data?.error?.message || error.message);
            return false;
        }
    }

    async updateEnvFile(apiKey, model) {
        let envContent = '';
        
        if (fs.existsSync(this.envPath)) {
            envContent = fs.readFileSync(this.envPath, 'utf8');
        }

        // Update or add OpenRouter configuration
        const updates = {
            'OPENROUTER_API_KEY': apiKey,
            'OPENROUTER_MODEL': model,
            'AI_SERVICE': 'openrouter'
        };

        for (const [key, value] of Object.entries(updates)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        }

        fs.writeFileSync(this.envPath, envContent);
        console.log('📝 Updated .env file');
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new OpenRouterSetup();
    setup.setup();
}

module.exports = OpenRouterSetup;