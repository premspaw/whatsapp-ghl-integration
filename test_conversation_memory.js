const axios = require("axios");

// Send two messages to test conversation continuity
async function testConversationMemory() {
    console.log("Testing conversation memory...\n");

    // Message 1: Ask about pricing
    console.log("=== Message 1: Asking about pricing ===");
    const msg1 = await axios.post("http://localhost:3000/webhook/whatsapp", {
        phone: "+918123133382",
        fromName: "Test User",
        text: "What are your pricing plans?"
    });
    console.log("Response 1:", msg1.data);

    // Wait for AI to process
    console.log("\nWaiting 30 seconds for AI to respond...\n");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Message 2: Follow-up referencing previous context
    console.log("=== Message 2: Follow-up question ===");
    const msg2 = await axios.post("http://localhost:3000/webhook/whatsapp", {
        phone: "+918123133382",
        fromName: "Test User",
        text: "Can you tell me more about the basic plan you just mentioned?"
    });
    console.log("Response 2:", msg2.data);

    console.log("\nCheck server.log to see if AI referenced previous conversation!");
}

testConversationMemory().catch(console.error);
