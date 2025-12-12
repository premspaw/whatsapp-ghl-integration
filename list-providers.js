const axios = require('axios');
const ghlOAuth = require('./src/services/ghl/oauth');
const logger = require('./src/utils/logger');
require('./src/config/env');

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

async function listProviders() {
    try {
        const locationId = process.env.GHL_LOCATION_ID || 'dXh04Cd8ixM9hnk1IS5b';
        console.log(`🔍 Listing providers for Location: ${locationId}`);

        const accessToken = await ghlOAuth.getAccessToken(locationId);

        // Try to fetch conversation providers (undocumented but standard usually)
        // Or search for config

        const config = {
            method: 'GET',
            url: `${GHL_API_BASE}/conversations/providers`, // Guessing endpoint, or we check /conversations/search params
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': API_VERSION,
                'Content-Type': 'application/json'
            },
            params: { locationId }
        };

        // Note: There isn't a public endpoint to list conversation providers easily in V2 
        // without a specific scope or endpoint knowledge.
        // However, we can try to inspect the 'conversation' object more deeply 
        // or just try to use the ID from the manual message again but ensuring it's not a typo.

        // Let's rely on the previous log:
        // "lastMessageConversationProviderId":"69306e4ed1e0a0573cdc2207"

        console.log("ℹ️ Verify if '69306e4ed1e0a0573cdc2207' is strictly valid hex/mongo ID.");

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
    }
}

// Just a dummy script for now since we can't easily valid provider list via API V2 public docs
console.log("Use the ID found in GHL UI URL when you edit the Custom Provider?");
