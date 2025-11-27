const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
} else {
    console.warn('Supabase credentials missing in .env');
}

/**
 * Save a message to the database
 * @param {string} phone - User's phone number
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 */
async function saveMessage(phone, role, content) {
    if (!supabase) return;

    try {
        const { error } = await supabase
            .from('messages')
            .insert([
                { phone, role, content, created_at: new Date().toISOString() }
            ]);

        if (error) {
            console.error('Error saving message to Supabase:', error.message);
        } else {
            console.log(`Saved ${role} message for ${phone}`);
        }
    } catch (err) {
        console.error('Exception saving message:', err.message);
    }
}

/**
 * Get chat history for a user
 * @param {string} phone - User's phone number
 * @param {number} limit - Number of messages to retrieve (default 6)
 * @returns {Promise<Array>} - Array of message objects {role, content}
 */
async function getChatHistory(phone, limit = 6) {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('role, content')
            .eq('phone', phone)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching chat history:', error.message);
            return [];
        }

        // Reverse to get chronological order (oldest first)
        return data.reverse();
    } catch (err) {
        console.error('Exception fetching chat history:', err.message);
        return [];
    }
}

module.exports = {
    saveMessage,
    getChatHistory
};
