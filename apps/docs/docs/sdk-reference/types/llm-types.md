---
sidebar_position: 2
---

# LLM Types

Type definitions for LLM interactions and messages.

## Overview

This page documents the TypeScript types used for LLM communication, including message formats, service interfaces, and tool calls.

## Core Types

### ChatMessage

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;           // For tool messages
  toolCalls?: ToolCall[];  // For assistant messages
  toolCallId?: string;     // For tool result messages
}
```

The fundamental message type for conversations.

### LLMService

```typescript
interface LLMService {
  runLLM: (params: LLMParams) => Promise<AgentResponse>;
}
```

Interface that all LLM services must implement.

### LLMServiceOptions

```typescript
interface LLMServiceOptions {
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
  toolChoice?: ToolChoice;
  stream?: boolean;
  [key: string]: any;
}
```

Parameters for LLM service calls.

### ToolCall

```typescript
interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}
```

Structure for tool calls in assistant messages.

### ToolChoice

```typescript
type ToolChoice = 
  | "auto"
  | "none" 
  | "required"
  | { type: "tool"; toolName: string };
```

Options for controlling tool usage.

## Message Examples

### System Message

```typescript
const systemMessage: ChatMessage = {
  role: "system",
  content: "You are a helpful assistant specializing in technical support."
};
```

### User Message

```typescript
const userMessage: ChatMessage = {
  role: "user",
  content: "How do I reset my password?"
};
```

### Assistant Message with Tool Call

```typescript
const assistantMessage: ChatMessage = {
  role: "assistant",
  content: "I'll help you reset your password.",
  toolCalls: [{
    id: "call_abc123",
    type: "function",
    function: {
      name: "password_reset",
      arguments: JSON.stringify({ userId: "user_123" })
    }
  }]
};
```

### Tool Response Message

```typescript
const toolMessage: ChatMessage = {
  role: "tool",
  content: "Password reset email sent successfully",
  toolCallId: "call_abc123",
  name: "password_reset"
};
```

## Usage Patterns

### Building Conversations

```typescript
function buildConversation(
  systemPrompt: string,
  userInput: string
): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userInput }
  ];
}
```

### Processing Tool Calls

```typescript
function processToolCalls(
  message: ChatMessage
): ToolCall[] | undefined {
  if (message.role === "assistant" && message.toolCalls) {
    return message.toolCalls;
  }
  return undefined;
}
```

### Type-Safe LLM Calls

```typescript
async function callLLM(
  service: LLMService,
  messages: ChatMessage[],
  options?: Partial<LLMServiceOptions>
): Promise<AgentResponse> {
  const params: LLMServiceOptions = {
    messages,
    model: "gpt-4",
    temperature: 0.7,
    ...options
  };
  
  return await service.runLLM(params);
}
```

## Validation

### Message Validation

```typescript
function isValidChatMessage(msg: any): msg is ChatMessage {
  return (
    msg &&
    typeof msg === "object" &&
    ["system", "user", "assistant", "tool"].includes(msg.role) &&
    (msg.content === null || typeof msg.content === "string")
  );
}
```

### Tool Call Validation

```typescript
function isValidToolCall(tc: any): tc is ToolCall {
  return (
    tc &&
    typeof tc === "object" &&
    typeof tc.id === "string" &&
    tc.type === "function" &&
    tc.function &&
    typeof tc.function.name === "string" &&
    typeof tc.function.arguments === "string"
  );
}
```

## Advanced Types

### Streaming Response

```typescript
interface StreamingResponse {
  role: "assistant";
  content: AsyncIterable<string>;
  toolCalls?: AsyncIterable<ToolCall>;
}
```

### Message with Metadata

```typescript
interface ExtendedChatMessage extends ChatMessage {
  timestamp?: number;
  tokenCount?: number;
  metadata?: Record<string, any>;
}
```

## Best Practices

1. **Always validate messages** before sending to LLM
2. **Use type guards** to ensure type safety
3. **Handle null content** appropriately
4. **Parse tool arguments** safely with try-catch
5. **Preserve message order** in conversations

## Related Types

- [`Agent Types`](./agent-types) - Agent-related types
- [`Tool Types`](./tool-types) - Tool definitions and results