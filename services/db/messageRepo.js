const { getSupabase } = require('./supabaseClient');

async function createMessage({ conversationId, contactId, direction, providerMessageId, content, media = [], meta = {} }) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const payload = {
    conversation_id: conversationId,
    contact_id: contactId,
    direction,
    provider_message_id: providerMessageId || null,
    content,
    media,
    meta
  };
  const { data, error } = await supabase
    .from('messages')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { createMessage };


