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

async function getRecentMessagesByContact(contactId, limit = 5) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, contact_id, direction, content, media, meta, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

module.exports = { createMessage, getRecentMessagesByContact };


