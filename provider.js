const axios = require('axios');
const db = require('./ghl_db');

// Handle Outbound Webhook (Messages sent FROM GHL)
async function handleOutboundWebhook(req, res) {
    const payload = req.body;
    console.log("Received Outbound Webhook from GHL:", JSON.stringify(payload, null, 2));

    // Extract relevant details
    // Note: Payload structure depends on GHL. Assuming standard conversation webhook.
    // We need phone number and message body.
    const phone = payload.phone || payload.contact_phone;
    const message = payload.message || payload.body;

    // Check if this is an outbound message (type usually 'OutboundMessage' or direction 'outbound')
    // For now, we forward everything that has a phone and message

    if (phone && message) {
        try {
            console.log(`Forwarding outbound message to Tachyon: ${phone} - ${message}`);
            // Since we are now in the same app, we could potentially call the function directly,
            // but calling the API ensures consistent behavior with the existing flow.
            // Also, localhost:3000 is where THIS server is running.
            await axios.post('http://localhost:3000/api/send', {
                phone: phone,
                message: message
            });
        } catch (error) {
            console.error("Error forwarding to Tachyon:", error.message);
        }
    }

    res.status(200).send('OK');
}

// Send Inbound Message (Messages sent TO GHL)
async function sendInboundMessage(locationId, messageData) {
    const tokenData = db.getToken(locationId);

    if (!tokenData) {
        throw new Error(`No token found for location: ${locationId}`);
    }

    const url = 'https://services.leadconnectorhq.com/conversations/messages/inbound';

    const config = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Version': '2021-04-15',
            'Content-Type': 'application/json'
        },
        data: messageData
    };

    try {
        const response = await axios(config);
        console.log("Inbound Message Sent to GHL:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error sending inbound message:", error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    handleOutboundWebhook,
    sendInboundMessage
};
