import express from 'express'
import { createConfigurableAgent } from '@mrck-labs/grid-core'
import 'dotenv/config'

const app = express()
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ 
    message: 'Express Grid Agent Test Server',
    endpoints: {
      'POST /api/agent': 'Send a prompt to the agent'
    }
  })
})

app.post('/api/agent', async (req, res) => {
  try {
    const { prompt } = req.body
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    const agent = await createConfigurableAgent({
      config: {
        id: 'express-test-agent',
        type: 'general',
        prompts: {
          system: 'You are a helpful assistant running in an Express.js server.'
        },
        version: '1.0.0',
        metadata: {
          id: 'express-test-agent',
          type: 'general',
          name: 'Express Test Agent',
          description: 'Testing Grid agent in Express.js',
          capabilities: ['general'],
          icon: '🚂',
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

    res.json({
      success: true,
      response: response.content,
      agent: agent.id,
      framework: 'express'
    })
  } catch (error) {
    console.error('Error in agent API:', error)
    res.status(500).json({ error: 'Failed to process request' })
  }
})

const port = 3002
app.listen(port, () => {
  console.log(`🚂 Express server running on port ${port}`)
})