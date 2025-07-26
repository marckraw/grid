---
sidebar_position: 2
---

# Quick Start

Build your first Grid application in under 5 minutes.

## Create a Simple Agent

Let's create a basic conversational agent that can answer questions:

```typescript
import { 
  createConfigurableAgent,
  baseLLMService,
  createToolExecutor 
} from "@mrck-labs/grid-core";

// Create the LLM service
const llmService = baseLLMService({
  langfuse: { enabled: false }
});

// Create a tool executor
const toolExecutor = createToolExecutor();

// Create an agent instance
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "simple-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are a helpful AI assistant. Be concise and friendly."
    },
    metadata: {
      id: "simple-agent",
      type: "general",
      name: "Simple Agent",
      description: "A basic conversational agent",
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

// Use the agent
async function main() {
  const response = await agent.act("What is the capital of France?");
  console.log(response.content);
}

main();
```

## Add Tools to Your Agent

Make your agent more capable by adding tools:

```typescript
import { 
  createConfigurableAgent, 
  createNamedTool,
  baseLLMService,
  createToolExecutor 
} from "@mrck-labs/grid-core";
import { z } from "zod";

// Define a weather tool
const weatherTool = createNamedTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("The city and country"),
  }),
  execute: async ({ location }) => {
    // In a real app, you'd call a weather API here
    return `The weather in ${location} is sunny and 72°F`;
  },
});

// Create services
const llmService = baseLLMService({
  langfuse: { enabled: false }
});
const toolExecutor = createToolExecutor();

// Create an agent with tools
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "weather-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are a helpful assistant that can check the weather."
    },
    metadata: {
      id: "weather-agent",
      type: "general",
      name: "Weather Agent",
      description: "An agent that can check weather",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [weatherTool],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});

// The agent will automatically use tools when needed
async function main() {
  const response = await agent.act("What's the weather like in Paris, France?");
  console.log(response.content);
  // Output: "The weather in Paris, France is sunny and 72°F"
}
```

## Enable Progress Streaming

Get real-time updates as your agent works:

```typescript
// Progress is handled at the conversation level when using createConversationLoop
// See the complete example below for full implementation
```

## Add Custom Hooks

Customize agent behavior with hooks:

```typescript
import { 
  createConfigurableAgent,
  baseLLMService,
  createToolExecutor 
} from "@mrck-labs/grid-core";

const llmService = baseLLMService({
  langfuse: { enabled: false }
});
const toolExecutor = createToolExecutor();

const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "hooked-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are a helpful assistant."
    },
    metadata: {
      id: "hooked-agent",
      type: "general",
      name: "Hooked Agent",
      description: "An agent with custom hooks",
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
  },
  customHandlers: {
    beforeAct: async (input, config) => {
      console.log(`User asked: ${input.messages[0].content}`);
      return input;
    },
    afterResponse: async (response, input) => {
      console.log(`Agent responded: ${response.content}`);
      return response;
    }
  }
});
```

## Complete Example

Here's a complete example combining everything:

```typescript
import { 
  createConfigurableAgent, 
  createNamedTool,
  baseLLMService,
  createToolExecutor,
  createConversationLoop
} from "@mrck-labs/grid-core";
import { z } from "zod";

// Create a calculation tool
const calculator = createNamedTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression to evaluate"),
  }),
  execute: async ({ expression }) => {
    try {
      // Note: In production, use a proper math parser
      const result = eval(expression);
      return `${expression} = ${result}`;
    } catch (error) {
      return `Error: Invalid expression`;
    }
  },
});

// Create services
const llmService = baseLLMService({
  langfuse: { enabled: false }
});
const toolExecutor = createToolExecutor();

// Configure the agent
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "math-tutor",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: `You are a helpful math tutor. 
        Help students with calculations and explain your work.`
    },
    metadata: {
      id: "math-tutor",
      type: "general",
      name: "Math Tutor",
      description: "A helpful math tutor agent",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [calculator],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});

// Interactive session with conversation loop for better context management
async function tutorSession() {
  const questions = [
    "What is 15% of 200?",
    "If I save $50 per month, how much will I have in 2 years?",
    "What's the square root of 144?",
  ];

  // Create conversation loop for progress tracking
  const conversation = createConversationLoop({
    agent,
    progressHandlers: {
      onProgress: async (update) => {
        console.log(`[${update.type}] ${update.message}`);
      }
    }
  });

  for (const question of questions) {
    console.log(`\nStudent: ${question}`);
    const response = await conversation.sendMessage(question);
    console.log(`Tutor: ${response.content}`);
  }

  // Clean up
  await conversation.end();
}

tutorSession();
```

## What's Next?

Congratulations! You've created your first Grid agent. To dive deeper:

- [Build a more complex agent](/docs/getting-started/first-agent)
- [Learn about the core concepts](/docs/core-concepts/agents)
- [Explore advanced features](/docs/guides/agent-hooks)
- [Set up observability](/docs/guides/langfuse-integration)