// Test SSE endpoint
const fetch = require('node-fetch');

async function testSSE() {
  try {
    const response = await fetch('http://localhost:3001/api/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is 2 + 2?',
        sessionId: 'test-' + Date.now(),
      }),
    });

    if (!response.ok) {
      console.error('Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const reader = response.body;
    const decoder = new TextDecoder();

    console.log('Starting to read SSE stream...');
    
    for await (const chunk of reader) {
      const text = decoder.decode(chunk, { stream: true });
      console.log('Received:', text);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSSE();