---
sidebar_position: 2
---

# Quick Start

Build your first Grid application in under 5 minutes.

## Create a Simple Agent

Let's create a basic conversational agent that can answer questions:

```typescript
import { createConfigurableAgent } from "@mrck-labs/grid-core";

// Create an agent instance
const agent = createConfigurableAgent({
  llmConfig: {
    model: "gpt-4",
    provider: "openai",
  },
  systemPrompt: "You are a helpful AI assistant. Be concise and friendly.",
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
import { createConfigurableAgent, createNamedTool } from "@mrck-labs/grid-core";
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

// Create an agent with tools
const agent = createConfigurableAgent({
  llmConfig: {
    model: "gpt-4",
    provider: "openai",
  },
  systemPrompt: "You are a helpful assistant that can check the weather.",
  tools: [weatherTool],
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
const agent = createConfigurableAgent({
  llmConfig: {
    model: "gpt-4",
    provider: "openai",
  },
  progressConfig: {
    enabled: true,
    onProgress: (update) => {
      console.log(`[${update.type}] ${update.message}`);
    },
  },
});

// You'll see progress updates like:
// [thinking] Processing your request...
// [tool_execution] Running get_weather...
// [complete] Task completed successfully
```

## Add Custom Hooks

Customize agent behavior with hooks:

```typescript
const agent = createConfigurableAgent({
  llmConfig: {
    model: "gpt-4",
    provider: "openai",
  },
  customHandlers: {
    beforeAct: async (input, config) => {
      console.log(`User asked: ${input.messages[0].content}`);
      return input;
    },
    afterResponse: async (response, input) => {
      console.log(`Agent responded: ${response.content}`);
      return response;
    },
  },
});
```

## Complete Example

Here's a complete example combining everything:

```typescript
import { createConfigurableAgent, createNamedTool } from "@mrck-labs/grid-core";
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

// Configure the agent
const agent = createConfigurableAgent({
  llmConfig: {
    model: "gpt-4",
    provider: "openai",
  },
  systemPrompt: `You are a helpful math tutor. 
    Help students with calculations and explain your work.`,
  tools: [calculator],
  progressConfig: {
    enabled: true,
    onProgress: (update) => {
      console.log(`[${update.type}] ${update.message}`);
    },
  },
});

// Interactive session
async function tutorSession() {
  const questions = [
    "What is 15% of 200?",
    "If I save $50 per month, how much will I have in 2 years?",
    "What's the square root of 144?",
  ];

  for (const question of questions) {
    console.log(`\nStudent: ${question}`);
    const response = await agent.act(question);
    console.log(`Tutor: ${response.content}`);
  }
}

tutorSession();
```

## What's Next?

Congratulations! You've created your first Grid agent. To dive deeper:

- [Build a more complex agent](/docs/getting-started/first-agent)
- [Learn about the core concepts](/docs/core-concepts/agents)
- [Explore advanced features](/docs/guides/agent-hooks)
- [Set up observability](/docs/guides/langfuse-integration)