---
sidebar_position: 3
---

# createConversationManager

Creates a unified conversation manager that combines history and context management.

## Overview

`createConversationManager` is a composed primitive that combines `createConversationHistory` and `createConversationContext` into a single, cohesive interface. It provides all the functionality of both primitives plus additional convenience methods for managing conversations.

**Optional Convenience**: The manager is purely a convenience wrapper. You can achieve everything it does by using the atomic primitives directly. Use it when you want both history and context with a unified API, or skip it entirely and use the atomics for more control.

## Import

```typescript
import { createConversationManager } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createConversationManager(
  options?: ConversationManagerOptions
): ConversationManager
```

## Parameters

### options (optional)
- **Type**: `ConversationManagerOptions`
- **Properties**:
  - `handlers` (optional) - Grouped event handlers
    - **Type**: `GroupedManagerHandlers`
    - **Properties**:
      - `manager` - Manager-level handlers
        - `onUserMessageAdded`: `(message: string) => Promise<void>`
        - `onAgentResponseProcessed`: `(response: AgentResponse) => Promise<void>`
        - `onToolResponseAdded`: `(toolCallId: string, toolName: string, result: any) => Promise<void>`
        - `onReset`: `() => Promise<void>`
      - `history` - History-level handlers (see ConversationHistory)
        - `onMessageAdded`: `(message: ChatMessage) => Promise<void>`
        - `onMessagesCleared`: `() => Promise<void>`
      - `context` - Context-level handlers (see ConversationContext)
        - `onStateChanged`: `(key: string, value: any) => Promise<void>`
        - `onMetadataChanged`: `(key: string, value: any) => Promise<void>`
  - `historyOptions` (optional) - Options for ConversationHistory
    - **Type**: `ConversationHistoryOptions`
    - **Properties**:
      - `systemPrompt`: Initial system prompt
      - `maxMessages`: Maximum message limit
      - `handlers`: History event handlers
  - `contextOptions` (optional) - Options for ConversationContext
    - **Type**: `ConversationContextOptions`
    - **Properties**:
      - `handlers`: Context event handlers

## Return Type: ConversationManager

### Methods

#### Message Management

##### addUserMessage
```typescript
addUserMessage(content: string): Promise<void>
```
Add a user message to the conversation.

**Parameters**:
- `content`: The user's message text

**Side Effects**:
- Increments message count
- Updates last user message timestamp
- Triggers `onUserMessageAdded` handler

##### processAgentResponse
```typescript
processAgentResponse(response: AgentResponse): Promise<void>
```
Process and store an agent's response including tool calls.

**Parameters**:
- `response`: AgentResponse object containing:
  - `content`: Response text
  - `toolCalls` (optional): Array of tool calls
  - `metadata` (optional): Additional metadata

**Side Effects**:
- Adds assistant message to history
- Processes tool responses if present
- Updates metrics and metadata
- Triggers relevant handlers

#### History Methods (Delegated)

All methods from `ConversationHistory` are available:

- `getMessages(): ChatMessage[]` - Get all messages
- `getNonSystemMessages(): ChatMessage[]` - Get non-system messages  
- `getLastMessageByRole(role: string): ChatMessage | undefined` - Get last message by role
- `hasMessages(): boolean` - Check if has messages

#### Context Methods (Delegated)

All methods from `ConversationContext` are available:

- `updateState(key: string, value: any): Promise<void>` - Update state value
- `updateStates(updates: Record<string, any>): Promise<void>` - Update multiple states
- `getState(): Record<string, any>` - Get full state
- `getStateValue(key: string): any` - Get specific state value
- `updateMetadata(key: string, value: any): Promise<void>` - Update metadata
- `getMetadata(key?: string): any` - Get metadata

#### Combined Methods

##### getConversationState
```typescript
getConversationState(): ConversationState
```
Get the complete conversation state including messages and context.

**Returns**: Object containing:
- `messages`: All conversation messages
- `context`: Current context snapshot
- `hasMessages`: Whether there are non-system messages
- `messageCount`: Total message count

##### getSummary
```typescript
getSummary(): ConversationSummary
```
Get a summary of the conversation.

**Returns**: Object containing:
- `sessionId`: Unique session identifier
- `userId`: User ID if set
- `messageCount`: Total messages
- `userMessageCount`: Number of user messages
- `assistantMessageCount`: Number of assistant messages
- `toolMessageCount`: Number of tool messages
- `toolCallCount`: Total tool calls made
- `duration`: Conversation duration in ms
- `hasSystemPrompt`: Whether system prompt exists
- `lastUserMessage`: Content of last user message
- `lastAssistantMessage`: Content of last assistant message
- `hasToolCalls`: Whether any tool calls were made

##### reset
```typescript
reset(): Promise<void>
```
Reset the conversation, clearing all messages and state.

**Side Effects**:
- Clears all messages (except system prompt)
- Resets all state
- Resets metrics
- Triggers `onReset` handler

#### Direct Access

##### history
```typescript
history: ConversationHistory
```
Direct access to the underlying ConversationHistory instance.

##### context  
```typescript
context: ConversationContext
```
Direct access to the underlying ConversationContext instance.

## Examples

### Basic Conversation Management

