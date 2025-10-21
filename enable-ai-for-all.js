const ConversationManager = require('./services/conversationManager');

async function enableAIForAllConversations() {
  try {
    console.log('🤖 Enabling AI for all existing conversations...');
    
    const conversationManager = new ConversationManager();
    await conversationManager.loadConversations();
    
    const conversations = conversationManager.conversations;
    let updatedCount = 0;
    
    for (const [id, conversation] of conversations) {
      if (!conversation.aiEnabled) {
        console.log(`🤖 Enabling AI for conversation: ${conversation.id}`);
        conversation.aiEnabled = true;
        await conversationManager.updateConversation(conversation);
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} conversations to enable AI`);
    console.log('🎉 All conversations now have AI enabled!');
    
  } catch (error) {
    console.error('❌ Error enabling AI:', error.message);
  }
}

enableAIForAllConversations();
