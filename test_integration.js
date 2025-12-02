const axios = require('axios');

async function testIntegration() {
    console.log("Starting Integration Test...");

    // 1. Test Inbound Flow (User -> Tachyon -> GHL App)
    console.log("\n1. Testing Inbound Flow (User -> Tachyon)...");
    try {
        const response = await axios.post('http://localhost:3000/webhook/whatsapp', {
            phone: "+919999999999",
            contactName: "Test User",
            text: "Hello from Integration Test"
        });
        console.log("Tachyon Webhook Response:", response.data);
        console.log("Check GHL App logs for 'Received Inbound Message' or similar.");
    } catch (error) {
        console.error("Error testing inbound flow:", error.message);
    }

    // 2. Test Outbound Flow (GHL -> GHL App -> Tachyon)
    console.log("\n2. Testing Outbound Flow (GHL -> GHL App -> Tachyon)...");
    try {
        const response = await axios.post('http://localhost:3001/webhooks/outbound', {
            phone: "+919999999999",
            type: "OutboundMessage",
            message: "This is a manual reply from GHL"
        });
        console.log("GHL App Webhook Response:", response.data);
        console.log("Check Tachyon logs for 'Manual Send Request'.");
    } catch (error) {
        console.error("Error testing outbound flow:", error.message);
    }
}

testIntegration();
