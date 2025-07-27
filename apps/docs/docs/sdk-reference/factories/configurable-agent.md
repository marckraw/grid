---
sidebar_position: 1
---

# createConfigurableAgent

Creates a highly customizable agent with extensive configuration options and lifecycle hooks.

## Overview

`createConfigurableAgent` is the primary factory function for creating agents in Grid. It provides a comprehensive configuration system with support for custom prompts, tools, behavior settings, and lifecycle hooks that allow fine-grained control over agent execution.

## Import

```typescript
import { createConfigurableAgent } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createConfigurableAgent(options: CreateConfigurableAgentOptions): Agent
```

## Parameters

### options
- **Type**: `CreateConfigurableAgentOptions`
- **Required Properties**:
  - `llmService`: LLMService instance (created with `baseLLMService`)
  - `toolExecutor`: ToolExecutor instance (created with `createToolExecutor`)
  - `config`: Agent configuration object
- **Optional Properties**:
  - `customHandlers`: Lifecycle hooks for customizing behavior

### config
- **Type**: `AgentConfig`
- **Required Properties**:
  - `id`: Unique identifier for the agent
  - `type`: Agent type (e.g., "general", "research", "support")
  - `version`: Configuration version
  - `prompts`: Prompt configuration
    - `system`: System prompt defining agent behavior
  - `metadata`: Agent metadata
    - `id`: Agent ID (usually same as config.id)
    - `type`: Agent type
    - `name`: Human-readable name
    - `description`: Agent description
    - `capabilities`: Array of capability strings
    - `version`: Metadata version
- **Optional Properties**:
  - `tools`: Tool configuration
    - `builtin`: Array of built-in tools
    - `custom`: Array of custom tools
    - `mcp`: Array of MCP tools
  - `behavior`: Behavior configuration
    - `maxRetries`: Maximum retry attempts (default: 3)
    - `responseFormat`: "text" or "json_object"
    - `temperature`: LLM temperature (0-2)
    - `maxTokens`: Maximum response tokens
  - `orchestration`: Orchestration settings
    - `mode`: "autonomous" | "guided" | "hybrid"
    - `maxIterations`: Max iterations for autonomous mode
  - `customConfig`: Additional custom configuration

### customHandlers
- **Type**: `CustomHandlers`
- **Optional Properties**:
  - `beforeAct`: Called before agent processes input
  - `afterResponse`: Called after agent generates response
  - `onError`: Called when an error occurs
  - `validateResponse`: Validate agent responses
  - `transformInput`: Transform input before processing
  - `transformOutput`: Transform output before returning

## Return Type: Agent

The created agent has these properties and methods:

- `id`: Agent identifier
- `type`: Agent type
- `availableTools`: Array of tool names
- `getMetadata()`: Get agent metadata
- `act(input: AgentActInput)`: Execute agent with input

## Lifecycle Hooks

### beforeAct
```typescript
beforeAct?: (input: AgentActInput, config: AgentConfig) => Promise<AgentActInput>
```
Modify input before agent processing.

### afterResponse
```typescript
afterResponse?: (response: AgentResponse, input: AgentActInput) => Promise<AgentResponse>
```
Modify response after generation.

### onError
```typescript
onError?: (error: Error, attempt: number) => Promise<void | { 
  retry: boolean; 
  modifiedInput?: AgentActInput 
}>
```
Handle errors with optional retry logic.

### validateResponse
```typescript
validateResponse?: (response: AgentResponse) => Promise<{ 
  isValid: boolean; 
  errors?: string[] 
}>
```
Validate responses before returning.

### transformInput
```typescript
transformInput?: (input: AgentActInput) => Promise<AgentActInput>
```
Transform input at the earliest stage.

### transformOutput
```typescript
transformOutput?: (output: AgentResponse) => Promise<AgentResponse>
```
Transform output at the final stage.

## Examples

### Basic Agent

