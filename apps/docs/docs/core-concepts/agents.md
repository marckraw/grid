---
sidebar_position: 1
---

# Agents

Agents are the core building blocks of Grid applications. They combine language models, tools, and custom logic to create intelligent systems that can understand, reason, and act.

## What is an Agent?

In Grid, an agent is an intelligent entity that:

- **Processes natural language** inputs from users
- **Reasons** about the best way to respond
- **Uses tools** to perform actions and gather information
- **Maintains context** throughout conversations
- **Follows configured behaviors** and system prompts

## Creating Agents

Grid provides the `createConfigurableAgent` factory function for creating agents:

```typescript
import { 
  createConfigurableAgent, 
  baseLLMService,
  createToolExecutor 
} from "@mrck-labs/grid-core";

// Create services
const llmService = baseLLMService({
  langfuse: { enabled: false }
});
const toolExecutor = createToolExecutor();

// Create a basic agent
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "my-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are a helpful assistant."
    },
    metadata: {
      id: "my-agent",
      type: "general",
      name: "My Agent",
      description: "A helpful assistant",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});
```

## Agent Configuration

Agents are highly configurable through the `AgentConfig` interface:

### LLM Service Configuration

Agents use the `baseLLMService` to configure LLM interactions:

```typescript
// Configure the LLM service
const llmService = baseLLMService({
  // Model configuration is handled by environment variables
  // or can be passed when calling agent.act()
  langfuse: { enabled: true } // Enable observability
});

const toolExecutor = createToolExecutor();

const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: { /* agent config */ },
});
```

### System Prompts

System prompts define your agent's personality and behavior:

```typescript
const agent = createConfigurableAgent({
  llmService: baseLLMService({ /* ... */ }),
  toolExecutor: createToolExecutor(),
  config: {
    id: "customer-service",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: `You are a customer service agent for TechCorp.
      - Be professional and courteous
      - Help customers with product inquiries
      - Escalate complex issues to human agents
      - Never share internal company information`
    },
    metadata: {
      id: "customer-service",
      type: "general",
      name: "Customer Service Agent",
      description: "Handles customer inquiries",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});
```

### Tool Integration

Agents can use tools to extend their capabilities:

```typescript
const agent = createConfigurableAgent({
  llmService: baseLLMService({ /* ... */ }),
  toolExecutor: createToolExecutor(),
  config: {
    id: "tool-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are an AI assistant with access to various tools."
    },
    metadata: {
      id: "tool-agent",
      type: "general",
      name: "Tool Agent",
      description: "Agent with tool capabilities",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [searchTool, calculatorTool, emailTool],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});
```

## Agent Lifecycle

Understanding the agent lifecycle helps you build robust applications:

### 1. Input Processing
When you call `agent.act()`, the agent:
- Receives the user input
- Applies any input transformations
- Validates the input

### 2. LLM Interaction
The agent:
- Sends the processed input to the LLM
- Receives the response
- Parses any tool calls

### 3. Tool Execution
If tools are called:
- Validates tool parameters
- Executes tools in sequence or parallel
- Collects tool results

### 4. Response Generation
The agent:
- Processes tool results
- Generates final response
- Applies output transformations

### 5. Error Handling
Throughout the lifecycle:
- Errors are caught and handled
- Retry logic is applied if configured
- Custom error handlers are invoked

## Advanced Features

### Custom Handlers (Hooks)

Customize agent behavior at key points:

```typescript
const agent = createConfigurableAgent({
  customHandlers: {
    // Transform input before processing
    transformInput: async (input) => {
      console.log("User input:", input.messages[0].content);
      return input;
    },
    
    // Validate responses
    validateResponse: async (response) => {
      if (response.content.includes("ERROR")) {
        return { isValid: false, reason: "Response contains error" };
      }
      return { isValid: true };
    },
    
    // Handle errors with retry logic
    onError: async (error, attempt) => {
      if (attempt < 3) {
        return { shouldRetry: true, delayMs: 1000 * attempt };
      }
    },
  },
});
```

### Behavior Configuration

Fine-tune agent behavior:

