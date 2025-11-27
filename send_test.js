const axios = require("axios");

async function sendTestMessage() {
    console.log("Sending test webhook to trigger AI response...\n");

    const payload = {
        phone: "+918123133382",
        fromName: "Test Customer",
        text: "What are your prices for CRM?"
    };

    try {
        const response = await axios.post("http://localhost:3000/webhook/whatsapp", payload);
        console.log("✅ Webhook Response:", response.data);
        console.log("\n📋 Check Activity Logs in UI or server.log for AI response!");
        console.log("⏱️  Expected processing time: ~30-40 seconds");
        console.log("\n💬 The AI will:");
        console.log("  1. Search Pinecone knowledge base for pricing info");
        console.log("  2. Generate personalized response");
        console.log("  3. Save to Supabase");
        console.log("  4. Send via WhatsApp API (mock mode)");

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

sendTestMessage();
