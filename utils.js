const axios = require("axios");

/**
 * Normalizes phone number to E.164 format
 * @param {string|number} raw 
 * @returns {string|null}
 */
function toE164(raw) {
    if (!raw && raw !== 0) return null;
    const s = raw.toString().trim();
    if (s.startsWith('+')) return s;
    const digits = s.replace(/[^\d]/g, '');
    if (digits.length === 10) return '+91' + digits;
    if (digits.length > 10) return '+' + digits;
    return null;
}

/**
 * Normalizes the incoming webhook payload to a standard format
 * @param {object} body - The request body
 * @returns {object} Normalized payload { phone, contactName, text, raw }
 */
function normalizePayload(body) {
    const i = body || {};

    const phoneRaw = i.phone || i.from || i.sender || (i.contact && i.contact.phone) || null;
    const contactName = i.fromName || i.contactName || i.name || null;
    const text = i.text || i.message || (i.body && i.body.text) || '';

    return {
        phone: toE164(phoneRaw),
        phone_raw: phoneRaw,
        contactName: contactName,
        text: text,
        raw: i
    };
}

/**
 * Formats the AI output into a WhatsApp API compatible object
 * @param {string} to - Recipient phone number
 * @param {string} message - Message text
 * @returns {object} { to, type, text: { body } }
 */
function formatWhatsAppRequest(to, message) {
    return {
        to: to,
        message: message
    };
}

/**
 * Send message via Synthcore WhatsApp API
 * @param {string} to - Recipient phone number
 * @param {string} message - Message text
 * @returns {Promise<object>} Response data
 */
async function sendWhatsAppMessage(to, message) {
    const url = process.env.SYNTHCORE_WHATSAPP_URL || 'https://api.synthcore.in/api/whatsapp/send';
    const apiKey = process.env.SYNTHCORE_API_KEY;

    // Helper to split message into chunks
    const splitMessage = (text, maxLength = 1000) => {
        if (text.length <= maxLength) return [text];

        const chunks = [];
        let current = text;

        while (current.length > 0) {
            if (current.length <= maxLength) {
                chunks.push(current);
                break;
            }

            // Find split point (newline or space)
            let splitIndex = current.lastIndexOf('\n', maxLength);
            if (splitIndex === -1) splitIndex = current.lastIndexOf(' ', maxLength);
            if (splitIndex === -1) splitIndex = maxLength; // Force split if no natural break

            chunks.push(current.substring(0, splitIndex).trim());
            current = current.substring(splitIndex).trim();
        }
        return chunks;
    };

    const chunks = splitMessage(message);
    const results = [];

    console.log(`Sending WhatsApp message to ${to} (${chunks.length} chunks)...`);

    for (const chunk of chunks) {
        if (!chunk) continue;

        const payload = formatWhatsAppRequest(to, chunk);

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            results.push(response.data);

            // Small delay between chunks to ensure order
            if (chunks.length > 1) await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error('Error sending WhatsApp chunk:', error.message);
            results.push({ success: false, error: error.message });
        }
    }

    // Return success if at least one chunk sent
    const success = results.some(r => r.success !== false);
    return { success, results };
}

module.exports = {
    toE164,
    normalizePayload,
    formatWhatsAppRequest,
    sendWhatsAppMessage
};