```typescript
const agent = createConfigurableAgent({
  behaviorConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    continueOnError: false,
    parallelToolExecution: true,
    requireExplicitToolCalls: false,
  },
});
```

### Progress Tracking

Progress tracking is handled at the conversation level, not the agent level:

```typescript
import { createConversationLoop } from "@mrck-labs/grid-core";

// Create conversation with progress tracking
const conversation = createConversationLoop({
  agent,
  onProgress: (update) => {
    switch (update.type) {
      case "thinking":
        console.log("🤔 Agent is thinking...");
        break;
      case "tool_execution":
        console.log(`🔧 Running ${update.toolName}...`);
        break;
      case "error":
        console.log(`❌ Error: ${update.message}`);
        break;
    }
  },
});
```

## Agent Patterns

### Specialized Agents

Create agents for specific domains:

```typescript
import { researchAgent, mathDataAgent } from "@mrck-labs/grid-agents";

// Use pre-built agents
const researcher = researchAgent;
const calculator = mathDataAgent;

// Or create custom specialized agents
const supportAgent = createConfigurableAgent({
  llmService: baseLLMService({ langfuse: { enabled: true } }),
  toolExecutor: createToolExecutor(),
  config: {
    id: "support-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are a customer support specialist..."
    },
    metadata: {
      id: "support-agent",
      type: "general",
      name: "Support Agent",
      description: "Customer support specialist",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [lookupOrder, checkInventory, createTicket],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});
```

### Multi-Model Agents

Use different models for different tasks:

```typescript
// Fast agent for simple queries
const fastAgent = createConfigurableAgent({
  llmService: baseLLMService({ 
    model: "gpt-3.5-turbo",
    apiKey: process.env.OPENAI_API_KEY,
  }),
  config: {
    id: "fast-agent",
    type: "general",
  },
});

// Powerful agent for complex reasoning
const powerfulAgent = createConfigurableAgent({
  llmService: baseLLMService({ 
    model: "gpt-4",
    apiKey: process.env.OPENAI_API_KEY,
  }),
  config: {
    id: "powerful-agent",
    type: "general",
  },
});

// Router logic
async function handleQuery(query: string) {
  const complexity = assessComplexity(query);
  const agent = complexity > 0.7 ? powerfulAgent : fastAgent;
  return agent.act(query);
}
```

### Autonomous Agents

Create agents that can work independently:

```typescript
const autonomousAgent = createConfigurableAgent({
  llmService: baseLLMService({ langfuse: { enabled: true } }),
  toolExecutor: createToolExecutor(),
  config: {
    id: "autonomous-researcher",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: `You are an autonomous research agent.
      Break down complex tasks into steps and work through them systematically.`
    },
    metadata: {
      id: "autonomous-researcher",
      type: "general",
      name: "Autonomous Researcher",
      description: "Autonomous research agent",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [search, analyze, summarize, save],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});

// Run with conversation loop for autonomous behavior
import { createConversationLoop } from "@mrck-labs/grid-core";

const loop = createConversationLoop({
  agent: autonomousAgent,
});

const result = await loop.sendMessage(
  "Research and summarize recent AI breakthroughs"
);
```

## Best Practices

### 1. Clear System Prompts
- Be specific about the agent's role
- Define boundaries and limitations
- Include examples when helpful

### 2. Tool Selection
- Only include necessary tools
- Ensure tool descriptions are clear
- Test tool combinations thoroughly

### 3. Error Handling
- Always implement error handlers
- Provide meaningful error messages
- Log errors for debugging

### 4. Performance
- Use appropriate models for tasks
- Cache responses when possible
- Monitor token usage

### 5. Security
- Validate all inputs
- Limit tool permissions
- Never expose sensitive data

## Next Steps

Now that you understand agents, explore:

- [Tools](/docs/core-concepts/tools) - Extend agent capabilities
- [Services Architecture](/docs/core-concepts/services-architecture) - Understand the underlying systems
- [Event Handlers](/docs/getting-started/event-handlers) - Implement persistence with events
- [Pre-built Agents](/docs/getting-started/pre-built-agents) - Use ready-made agents