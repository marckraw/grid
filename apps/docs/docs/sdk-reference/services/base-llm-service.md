---
sidebar_position: 1
---

# baseLLMService

Creates an LLM service instance for interacting with language models.

## Overview

`baseLLMService` is the primary service for configuring and interacting with LLM providers (OpenAI, Anthropic) through the Vercel AI SDK. It provides a unified interface for making LLM calls with optional Langfuse observability integration.

## Import

```typescript
import { baseLLMService } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function baseLLMService(
  config?: BaseLLMServiceConfig
): LLMService
```

## Parameters

### config (optional)
- **Type**: `BaseLLMServiceConfig`
- **Properties**:
  - `langfuse` (optional)
    - **Type**: `{ enabled: boolean; config?: LangfuseConfig }`
    - **Description**: Langfuse observability configuration
    - **Properties**:
      - `enabled`: Whether to enable Langfuse tracking
      - `config` (optional): Langfuse configuration
        - `publicKey`: Langfuse public key
        - `secretKey`: Langfuse secret key
        - `baseUrl`: Langfuse API URL (optional)
        - `release`: Release version (optional)
        - `debug`: Enable debug logging (optional)

## Return Type: LLMService

### Methods

#### runLLM
```typescript
runLLM(params: {
  model?: string;
  provider?: "openai" | "anthropic";
  messages: ChatMessage[];
  tools?: Tool[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  responseFormat?: { type: "text" | "json_object" };
  toolChoice?: "auto" | "none" | "required" | { type: "tool"; toolName: string };
  stream?: boolean;
  [key: string]: any;
}): Promise<AgentResponse>
```

Execute an LLM call with the specified parameters.

**Parameters**:
- `model` (optional): Model to use (default: from env DEFAULT_MODEL or "gpt-4")
- `provider` (optional): LLM provider (default: from env DEFAULT_PROVIDER or "openai")
- `messages`: Array of conversation messages
- `tools` (optional): Available tools for the model to use
- `temperature` (optional): Sampling temperature (0-2)
- `maxTokens` (optional): Maximum tokens to generate
- `topP` (optional): Top-p sampling parameter
- `frequencyPenalty` (optional): Frequency penalty (-2 to 2)
- `presencePenalty` (optional): Presence penalty (-2 to 2)
- `stopSequences` (optional): Sequences that stop generation
- `responseFormat` (optional): Control response format
- `toolChoice` (optional): Control tool usage behavior
- `stream` (optional): Whether to stream the response

**Returns**: `AgentResponse` containing:
- `role`: "assistant"
- `content`: Generated text content
- `toolCalls`: Array of tool calls if any
- `metadata`: Additional response metadata

## Environment Variables

The service uses these environment variables:

- `DEFAULT_MODEL` - Default model name (e.g., "gpt-4", "claude-3-opus-20240229")
- `DEFAULT_PROVIDER` - Default provider ("openai" or "anthropic")
- `OPENAI_API_KEY` - OpenAI API key (required for OpenAI)
- `ANTHROPIC_API_KEY` - Anthropic API key (required for Anthropic)
- `LANGFUSE_PUBLIC_KEY` - Langfuse public key (if using observability)
- `LANGFUSE_SECRET_KEY` - Langfuse secret key (if using observability)

## Examples

### Basic Usage

```typescript
const llmService = baseLLMService();

const response = await llmService.runLLM({
  messages: [
    { role: "system", content: "You are a helpful assistant" },
    { role: "user", content: "Hello! How are you?" }
  ]
});

console.log(response.content);
// "Hello! I'm doing well, thank you for asking. How can I help you today?"
```

### With Specific Model and Provider

```typescript
const llmService = baseLLMService();

// Use GPT-4
const gptResponse = await llmService.runLLM({
  model: "gpt-4",
  provider: "openai",
  messages: [
    { role: "user", content: "Explain quantum computing in simple terms" }
  ],
  temperature: 0.7,
  maxTokens: 500
});

// Use Claude
const claudeResponse = await llmService.runLLM({
  model: "claude-3-opus-20240229",
  provider: "anthropic",
  messages: [
    { role: "user", content: "Write a haiku about programming" }
  ]
});
```

