const axios = require("axios");
require("dotenv").config();

async function testGHLRest() {
    console.log("Testing GoHighLevel REST API...");
    console.log("API Key:", process.env.GHL_API_KEY ? "Set" : "Missing");
    console.log("Location ID:", process.env.GHL_LOCATION_ID);

    const locationId = process.env.GHL_LOCATION_ID;

    try {
        // Test getting location details using standard V2 API
        const response = await axios.get(
            `https://services.leadconnectorhq.com/locations/${locationId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
                    'Version': '2021-07-28',
                    'Accept': 'application/json'
                }
            }
        );

        console.log("Success! REST API is working.");
        console.log("Location Name:", response.data.location ? response.data.location.name : "Unknown");
        console.log("Full Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

testGHLRest();
