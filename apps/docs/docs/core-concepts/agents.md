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
import { createConfigurableAgent } from "@mrck-labs/grid-core";

const agent = createConfigurableAgent({
  llmConfig: {
    model: "gpt-4",
    provider: "openai",
    temperature: 0.7,
  },
  systemPrompt: "You are a helpful assistant.",
});
```

## Agent Configuration

Agents are highly configurable through the `AgentConfig` interface:

### LLM Configuration

```typescript
interface LLMConfig {
  model: string;              // Model identifier (e.g., "gpt-4", "claude-3")
  provider: "openai" | "anthropic";
  temperature?: number;       // 0-1, controls randomness
  maxTokens?: number;        // Maximum response length
  apiKey?: string;           // Override environment variable
}
```

### System Prompts

System prompts define your agent's personality and behavior:

```typescript
const agent = createConfigurableAgent({
  systemPrompt: `You are a customer service agent for TechCorp.
    - Be professional and courteous
    - Help customers with product inquiries
    - Escalate complex issues to human agents
    - Never share internal company information`,
  // ... other config
});
```

### Tool Integration

Agents can use tools to extend their capabilities:

```typescript
const agent = createConfigurableAgent({
  tools: [searchTool, calculatorTool, emailTool],
  toolChoice: "auto",  // "auto" | "none" | "required"
  // ... other config
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

Enable real-time progress updates:

```typescript
const agent = createConfigurableAgent({
  progressConfig: {
    enabled: true,
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
  },
});
```

## Agent Patterns

### Specialized Agents

Create agents for specific domains:

```typescript
// Customer Support Agent
const supportAgent = createConfigurableAgent({
  systemPrompt: "You are a customer support specialist...",
  tools: [lookupOrder, checkInventory, createTicket],
});

// Code Review Agent
const reviewAgent = createConfigurableAgent({
  systemPrompt: "You are a senior software engineer reviewing code...",
  tools: [analyzeCode, suggestImprovements, checkSecurity],
});
```

### Multi-Model Agents

Use different models for different tasks:

```typescript
// Fast agent for simple queries
const fastAgent = createConfigurableAgent({
  llmConfig: { model: "gpt-3.5-turbo", provider: "openai" },
});

// Powerful agent for complex reasoning
const powerfulAgent = createConfigurableAgent({
  llmConfig: { model: "gpt-4", provider: "openai" },
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
  systemPrompt: `You are an autonomous research agent.
    Break down complex tasks into steps and work through them systematically.`,
  tools: [search, analyze, summarize, save],
  behaviorConfig: {
    maxIterations: 10,
    enableSelfReflection: true,
  },
});

// Run autonomously
const result = await autonomousAgent.runAutonomous({
  goal: "Research and summarize recent AI breakthroughs",
  maxIterations: 5,
});
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
- [Agent Hooks](/docs/guides/agent-hooks) - Advanced customization techniques