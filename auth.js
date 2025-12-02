const axios = require('axios');
const qs = require('qs');
const db = require('./ghl_db');
require('dotenv').config();

const GHL_AUTH_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation';
const GHL_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

function authorize(req, res) {
    const scopes = [
        'conversations.readonly',
        'conversations.write',
        'users.readonly',
        'contacts.readonly',
        'contacts.write'
    ].join(' ');

    const redirectUri = `${process.env.App_Url}/oauth/callback`;

    const authUrl = `${GHL_AUTH_URL}?response_type=code&redirect_uri=${redirectUri}&client_id=${process.env.Client_Id}&scope=${scopes}`;

    res.redirect(authUrl);
}

async function callback(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('No code provided');
    }

    try {
        const data = qs.stringify({
            'client_id': process.env.Client_Id,
            'client_secret': process.env.Client_Secret,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': `${process.env.App_Url}/oauth/callback`
        });

        const config = {
            method: 'post',
            url: GHL_TOKEN_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        };

        const response = await axios(config);
        const { access_token, refresh_token, locationId, userType } = response.data;

        db.saveToken(locationId, response.data);

        res.send(`<h1>Installation Successful!</h1><p>Location ID: ${locationId}</p><p>You can close this window.</p>`);

    } catch (error) {
        console.error('Error in callback:', error.response ? error.response.data : error.message);
        res.status(500).send('Error during authentication');
    }
}

module.exports = {
    authorize,
    callback
};
