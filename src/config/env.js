const dotenv = require('dotenv');
const path = require('path');

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const required = [
    'PORT',
    // Add other required vars here as we migrate them
];

const config = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',

    // Database
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },

    // WhatsApp
    whatsapp: {
        useMock: process.env.USE_MOCK_WHATSAPP === 'true',
    },

    // GHL
    ghl: {
        clientId: process.env.GHL_OAUTH_CLIENT_ID,
        clientSecret: process.env.GHL_OAUTH_CLIENT_SECRET,
        redirectUri: process.env.GHL_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/callback',
        apiKey: process.env.GHL_API_KEY,
        locationId: process.env.GHL_LOCATION_ID,
    },

    // AI
    ai: {
        openRouterKey: process.env.OPENROUTER_API_KEY,
        defaultModel: process.env.AI_MODEL || 'openai/gpt-4o',
    }
};

// Validation
const missing = required.filter(key => !process.env[key] && !config[key.toLowerCase()]);
if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
}

module.exports = config;
