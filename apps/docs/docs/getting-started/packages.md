---
sidebar_position: 4
---

# Grid Packages

Grid is organized as a monorepo with several packages that work together to provide a complete LLM orchestration solution.

## Core Package

### @mrck-labs/grid-core

The foundation of Grid, providing all the essential building blocks:

```bash npm2yarn
npm install @mrck-labs/grid-core
```

**Features:**
- **Agent Creation**: `createConfigurableAgent` factory for building AI agents
- **LLM Integration**: Supports OpenAI and Anthropic via Vercel AI SDK
- **Tool System**: Create and manage tools with Zod schemas
- **Conversation Primitives**: Layered architecture for conversation management
- **Event Handlers**: Hooks for persistence and customization
- **Observability**: Built-in Langfuse integration

**Example:**
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

## Tools Package

### @mrck-labs/grid-tools

A collection of ready-to-use tools for common tasks:

```bash npm2yarn
npm install @mrck-labs/grid-tools
```

**Available Tools:**
- **readUrl**: Web scraping and content extraction
- **stringUtils**: Text manipulation (uppercase, lowercase, reverse)
- **jsonFormatter**: JSON validation and formatting
- **dataConverter**: Convert between formats (JSON, CSV, XML)
- **calculator**: Mathematical calculations
- **randomNumber**: Generate random numbers
- **hash**: Create hashes (MD5, SHA256)
- **systemInfo**: Get system information
- **currentTime**: Get current time in any timezone

**Example:**
```typescript
import { calculator, readUrl, stringUtils } from "@mrck-labs/grid-tools";

const agent = createConfigurableAgent({
  // ... config
  config: {
    availableTools: [calculator, readUrl, stringUtils],
  },
});
```

## Agents Package

### @mrck-labs/grid-agents

Pre-configured agents for specific use cases:

```bash npm2yarn
npm install @mrck-labs/grid-agents
```

**Available Agents:**

### Research Agent
Specialized for information gathering and analysis:
- Tools: readUrl, stringUtils, jsonFormatter, dataConverter
- Optimized prompts for research tasks
- Structured output formatting

```typescript
import { researchAgent } from "@mrck-labs/grid-agents";

const response = await researchAgent.act(
  "Research the latest trends in renewable energy"
);
```

### Math & Data Agent
Focused on calculations and data processing:
- Tools: calculator, randomNumber, hash, systemInfo
- Mathematical reasoning capabilities
- Data transformation features

```typescript
import { mathDataAgent } from "@mrck-labs/grid-agents";

const response = await mathDataAgent.act(
  "Calculate the compound interest on $10,000 at 5% for 10 years"
);
```

### Using All Agents
```typescript
import { allAgents } from "@mrck-labs/grid-agents";

// Access agents by name
const researcher = allAgents.research;
const calculator = allAgents.mathData;
```

## Package Architecture

```
@mrck-labs/grid-core
├── Agent Factory (createConfigurableAgent)
├── LLM Services (baseLLMService)
├── Tool System (createNamedTool)
├── Conversation Primitives
│   ├── Atomic (History, Context)
│   ├── Composed (Manager)
│   └── Organism (Loop)
└── Observability (Langfuse)

@mrck-labs/grid-tools
├── Web Tools (readUrl)
├── String Tools (stringUtils)
├── Data Tools (jsonFormatter, dataConverter)
├── Math Tools (calculator, randomNumber)
├── Crypto Tools (hash)
└── System Tools (systemInfo, currentTime)

@mrck-labs/grid-agents
├── Research Agent
├── Math & Data Agent
└── Future agents...
```

## Version Compatibility

All Grid packages follow semantic versioning and are designed to work together:

| Package | Current Version | Min Core Version |
|---------|----------------|------------------|
| @mrck-labs/grid-core | 0.13.0 | - |
| @mrck-labs/grid-tools | 5.0.0 | 0.13.0 |
| @mrck-labs/grid-agents | 0.5.0 | 0.13.0 |

## Next Steps

- [Build your first agent](/docs/getting-started/quick-start)
- [Explore pre-built agents](/docs/getting-started/pre-built-agents)
- [Create custom tools](/docs/core-concepts/tools)
- [Learn about event handlers](/docs/getting-started/event-handlers)