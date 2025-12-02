const { getSupabase } = require('./supabaseClient');

async function upsertConversation({ contactId, channel = 'whatsapp' }) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const payload = {
    contact_id: contactId,
    channel
  };
  const { data, error } = await supabase
    .from('conversations')
    .upsert(payload)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function touchLastMessageAt(conversationId) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { upsertConversation, touchLastMessageAt };


