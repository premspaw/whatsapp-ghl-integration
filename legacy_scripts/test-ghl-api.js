const ghlOAuth = require('./src/services/ghl/oauth');
const axios = require('axios');

const LOCATION_ID = 'dXh04Cd8ixM9hnk1IS5b';

async function testGHLAPI() {
    console.log('🧪 Testing GHL API Connection...\n');

    try {
        // Get access token
        const accessToken = await ghlOAuth.getAccessToken(LOCATION_ID);
        console.log('✅ Access token retrieved successfully');

        // Test 1: Get Contacts
        console.log('\n📋 Test 1: Fetching contacts...');
        const contactsResponse = await axios.get(
            'https://services.leadconnectorhq.com/contacts/',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Version': '2021-07-28'
                },
                params: {
                    locationId: LOCATION_ID,
                    limit: 5
                }
            }
        );
        console.log(`✅ Found ${contactsResponse.data.contacts?.length || 0} contacts`);
        if (contactsResponse.data.contacts?.[0]) {
            console.log('   Sample contact:', {
                id: contactsResponse.data.contacts[0].id,
                name: contactsResponse.data.contacts[0].name,
                phone: contactsResponse.data.contacts[0].phone
            });
        }

        // Test 2: Get Conversations
        console.log('\n💬 Test 2: Fetching conversations...');
        const conversationsResponse = await axios.get(
            'https://services.leadconnectorhq.com/conversations/search',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Version': '2021-07-28'
                },
                params: {
                    locationId: LOCATION_ID,
                    limit: 5
                }
            }
        );
        console.log(`✅ Found ${conversationsResponse.data.conversations?.length || 0} conversations`);
        if (conversationsResponse.data.conversations?.[0]) {
            console.log('   Sample conversation:', {
                id: conversationsResponse.data.conversations[0].id,
                contactId: conversationsResponse.data.conversations[0].contactId
            });
        }

        console.log('\n🎉 All tests passed! GHL API is working correctly.');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        process.exit(1);
    }
}

// Run tests
testGHLAPI();
