---
sidebar_position: 1
---

# transformMessagesForAI

Transforms messages to ensure compatibility with AI model requirements.

## Overview

`transformMessagesForAI` is a utility function that processes conversation messages to handle edge cases and ensure they meet the requirements of language models. It specifically addresses the issue where some models require alternating user/assistant messages and cannot have consecutive messages from the same role.

## Import

```typescript
import { transformMessagesForAI } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function transformMessagesForAI(messages: ChatMessage[]): ChatMessage[]
```

## Parameters

### messages
- **Type**: `ChatMessage[]`
- **Description**: Array of conversation messages to transform

## Return Type

Returns a transformed array of `ChatMessage[]` with consolidated consecutive messages.

## Behavior

The function:
1. Preserves system messages as-is
2. Combines consecutive messages from the same role (except system)
3. Joins multiple messages with newline separators
4. Maintains message order
5. Preserves all message properties (including tool calls)

## Examples

### Basic Message Consolidation

```typescript
import { transformMessagesForAI } from "@mrck-labs/grid-core";

const messages = [
  { role: "system", content: "You are a helpful assistant" },
  { role: "user", content: "Hello" },
  { role: "user", content: "How are you?" },
  { role: "assistant", content: "I'm doing well!" },
  { role: "assistant", content: "How can I help you today?" }
];

const transformed = transformMessagesForAI(messages);
console.log(transformed);
// [
//   { role: "system", content: "You are a helpful assistant" },
//   { role: "user", content: "Hello\nHow are you?" },
//   { role: "assistant", content: "I'm doing well!\nHow can I help you today?" }
// ]
```

### Handling Complex Conversations

```typescript
const complexMessages = [
  { role: "system", content: "System prompt" },
  { role: "user", content: "First question" },
  { role: "user", content: "Actually, let me rephrase" },
  { role: "user", content: "What is machine learning?" },
  { role: "assistant", content: "Machine learning is..." },
  { role: "user", content: "Can you give examples?" },
  { role: "user", content: "Specifically for classification" },
  { role: "assistant", content: "Sure! Here are examples..." },
  { role: "assistant", content: "1. Spam detection" },
  { role: "assistant", content: "2. Image recognition" }
];

const result = transformMessagesForAI(complexMessages);
// Results in properly alternating messages
```

### Preserving Tool Calls

```typescript
const messagesWithTools = [
  { role: "system", content: "You have access to tools" },
  { role: "user", content: "What's the weather?" },
  { role: "user", content: "In Paris please" },
  { 
    role: "assistant", 
    content: "I'll check the weather",
    toolCalls: [{
      id: "call_123",
      type: "function",
      function: { name: "weather", arguments: '{"city":"Paris"}' }
    }]
  },
  { 
    role: "assistant", 
    content: "Let me get that information"
  }
];

const transformed = transformMessagesForAI(messagesWithTools);
// Tool calls are preserved in the consolidated message
```

### Integration with LLM Services

```typescript
import { baseLLMService, transformMessagesForAI } from "@mrck-labs/grid-core";

const llmService = baseLLMService();

// Raw messages from conversation history
const rawMessages = conversationHistory.getMessages();

// Transform before sending to LLM
const transformedMessages = transformMessagesForAI(rawMessages);

const response = await llmService.runLLM({
  messages: transformedMessages,
  model: "gpt-4"
});
```

### Real-world Scenario

```typescript
// User sends multiple messages quickly
const chatMessages = [
  { role: "system", content: "You are a coding assistant" },
  { role: "user", content: "I need help with JavaScript" },
  { role: "user", content: "Specifically async/await" },
  { role: "user", content: "Here's my code:" },
  { role: "user", content: "async function getData() { ... }" },
  { role: "assistant", content: "I see the issue" },
  { role: "assistant", content: "You need to add error handling" }
];

// Transform for AI model
const aiReady = transformMessagesForAI(chatMessages);

// Now messages alternate properly:
// system -> user (all 4 combined) -> assistant (both combined)
```

### Edge Cases

```typescript
// Empty messages
const empty = transformMessagesForAI([]);
console.log(empty); // []

// Only system messages
const systemOnly = transformMessagesForAI([
  { role: "system", content: "Prompt 1" },
  { role: "system", content: "Prompt 2" }
]);
console.log(systemOnly); // Both system messages preserved

// Single message
const single = transformMessagesForAI([
  { role: "user", content: "Hello" }
]);
console.log(single); // [{ role: "user", content: "Hello" }]

// Already alternating
const alternating = transformMessagesForAI([
  { role: "user", content: "Question" },
  { role: "assistant", content: "Answer" },
  { role: "user", content: "Follow-up" }
]);
console.log(alternating); // No changes needed
```

## Use Cases

### 1. Chat Interfaces
When users send multiple messages before the assistant responds:

```typescript
class ChatInterface {
  messages: ChatMessage[] = [];
  
  async sendUserMessage(content: string) {
    this.messages.push({ role: "user", content });
  }
  
  async getAIResponse() {
    // Transform messages before sending
    const transformed = transformMessagesForAI(this.messages);
    
    const response = await llmService.runLLM({
      messages: transformed
    });
    
    this.messages.push(response);
  }
}
```

### 2. Message History Cleanup

```typescript
async function cleanupConversation(history: ConversationHistory) {
  const allMessages = history.getMessages();
  const cleaned = transformMessagesForAI(allMessages);
  
  // Cleaned messages ready for:
  // - Export
  // - Analysis
  // - Sending to different AI models
  return cleaned;
}
```

### 3. Model Compatibility

```typescript
// Some models have strict requirements
async function sendToStrictModel(messages: ChatMessage[]) {
  // Ensure compatibility
  const compatible = transformMessagesForAI(messages);
  
  // Additional validation
  for (let i = 1; i < compatible.length - 1; i++) {
    if (compatible[i].role === compatible[i + 1].role && 
        compatible[i].role !== "system") {
      throw new Error("Transformation failed - consecutive messages");
    }
  }
  
  return await strictModel.generate(compatible);
}
```

## Implementation Details

The function:
- Iterates through messages once (O(n) complexity)
- Preserves message order
- Maintains all message properties
- Combines content with newline separators
- Handles system messages specially (never consolidated)

## Best Practices

1. **Call before LLM requests** - Always transform messages before sending to models
2. **Preserve originals** - Keep original messages for accurate history
3. **Use with streaming** - Safe to use with streaming responses
4. **Combine with validation** - Add additional validation if needed

## Related APIs

- [`baseLLMService`](../services/base-llm-service) - Often used together
- [`createConversationHistory`](../conversation-primitives/conversation-history) - Source of messages
- [`createConversationLoop`](../conversation-primitives/conversation-loop) - May use internally