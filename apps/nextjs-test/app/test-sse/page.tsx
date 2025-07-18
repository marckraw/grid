'use client';

export default function TestSSE() {
  const testSSE = async () => {
    try {
      const response = await fetch('/api/conversation', {
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
        console.error('Response not ok:', response.status);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      console.log('Starting to read SSE stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream done');
          break;
        }

        const chunk = decoder.decode(value);
        console.log('Raw chunk:', chunk);

        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const event = JSON.parse(data);
                console.log('Parsed event:', event);
              } catch (e) {
                console.error('Failed to parse:', data, e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>SSE Test</h1>
      <button 
        onClick={testSSE}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Test SSE Endpoint
      </button>
      <p>Check the browser console for output</p>
    </div>
  );
}