### With Tools

```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";

const calculatorTool = createNamedTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression to evaluate")
  }),
  execute: async ({ expression }) => {
    return eval(expression).toString();
  }
});

const llmService = baseLLMService();

const response = await llmService.runLLM({
  messages: [
    { role: "user", content: "What's 25 times 4?" }
  ],
  tools: [calculatorTool],
  toolChoice: "auto"
});

console.log(response.toolCalls);
// [{
//   id: "call_123",
//   type: "function",
//   function: {
//     name: "calculator",
//     arguments: '{"expression":"25*4"}'
//   }
// }]
```

### With Langfuse Observability

```typescript
const llmService = baseLLMService({
  langfuse: {
    enabled: true,
    config: {
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      release: "v1.0.0",
      debug: true
    }
  }
});

// All LLM calls will now be tracked in Langfuse
const response = await llmService.runLLM({
  messages: [{ role: "user", content: "Hello!" }]
});

// Langfuse will track:
// - Token usage
// - Latency
// - Model and parameters
// - Full request/response
```

### Controlling Response Format

```typescript
const llmService = baseLLMService();

// Force JSON response
const jsonResponse = await llmService.runLLM({
  messages: [
    { 
      role: "user", 
      content: "List 3 programming languages with their year of creation" 
    }
  ],
  responseFormat: { type: "json_object" }
});

// Response will be valid JSON
const languages = JSON.parse(jsonResponse.content);
```

### Tool Choice Control

```typescript
const llmService = baseLLMService();

// Let model decide whether to use tools
const autoResponse = await llmService.runLLM({
  messages: [{ role: "user", content: "What's the weather?" }],
  tools: [weatherTool],
  toolChoice: "auto"
});

// Force tool usage
const requiredResponse = await llmService.runLLM({
  messages: [{ role: "user", content: "Tell me about Paris" }],
  tools: [weatherTool, wikipediaTool],
  toolChoice: "required"
});

// Force specific tool
const specificResponse = await llmService.runLLM({
  messages: [{ role: "user", content: "Get me information" }],
  tools: [weatherTool, wikipediaTool],
  toolChoice: { type: "tool", toolName: "wikipedia" }
});

// Prevent tool usage
const noToolsResponse = await llmService.runLLM({
  messages: [{ role: "user", content: "What's 2+2?" }],
  tools: [calculatorTool],
  toolChoice: "none"
});
```

### Error Handling

```typescript
const llmService = baseLLMService();

try {
  const response = await llmService.runLLM({
    messages: [{ role: "user", content: "Hello" }],
    model: "gpt-4",
    provider: "openai"
  });
} catch (error) {
  if (error.message.includes("API key")) {
    console.error("Missing API key for provider");
  } else if (error.message.includes("rate limit")) {
    console.error("Rate limit exceeded");
  } else {
    console.error("LLM call failed:", error);
  }
}
```

## Best Practices

1. **Set environment variables** - Configure DEFAULT_MODEL and DEFAULT_PROVIDER
2. **Handle errors gracefully** - LLM calls can fail due to rate limits, network issues
3. **Use appropriate models** - Different models have different capabilities and costs
4. **Enable observability** - Use Langfuse in production for monitoring
5. **Control tool usage** - Use toolChoice to optimize behavior
6. **Set reasonable limits** - Use maxTokens to control response length and cost

## TypeScript Types

```typescript
interface BaseLLMServiceConfig {
  langfuse?: {
    enabled: boolean;
    config?: {
      publicKey?: string;
      secretKey?: string;
      baseUrl?: string;
      release?: string;
      debug?: boolean;
    };
  };
}

interface LLMService {
  runLLM: (params: LLMParams) => Promise<AgentResponse>;
}

interface AgentResponse {
  role: "assistant";
  content: string | null;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}
```

## Related APIs

- [`createConfigurableAgent`](../factories/configurable-agent) - Uses LLMService internally
- [`createToolExecutor`](./tool-executor) - Executes tools returned by LLM
- [`createLangfuseService`](./langfuse-service) - Direct Langfuse integration