```typescript
// With system prompt
const manager = createConversationManager({
  historyOptions: {
    systemPrompt: "You are a helpful assistant"
  }
});

// Or without system prompt
const manager = createConversationManager();

// Add user message
await manager.addUserMessage("What's the weather like?");

// Process agent response
await manager.processAgentResponse({
  role: "assistant",
  content: "I'll check the weather for you.",
  toolCalls: [{
    id: "call_123",
    type: "function",
    function: {
      name: "get_weather",
      arguments: JSON.stringify({ location: "San Francisco" })
    }
  }]
});

// Get conversation state
const state = manager.getConversationState();
console.log(state.messages.length); // 3 (system + user + assistant) if system prompt was provided
```

### With Event Handlers

```typescript
const manager = createConversationManager({
  historyOptions: {
    systemPrompt: "You are a helpful assistant"
  },
  handlers: {
    manager: {
      onUserMessageAdded: async (message) => {
        console.log("User said:", message);
        await analytics.track("user_message", { content: message });
      },
      onAgentResponseProcessed: async (response) => {
        console.log("Agent responded:", response.content);
        await analytics.track("agent_response", { 
          hasTools: response.toolCalls?.length > 0 
        });
      },
      onToolResponseAdded: async (toolCallId, toolName, result) => {
        console.log(`Tool ${toolName} returned:`, result);
        await analytics.track("tool_execution", { toolName });
      },
      onReset: async () => {
        console.log("Conversation reset");
        await analytics.track("conversation_reset");
      }
    },
    history: {
      onMessageAdded: async (message) => {
        await database.messages.create({ data: message });
      }
    },
    context: {
      onStateChanged: async (key, value) => {
        await database.state.upsert({ key, value });
      }
    }
  }
});
```

### State Management During Conversation

```typescript
const manager = createConversationManager("You are a shopping assistant");

// User provides information
await manager.addUserMessage("I'm looking for a laptop");
await manager.updateState("shopping.category", "electronics");
await manager.updateState("shopping.item", "laptop");

// Agent asks for budget
await manager.processAgentResponse({
  role: "assistant",
  content: "I'd be happy to help you find a laptop. What's your budget?"
});

// User responds
await manager.addUserMessage("Around $1500");
await manager.updateState("shopping.budget", 1500);

// Agent uses state to make recommendations
const budget = manager.getStateValue("shopping.budget");
const category = manager.getStateValue("shopping.category");

await manager.processAgentResponse({
  role: "assistant",
  content: `Great! For $${budget} in ${category}, I recommend...`
});
```

### Tool Response Handling

```typescript
const manager = createConversationManager("You are a helpful assistant");

// User asks a question requiring tool use
await manager.addUserMessage("What's 25 * 4?");

// Agent response with tool call
const response: AgentResponse = {
  role: "assistant",
  content: "Let me calculate that for you.",
  toolCalls: [{
    id: "call_456",
    type: "function",
    function: {
      name: "calculator",
      arguments: JSON.stringify({ expression: "25 * 4" })
    }
  }],
  metadata: {
    toolResponses: [{
      toolCallId: "call_456",
      toolName: "calculator",
      result: "100"
    }]
  }
};

await manager.processAgentResponse(response);

// The manager automatically:
// 1. Adds the assistant message with tool calls
// 2. Adds the tool response message
// 3. Updates tool call metrics
// 4. Triggers appropriate handlers
```

### Getting Conversation Summary

```typescript
const manager = createConversationManager("You are a support agent");

// Simulate a conversation
await manager.updateState("user.id", "user_123");
await manager.addUserMessage("I need help with my order");
await manager.processAgentResponse({
  role: "assistant",
  content: "I'd be happy to help with your order. Can you provide the order number?"
});
await manager.addUserMessage("Order #12345");

// Get summary
const summary = manager.getSummary();
console.log(summary);
// {
//   sessionId: "sess_abc123",
//   userId: "user_123",
//   messageCount: 4,
//   userMessageCount: 2,
//   assistantMessageCount: 1,
//   toolMessageCount: 0,
//   toolCallCount: 0,
//   duration: 5000,
//   hasSystemPrompt: true,
//   lastUserMessage: "Order #12345",
//   lastAssistantMessage: "I'd be happy to help...",
//   hasToolCalls: false
// }
```

## Best Practices

1. **Use grouped handlers** - Organize handlers by level (manager, history, context)
2. **Track conversation flow** - Use state to track intent, topics, and resolution
3. **Process responses properly** - Use processAgentResponse() for all agent messages
4. **Leverage summaries** - Use getSummary() for analytics and session management
5. **Reset carefully** - reset() clears everything except the system prompt

## TypeScript Types

```typescript
interface ConversationState {
  messages: ChatMessage[];
  context: ConversationSnapshot;
  hasMessages: boolean;
  messageCount: number;
}

interface ConversationSummary {
  sessionId: string;
  userId?: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  toolMessageCount: number;
  toolCallCount: number;
  duration: number;
  hasSystemPrompt: boolean;
  lastUserMessage?: string;
  lastAssistantMessage?: string;
  hasToolCalls: boolean;
}

interface GroupedManagerHandlers {
  manager?: ConversationManagerHandlers;
  history?: ConversationHistoryHandlers;
  context?: ConversationContextHandlers;
}
```

## Related APIs

- [`createConversationHistory`](./conversation-history) - Underlying history management
- [`createConversationContext`](./conversation-context) - Underlying context management
- [`createConversationLoop`](./conversation-loop) - Full conversation orchestration with agent