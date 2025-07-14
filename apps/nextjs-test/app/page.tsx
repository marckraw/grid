'use client'

import { useState } from 'react'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      setResponse(data.response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Grid Agent Test - Next.js API Route</h1>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="prompt" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Enter your prompt:
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.5rem',
              fontSize: '16px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
            placeholder="Ask the agent something..."
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Processing...' : 'Send to Agent'}
        </button>
      </form>

      {error && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#fee',
          color: '#c00',
          borderRadius: '4px'
        }}>
          Error: {error}
        </div>
      )}

      {response && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px'
        }}>
          <h3>Agent Response:</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{response}</p>
        </div>
      )}
    </main>
  )
}