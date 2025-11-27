const axios = require("axios");
require("dotenv").config();

async function testGHLEndpoints() {
    console.log("Testing GHL API Endpoints...");
    const baseUrl = 'https://services.leadconnectorhq.com';
    const headers = {
        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
    };
    const locationId = process.env.GHL_LOCATION_ID;

    // Helper function
    const testEndpoint = async (name, url) => {
        try {
            console.log(`\nTesting ${name}: ${url}`);
            const response = await axios.get(url, { headers });
            console.log(`✅ Success! Status: ${response.status}`);
            // console.log("Data:", JSON.stringify(response.data).substring(0, 100));
        } catch (error) {
            console.log(`❌ Failed. Status: ${error.response?.status || error.message}`);
            if (error.response?.data) {
                console.log("Error Data:", JSON.stringify(error.response.data));
            }
        }
    };

    // 1. Test Location (Known good)
    await testEndpoint("Location", `${baseUrl}/locations/${locationId}`);

    // 2. Test Contacts List (V2)
    await testEndpoint("Contacts List", `${baseUrl}/contacts/?locationId=${locationId}&limit=1`);

    // 3. Test Contacts Search (V2)
    await testEndpoint("Contacts Search", `${baseUrl}/contacts/search?locationId=${locationId}&query=prem`);

    // 4. Test Opportunities
    await testEndpoint("Opportunities", `${baseUrl}/opportunities/search?location_id=${locationId}`);

    // 5. Test Pipelines
    await testEndpoint("Pipelines", `${baseUrl}/opportunities/pipelines?locationId=${locationId}`);

    // 6. Test Users
    await testEndpoint("Users", `${baseUrl}/users/?locationId=${locationId}`);
}

testGHLEndpoints();