```typescript
import { 
  createConfigurableAgent, 
  baseLLMService,
  createToolExecutor 
} from "@mrck-labs/grid-core";

const llmService = baseLLMService();
const toolExecutor = createToolExecutor();

const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "assistant-v1",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are a helpful assistant that provides clear, concise answers."
    },
    metadata: {
      id: "assistant-v1",
      type: "general",
      name: "General Assistant",
      description: "A helpful general-purpose assistant",
      capabilities: ["general", "conversation"],
      version: "1.0.0"
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text",
      temperature: 0.7
    }
  }
});

const response = await agent.act("What is machine learning?");
console.log(response.content);
```

### Agent with Tools

```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";

// Create tools
const calculatorTool = createNamedTool({
  name: "calculator",
  description: "Perform calculations",
  parameters: z.object({
    expression: z.string()
  }),
  execute: async ({ expression }) => eval(expression)
});

const weatherTool = createNamedTool({
  name: "weather",
  description: "Get weather information",
  parameters: z.object({
    location: z.string()
  }),
  execute: async ({ location }) => `Sunny, 72°F in ${location}`
});

// Register tools
toolExecutor.registerTools([calculatorTool, weatherTool]);

// Create agent with tools
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "tool-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: `You are an assistant with access to tools.
      Use the calculator for math questions.
      Use the weather tool for weather inquiries.
      Always explain your process.`
    },
    metadata: {
      id: "tool-agent",
      type: "general",
      name: "Tool-Enabled Assistant",
      description: "Assistant with calculator and weather tools",
      capabilities: ["tools", "math", "weather"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [calculatorTool, weatherTool],
      mcp: []
    }
  }
});

const response = await agent.act("What's 25 * 4 and what's the weather in Paris?");
// Agent will use both tools and provide comprehensive answer
```

### Agent with Custom Handlers

```typescript
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    // ... standard config
  },
  customHandlers: {
    // Log all interactions
    beforeAct: async (input, config) => {
      console.log(`[${new Date().toISOString()}] Input:`, input.messages);
      await logger.log("agent:input", { input, agentId: config.id });
      return input;
    },
    
    // Add metadata to responses
    afterResponse: async (response, input) => {
      const enhanced = {
        ...response,
        metadata: {
          ...response.metadata,
          processedAt: Date.now(),
          inputLength: JSON.stringify(input).length,
          responseLength: response.content?.length || 0
        }
      };
      await logger.log("agent:response", { response: enhanced });
      return enhanced;
    },
    
    // Retry on specific errors
    onError: async (error, attempt) => {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (error.message.includes("rate limit") && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return { retry: true };
      }
      
      if (error.message.includes("context length") && attempt === 1) {
        // Retry with shorter context
        return { 
          retry: true,
          modifiedInput: truncateInput(input)
        };
      }
      
      return { retry: false };
    },
    
    // Validate responses
    validateResponse: async (response) => {
      const errors: string[] = [];
      
      if (!response.content && !response.toolCalls) {
        errors.push("Response has no content or tool calls");
      }
      
      if (response.content && response.content.length < 10) {
        errors.push("Response too short");
      }
      
      if (containsPII(response.content)) {
        errors.push("Response contains PII");
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  }
});
```

### Input/Output Transformation

```typescript
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    // ... config
  },
  customHandlers: {
    // Add context to all inputs
    transformInput: async (input) => {
      const timestamp = new Date().toISOString();
      const enhanced = {
        ...input,
        messages: [
          {
            role: "system",
            content: `Current time: ${timestamp}`
          },
          ...input.messages
        ]
      };
      return enhanced;
    },
    
    // Format all outputs
    transformOutput: async (output) => {
      // Add structured format
      const formatted = {
        ...output,
        content: output.content ? formatMarkdown(output.content) : null,
        metadata: {
          ...output.metadata,
          formatted: true,
          formattedAt: Date.now()
        }
      };
      
      // Add citations if needed
      if (output.metadata?.sources) {
        formatted.content += "\n\n## Sources\n" + 
          output.metadata.sources.map((s, i) => `${i+1}. ${s}`).join("\n");
      }
      
      return formatted;
    }
  }
});
```

### Specialized Agent Types

