const { ghlTool } = require("./tools");
require("dotenv").config();

async function testGHLTool() {
    console.log("Testing GHL Tool Implementation...");

    try {
        // Test 1: Search for a contact (using a dummy number that likely won't exist, or use the one from location details if known)
        // The previous REST test showed a contact: prem@synthcore.in / +918660395136
        const phone = "+918660395136";

        console.log(`\n1. Searching for contact: ${phone}`);
        const result = await ghlTool.func({
            action: "contacts_get-contact",
            params: { phone: phone }
        });

        console.log("Result:", result);

        // Test 2: Get Pipelines
        console.log("\n2. Getting Pipelines...");
        const pipelines = await ghlTool.func({
            action: "opportunities_get-pipelines",
            params: {}
        });
        console.log("Result:", pipelines.substring(0, 200) + "..."); // Truncate for readability

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testGHLTool();
