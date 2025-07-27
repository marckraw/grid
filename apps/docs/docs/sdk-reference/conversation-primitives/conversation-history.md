---
sidebar_position: 1
---

# createConversationHistory

Creates a conversation history manager for storing and retrieving messages in a conversation.

## Overview

`createConversationHistory` is an atomic primitive that manages the storage and retrieval of conversation messages. It provides methods for adding messages, retrieving messages by role, and managing tool responses. The history automatically preserves system messages when clearing.

**Independence**: This primitive can be used completely on its own without any other Grid components. Perfect for simple message logging, chat history, or audit trails.

## Import

```typescript
import { createConversationHistory } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createConversationHistory(
  systemPrompt?: string,
  options?: ConversationHistoryOptions
): ConversationHistory
```

## Parameters

### systemPrompt (optional)
- **Type**: `string`
- **Description**: Initial system prompt to add to the conversation
- **Example**: `"You are a helpful assistant"`

### options (optional)
- **Type**: `ConversationHistoryOptions`
- **Properties**:
  - `maxMessages` (optional)
    - **Type**: `number`
    - **Default**: `Infinity`
    - **Description**: Maximum number of messages to retain (excluding system messages)
  - `handlers` (optional)
    - **Type**: `ConversationHistoryHandlers`
    - **Properties**:
      - `onMessageAdded`: `(message: ChatMessage) => Promise<void>`
        - Called when a message is added to history
      - `onToolResponseAdded`: `(toolResponse: { toolCallId: string; toolName: string; result: any }) => Promise<void>`
        - Called when a tool response is added
      - `onMessagesCleared`: `() => Promise<void>`
        - Called when messages are cleared (excluding system message)

## Return Type: ConversationHistory

### Methods

#### addMessage
```typescript
addMessage(message: ChatMessage): Promise<void>
```
Add a single message to the conversation history.

**Parameters**:
- `message`: ChatMessage object with `role` and `content`

**Example**:
```typescript
await history.addMessage({ 
  role: "user", 
  content: "Hello!" 
});
```

#### addMessages
```typescript
addMessages(messages: ChatMessage[]): Promise<void>
```
Add multiple messages to the conversation history.

**Parameters**:
- `messages`: Array of ChatMessage objects

#### addToolResponse
```typescript
addToolResponse(
  toolCallId: string, 
  toolName: string, 
  result: any
): Promise<void>
```
Add a tool response message with proper formatting.

**Parameters**:
- `toolCallId`: ID of the tool call
- `toolName`: Name of the tool
- `result`: Result from tool execution

**Example**:
```typescript
await history.addToolResponse(
  "call_123",
  "calculator",
  "Result: 42"
);
```

#### getMessages
```typescript
getMessages(): ChatMessage[]
```
Get all messages in the conversation (returns a copy).

**Returns**: Array of all messages including system prompt

#### getNonSystemMessages
```typescript
getNonSystemMessages(): ChatMessage[]
```
Get all messages except system messages.

**Returns**: Array of user, assistant, and tool messages

#### getMessageCountByRole
```typescript
getMessageCountByRole(role: "system" | "user" | "assistant" | "tool"): number
```
Count messages of a specific role.

**Parameters**:
- `role`: The message role to count

**Returns**: Number of messages with the specified role

#### getLastMessageByRole
```typescript
getLastMessageByRole(role: "system" | "user" | "assistant" | "tool"): ChatMessage | undefined
```
Get the most recent message of a specific role.

**Parameters**:
- `role`: The message role to find

**Returns**: The last message with that role, or undefined if none found

#### hasMessages
```typescript
hasMessages(): boolean
```
Check if there are any non-system messages.

**Returns**: true if there are user, assistant, or tool messages

#### clear
```typescript
clear(): Promise<void>
```
Clear all messages except the system prompt.

## Examples

### Basic Usage

```typescript
// Create history with system prompt
const history = createConversationHistory("You are a helpful assistant");

// Add messages
await history.addMessage({ role: "user", content: "What's the weather?" });
await history.addMessage({ 
  role: "assistant", 
  content: "I'll help you check the weather." 
});

// Get all messages
const messages = history.getMessages();
// [
//   { role: "system", content: "You are a helpful assistant" },
//   { role: "user", content: "What's the weather?" },
//   { role: "assistant", content: "I'll help you check the weather." }
// ]
```

### With Event Handlers

```typescript
const history = createConversationHistory("You are a helpful assistant", {
  handlers: {
    onMessageAdded: async (message) => {
      console.log(`New message: ${message.role} - ${message.content}`);
      await database.messages.create({ data: message });
    },
    onToolResponseAdded: async (toolResponse) => {
      console.log(`Tool executed: ${toolResponse.toolName}`);
      await analytics.track("tool_execution", toolResponse);
    },
    onMessagesCleared: async () => {
      console.log("Conversation cleared");
      await database.messages.deleteMany({ sessionId });
    }
  }
});
```

### With Message Limit

```typescript
const history = createConversationHistory("You are a helpful assistant", {
  maxMessages: 20 // Keep only last 20 messages (plus system prompt)
});

// Add many messages...
for (let i = 0; i < 30; i++) {
  await history.addMessage({ 
    role: "user", 
    content: `Message ${i}` 
  });
}

// Only the system prompt + last 20 messages are retained
console.log(history.getMessages().length); // 21
```

### Tool Response Handling

```typescript
// Add assistant message with tool call
await history.addMessage({
  role: "assistant",
  content: "Let me calculate that for you.",
  toolCalls: [{
    id: "call_123",
    name: "calculator",
    args: { expression: "2 + 2" }
  }]
});

// Add tool response
await history.addToolResponse(
  "call_123",
  "calculator",
  "4"
);

// The tool response is formatted as:
// { 
//   role: "tool", 
//   content: "4",
//   toolCallId: "call_123",
//   name: "calculator"
// }
```

### Message Filtering

```typescript
const history = createConversationHistory("System prompt");

// Add various messages
await history.addMessages([
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi there!" },
  { role: "user", content: "How are you?" },
  { role: "assistant", content: "I'm doing well!" }
]);

// Get counts by role
console.log(history.getMessageCountByRole("user")); // 2
console.log(history.getMessageCountByRole("assistant")); // 2

// Get last user message
const lastUser = history.getLastMessageByRole("user");
console.log(lastUser?.content); // "How are you?"

// Get non-system messages for display
const displayMessages = history.getNonSystemMessages();
console.log(displayMessages.length); // 4 (no system message)
```

## Best Practices

1. **Always use event handlers for persistence** - Don't rely on in-memory storage for production
2. **Set appropriate message limits** - Prevent unbounded memory growth
3. **Use getNonSystemMessages() for UI display** - System prompts are usually not shown to users
4. **Handle tool responses properly** - Use addToolResponse() for correct formatting
5. **Clear responsibly** - The clear() method preserves system messages but removes all others

## Related APIs

- [`createConversationContext`](./conversation-context) - For managing conversation state
- [`createConversationManager`](./conversation-manager) - Combines history and context
- [`createConversationLoop`](./conversation-loop) - Full conversation orchestration