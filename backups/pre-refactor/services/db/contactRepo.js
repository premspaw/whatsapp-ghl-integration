const { getSupabase } = require('./supabaseClient');

async function upsertContactByPhone({ phone, name, ghlContactId = null, metadata = {} }) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const payload = {
    phone,
    name: name || null,
    ghl_contact_id: ghlContactId,
    metadata: metadata || {}
  };
  const { data, error } = await supabase
    .from('contacts')
    .upsert(payload, { onConflict: 'phone' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function findByPhone(phone) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { upsertContactByPhone, findByPhone };


