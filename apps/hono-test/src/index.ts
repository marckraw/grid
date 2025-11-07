import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { createConfigurableAgent } from '@mrck-labs/grid-core'
import 'dotenv/config'

const app = new Hono()

app.get('/', (c) => {
  return c.json({ 
    message: 'Hono Grid Agent Test Server',
    endpoints: {
      'POST /api/agent': 'Send a prompt to the agent'
    }
  })
})

app.post('/api/agent', async (c) => {
  try {
    const { prompt } = await c.req.json()
    
    if (!prompt) {
      return c.json({ error: 'Prompt is required' }, 400)
    }

    const agent = await createConfigurableAgent({
      config: {
        id: 'hono-test-agent',
        type: 'general',
        prompts: {
          system: 'You are a helpful assistant running in a Hono.js server.'
        },
        version: '1.0.0',
        metadata: {
          id: 'hono-test-agent',
          type: 'general',
          name: 'Hono Test Agent',
          description: 'Testing Grid agent in Hono.js',
          capabilities: ['general'],
          icon: '🔥',
          version: '1.0.0'
        },
        tools: {
          builtin: {},
          custom: {},
          mcp: {},
          mcpServers: [],
          agents: []
        },
        behavior: {
          maxRetries: 3,
          responseFormat: 'text' as const,
          validateResponse: false,
          emitEvents: []
        },
        orchestration: {}
      }
    })

    const response = await agent.act({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    return c.json({
      success: true,
      response: response.content,
      agent: agent.id,
      framework: 'hono'
    })
  } catch (error) {
    console.error('Error in agent API:', error)
    return c.json({ error: 'Failed to process request' }, 500)
  }
})

const port = 3001
console.log(`🔥 Hono server running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
