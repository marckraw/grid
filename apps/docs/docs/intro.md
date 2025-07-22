---
sidebar_position: 1
---

# Grid Overview

**Grid** is a powerful TypeScript library for building LLM-powered applications with a focus on **agentic workflows**, **observability**, and **developer experience**.

## What is Grid?

Grid provides a comprehensive framework for orchestrating Large Language Model (LLM) interactions, enabling you to build sophisticated AI agents that can:

- 🤖 **Execute complex tasks** with tool-calling capabilities
- 🔄 **Run autonomously** with configurable iteration limits and state management
- 📊 **Track everything** with built-in observability via Langfuse
- 🎯 **Stay flexible** with an extensive hook system for customizing behavior
- 🚀 **Stream progress** in real-time for responsive user experiences
- 💾 **Persist conversations** with event-based hooks for any database

## Key Features

### 🏗️ Layered Architecture
Grid's architecture follows a clear hierarchy from atomic services to complex orchestration:

- **Atomic Level**: Core building blocks (history, context, tool execution)
- **Composed Level**: Combined services (conversation management)
- **Organism Level**: Full conversation flows and autonomous agents

### 🛠️ Powerful Tool System
Create tools that seamlessly integrate with your agents:

```typescript
const tool = createNamedTool({
  name: "calculator",
  description: "Perform calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression to evaluate")
  }),
  execute: async ({ expression }) => {
    return eval(expression).toString();
  }
});
```

### 🎨 Extensive Customization
Configure every aspect of your agents:

- System prompts and behavior settings
- Tool configurations (custom, MCP, built-in)
- Lifecycle hooks for complete control
- Retry logic and validation

### 📈 Production-Ready Observability
Monitor your AI applications with comprehensive tracing:

- Token usage and cost tracking
- Latency monitoring
- Error tracking and debugging
- Session grouping and visualization

## Why Grid?

Grid is designed for developers who need:

1. **Production-grade infrastructure** for AI applications
2. **Fine-grained control** over agent behavior
3. **Comprehensive monitoring** and debugging capabilities
4. **Flexibility** to integrate with multiple LLM providers
5. **Modern developer experience** with TypeScript and excellent tooling
6. **Event-driven architecture** for seamless database integration
7. **Pre-built components** for rapid development

## Quick Example

Here's a simple example of creating an agent with Grid:

```typescript
import { createConfigurableAgent, baseLLMService } from "@mrck-labs/grid-core";
import { calculator } from "@mrck-labs/grid-tools";

const agent = createConfigurableAgent({
  llmService: baseLLMService({
    model: "gpt-4",
    apiKey: process.env.OPENAI_API_KEY,
  }),
  config: {
    id: "math-assistant",
    type: "general",
    systemPrompt: "You are a helpful assistant with calculation abilities.",
    availableTools: [calculator],
  },
});

const response = await agent.act("What's 2 + 2?");
console.log(response.content);
```

## What's Next?

Ready to build your first Grid application? Check out our [Getting Started](/docs/getting-started/installation) guide to begin your journey with Grid!
