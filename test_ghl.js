const axios = require("axios");
require("dotenv").config();

async function testGHL() {
    console.log("Testing GoHighLevel MCP...");
    console.log("API Key:", process.env.GHL_API_KEY ? "Set" : "Missing");
    console.log("Location ID:", process.env.GHL_LOCATION_ID);

    try {
        // Test getting pipelines first (doesn't require contactId)
        const response = await axios.post(
            process.env.GHL_MCP_ENDPOINT || 'https://services.leadconnectorhq.com/mcp/',
            {
                jsonrpc: "2.0",
                id: 1,
                method: 'tools/call',
                params: {
                    name: 'opportunities_get-pipelines',
                    arguments: {
                        locationId: process.env.GHL_LOCATION_ID
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream'
                }
            }
        );

        console.log("Success! Response:");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

testGHL();
