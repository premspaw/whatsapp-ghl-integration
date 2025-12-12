const ghlConversations = require('./src/services/ghl/conversations');
const logger = require('./src/utils/logger');
require('./src/config/env'); // Load env vars

async function debugLastMessage() {
    try {
        console.log("🔍 Fetching recent conversations...");

        // Use a known contact ID from your logs (replace if needed, or we search)
        // From logs: Contact synced {"contactId":"yalc8lFfvw29KefXzVS2"}
        const contactId = 'yalc8lFfvw29KefXzVS2';

        const conversations = await ghlConversations.getConversationsByContact(contactId);

        if (conversations.length === 0) {
            console.log("❌ No conversations found for this contact.");
            return;
        }

        const conv = conversations[0];
        console.log(`✅ Found Conversation: ${conv.id}`);

        // Fetch messages for this conversation
        // Note: We need a method to get messages. The current service might only have getConversation.
        // I'll grab the conversation details which often include the last message.

        const fullConv = await ghlConversations.getConversation(conv.id);
        console.log("📄 Conversation Details:");
        console.log(JSON.stringify(fullConv, null, 2));

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

debugLastMessage();
