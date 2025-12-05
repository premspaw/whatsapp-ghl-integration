#!/usr/bin/env node

/**
 * Test all endpoints to verify they're working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Testing all endpoints...\n');

  const tests = [
    {
      name: 'Mock WhatsApp Test',
      url: '/api/mock/test',
      expected: 'success'
    },
    {
      name: 'Mock Contacts',
      url: '/api/mock/contacts',
      expected: 'array'
    },
    {
      name: 'Debug Services',
      url: '/api/debug/services',
      expected: 'object'
    },
    {
      name: 'GHL Contacts (may fail)',
      url: '/api/ghl/contacts',
      expected: 'any'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const response = await axios.get(`${BASE_URL}${test.url}`);
      
      if (test.expected === 'array' && Array.isArray(response.data)) {
        console.log(`✅ ${test.name}: OK (${response.data.length} items)`);
      } else if (test.expected === 'object' && typeof response.data === 'object') {
        console.log(`✅ ${test.name}: OK`);
      } else if (test.expected === 'success' && response.data.success) {
        console.log(`✅ ${test.name}: OK`);
      } else if (test.expected === 'any') {
        console.log(`✅ ${test.name}: OK (${response.status})`);
      } else {
        console.log(`⚠️  ${test.name}: Unexpected response format`);
      }
    } catch (error) {
      if (test.name.includes('GHL') && error.response?.status === 500) {
        console.log(`⚠️  ${test.name}: Expected failure (GHL not configured)`);
      } else {
        console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
      }
    }
  }

  console.log('\n🎯 Test Summary:');
  console.log('- Mock WhatsApp: Should work');
  console.log('- Mock Contacts: Should return array');
  console.log('- Debug Services: Should show service status');
  console.log('- GHL Contacts: May fail if not configured');
  console.log('\n💡 If all tests pass, the mock-test.html should work!');
}

testEndpoints().catch(console.error);
