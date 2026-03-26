#!/usr/bin/env node

/**
 * Simple webhook payload debugger
 * Shows exactly what 11za sends
 */

const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/test-webhook' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      console.log('\n' + '='.repeat(70));
      console.log('📨 WEBHOOK PAYLOAD RECEIVED');
      console.log('='.repeat(70));
      console.log(body);
      console.log('='.repeat(70) + '\n');

      try {
        const json = JSON.parse(body);
        console.log('📋 Parsed JSON:');
        console.log(JSON.stringify(json, null, 2));
        console.log('\n🔍 Available fields:');
        Object.keys(json).forEach(key => {
          console.log(`  ✓ ${key}: ${typeof json[key]}`);
        });
      } catch (e) {
        console.log('⚠️  Could not parse as JSON');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(5555, () => {
  console.log('\n🚀 Debug webhook server running on http://localhost:5555/test-webhook');
  console.log('📝 All payloads will be logged here\n');
});
