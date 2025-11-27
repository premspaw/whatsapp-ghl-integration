const axios = require("axios");
require("dotenv").config();

async function testPinecone() {
    console.log("Testing Pinecone MCP Assistant...");
    console.log("API Key:", process.env.PINECONE_API_KEY ? "Set" : "Missing");

    try {
        const response = await axios.post(
            'https://prod-1-data.ke.pinecone.io/mcp/assistants/whatappdemo',
            {
                jsonrpc: "2.0",
                id: 1,
                method: 'tools/call',
                params: {
                    name: 'get_context',
                    arguments: {
                        query: 'What are your pricing plans?'
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PINECONE_API_KEY}`,
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

testPinecone();
