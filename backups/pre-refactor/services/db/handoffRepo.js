const { getSupabase } = require('./supabaseClient');

async function createHandoff({ phone, conversationRef, summary }) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('handoff_requests')
    .insert({ phone, conversation_ref: conversationRef, summary })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function listHandoffs({ status = 'open' } = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const query = supabase.from('handoff_requests').select('*').order('created_at', { ascending: false });
  if (status) query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function assignHandoff(id, agent) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('handoff_requests')
    .update({ status: 'assigned', assigned_to: agent, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function resolveHandoff(id) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('handoff_requests')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { createHandoff, listHandoffs, assignHandoff, resolveHandoff };


