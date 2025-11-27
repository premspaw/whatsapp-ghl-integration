const axios = require("axios");

async function testWebhook() {
    const payload = {
        phone: "+918123133382",
        contactName: "Test User",
        text: "What are your pricing plans for CRM?",
    };

    try {
        console.log("Sending test webhook...");
        const response = await axios.post("http://localhost:3000/webhook/whatsapp", payload);
        console.log("Response:", response.data);
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

testWebhook();
