---
sidebar_position: 1
---

# Installation

Get Grid up and running in your project with just a few commands.

## Prerequisites

Before installing Grid, ensure you have:

- **Node.js** version 18.0 or higher
- **pnpm**, **npm**, or **yarn** package manager
- **TypeScript** 5.0 or higher (for TypeScript projects)

## Install Grid Core

Install the core Grid package using your preferred package manager:

```bash npm2yarn
npm install @mrck-labs/grid-core
```

## Install Additional Packages (Optional)

Grid offers additional packages for specific use cases:

### Pre-built Tools
```bash npm2yarn
npm install @mrck-labs/grid-tools
```

Includes ready-to-use tools like:
- Web scraping and URL reading
- String manipulation utilities
- Data conversion and formatting
- System information tools

### Pre-built Agents
```bash npm2yarn
npm install @mrck-labs/grid-agents
```

Provides specialized agents:
- Research Agent - For information gathering and analysis
- Math & Data Agent - For calculations and data processing

## LLM Provider Setup

Grid supports multiple LLM providers. You'll need to set up API keys for your chosen provider:

### OpenAI
```bash
export OPENAI_API_KEY="your-api-key-here"
```

### Anthropic
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

## TypeScript Configuration

If you're using TypeScript, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

## Verify Installation

Create a simple test file to verify Grid is installed correctly:

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

// Create a simple agent
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "test-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are a helpful assistant."
    },
    metadata: {
      id: "test-agent",
      type: "general",
      name: "Test Agent",
      description: "A simple test agent",
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

console.log("Grid is installed and ready!");
console.log("Agent created:", agent.id);
```

## Environment Variables

For production use, create a `.env` file in your project root:

```bash
# LLM Provider Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Default Model Configuration
DEFAULT_MODEL=gpt-4
DEFAULT_PROVIDER=openai

# Observability (Optional)
LANGFUSE_PUBLIC_KEY=your-langfuse-public-key
LANGFUSE_SECRET_KEY=your-langfuse-secret-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

## Next Steps

Now that Grid is installed, you're ready to:

- [Create your first agent](/docs/getting-started/quick-start)
- [Explore the core concepts](/docs/core-concepts/agents)
- [Build custom tools](/docs/core-concepts/tools)
- [Use pre-built agents](/docs/getting-started/pre-built-agents)