```typescript
// Research Agent
const researchAgent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "research-agent",
    type: "research",
    version: "1.0.0",
    prompts: {
      system: `You are a research specialist. Your approach:
      1. Break down research questions into components
      2. Search multiple sources for each component
      3. Analyze and synthesize findings
      4. Provide citations for all claims
      5. Highlight conflicting information
      6. Suggest areas for further research`
    },
    metadata: {
      id: "research-agent",
      type: "research",
      name: "Research Specialist",
      description: "Comprehensive research and analysis",
      capabilities: ["research", "analysis", "synthesis"],
      version: "1.0.0"
    },
    tools: {
      custom: [searchTool, academicSearchTool, factCheckTool]
    },
    behavior: {
      maxRetries: 5, // More retries for thorough research
      temperature: 0.3, // Lower temperature for accuracy
      maxTokens: 4000 // Longer responses for detailed reports
    }
  }
});

// Code Assistant
const codeAgent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "code-agent",
    type: "coding",
    version: "1.0.0",
    prompts: {
      system: `You are an expert programmer. Guidelines:
      - Write clean, well-documented code
      - Follow best practices and design patterns
      - Include error handling
      - Add type annotations
      - Explain complex logic
      - Suggest optimizations`
    },
    metadata: {
      id: "code-agent",
      type: "coding",
      name: "Code Assistant",
      description: "Programming help and code generation",
      capabilities: ["coding", "debugging", "refactoring"],
      version: "1.0.0"
    },
    behavior: {
      responseFormat: "text",
      temperature: 0.2 // Low temperature for consistent code
    }
  }
});
```

### Autonomous Agent

```typescript
const autonomousAgent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "autonomous-agent",
    type: "autonomous",
    version: "1.0.0",
    prompts: {
      system: `You are an autonomous agent. For each task:
      1. Analyze what needs to be done
      2. Break it into steps
      3. Execute each step using available tools
      4. Verify results before proceeding
      5. Iterate until the task is complete`
    },
    metadata: {
      id: "autonomous-agent",
      type: "autonomous",
      name: "Autonomous Task Agent",
      description: "Self-directed task completion",
      capabilities: ["autonomous", "planning", "execution"],
      version: "1.0.0"
    },
    orchestration: {
      mode: "autonomous",
      maxIterations: 10
    },
    tools: {
      custom: [fileSystemTool, databaseTool, apiTool, validationTool]
    }
  },
  customHandlers: {
    // Track autonomous execution
    afterResponse: async (response, input) => {
      if (response.metadata?.iterationCount) {
        console.log(`Iteration ${response.metadata.iterationCount}: ${response.content?.substring(0, 100)}...`);
      }
      return response;
    }
  }
});
```

## Best Practices

1. **Unique IDs** - Always use unique agent IDs for tracking
2. **Clear System Prompts** - Define agent behavior precisely
3. **Appropriate Tools** - Only include tools the agent needs
4. **Error Handling** - Implement onError for production agents
5. **Response Validation** - Validate critical agent outputs
6. **Metadata** - Include rich metadata for observability
7. **Version Control** - Version your agent configurations

## Configuration Schema

```typescript
interface AgentConfig {
  id: string;
  type: string;
  version: string;
  prompts: {
    system: string;
  };
  metadata: AgentMetadata;
  tools?: {
    builtin?: Tool[];
    custom?: Tool[];
    mcp?: Tool[];
  };
  behavior?: {
    maxRetries?: number;
    responseFormat?: "text" | "json_object";
    temperature?: number;
    maxTokens?: number;
  };
  orchestration?: {
    mode?: "autonomous" | "guided" | "hybrid";
    maxIterations?: number;
  };
  customConfig?: Record<string, any>;
}

interface AgentMetadata {
  id: string;
  type: string;
  name: string;
  description: string;
  capabilities: string[];
  version: string;
  [key: string]: any;
}
```

## Related APIs

- [`baseLLMService`](../services/base-llm-service) - Create LLM service for agents
- [`createToolExecutor`](../services/tool-executor) - Create tool executor
- [`createNamedTool`](../tools/create-named-tool) - Create tools for agents
- [`agentFlowService`](../services/agent-flow-service) - Run autonomous flows