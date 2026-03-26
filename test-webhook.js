#!/usr/bin/env node

/**
 * Test 11za Webhook Locally
 * Run: node test-webhook.js
 */

const http = require('http');

// Simulate different 11za payload formats
const testPayloads = [
  {
    name: "Format 1: Standard 11za format",
    payload: {
      from: "918866548369",
      text: "Show me spicy food for 2 people",
      messageId: "wamid.HBgMOTE4ODY2NTQ4MzY5FQIAEhggQUM0NTdGQzBCRjdGM0ZGODg1RjVBQjA4QzYxMzcwNTQA",
      timestamp: Date.now(),
      type: "text"
    }
  },
  {
    name: "Format 2: Alternative field names",
    payload: {
      from: "918866548369",
      body: "Butter chicken ki price bataao",
      wamid: "wamid.HBgMOTE4ODY2NTQ4MzY5FQIAEhggQUM0NTdGQzBCRjdGM0ZGODg1RjVBQjA4QzYxMzcwNTQA"
    }
  },
  {
    name: "Format 3: Message field",
    payload: {
      from: "918866548369",
      message: "Order ek butter chicken",
      id: "msg_12345"
    }
  },
  {
    name: "Format 4: Missing text (the problem case)",
    payload: {
      from: "918866548369",
      messageId: "wamid.HBgMOTE4ODY2NTQ4MzY5FQIAEhggQUM0NTdGQzBCRjdGM0ZGODg1RjVBQjA4QzYxMzcwNTQA"
    }
  }
];

async function testWebhook(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/webhook/11za',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data,
        });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 Testing 11za Webhook Formats\n');
  console.log('⚠️  Make sure: npm run dev is running on localhost:3000\n');
  console.log('='.repeat(60));

  for (const test of testPayloads) {
    console.log(`\n📨 ${test.name}`);
    console.log('-'.repeat(60));
    console.log('📤 Sending:', JSON.stringify(test.payload, null, 2));

    try {
      const result = await testWebhook(test.payload);
      console.log('📥 Response Status:', result.status);
      console.log('📥 Response Body:', result.body);
      console.log('✅ Success\n');
    } catch (error) {
      console.log('❌ Error:', error.message, '\n');
    }

    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('='.repeat(60));
  console.log('\n📋 Server logs (check terminal where npm run dev is running)');
  console.log('Look for: "11za webhook received"');
  console.log('\n');
}

runTests().catch(console.error);
