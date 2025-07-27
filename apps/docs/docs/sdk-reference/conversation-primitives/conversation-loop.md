---
sidebar_position: 4
---

# createConversationLoop

Creates a complete conversation orchestration system with agent integration and automatic tool resolution.

## Overview

`createConversationLoop` is an organism-level primitive that provides full conversation flow management. It integrates an agent, handles tool execution automatically, tracks conversation analytics, and provides lifecycle event handlers. This is the highest-level conversation primitive, ideal for building complete conversational experiences.

**Full Orchestration Option**: The loop provides complete agent integration and automation. However, you can build equivalent functionality using lower-level primitives if you need custom behavior. The loop is convenient but not mandatory - use it for standard flows or build your own for unique requirements.

## Import

```typescript
import { createConversationLoop } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createConversationLoop(
  options: ConversationLoopOptions
): Promise<ConversationLoop>
```

## Parameters

### options
- **Type**: `ConversationLoopOptions`
- **Required Properties**:
  - `agent`: The agent instance to use for conversations
- **Optional Properties**:
  - `systemPrompt`: Initial system prompt (overrides agent's prompt)
  - `toolExecutor`: Tool executor service for handling tool calls
  - `onProgress`: Progress callback for real-time updates
    - **Type**: `(update: ProgressMessage) => void`
  - `handlers`: Lifecycle event handlers
    - **Type**: `GroupedHandlers`

### GroupedHandlers

The `handlers` object can contain:

- `loop` - Loop-level lifecycle handlers:
  - `onConversationStarted`: `(context: ConversationContext) => Promise<{ initialMessages?: ChatMessage[] } | void>`
  - `onMessageSent`: `(message: string, context: ConversationContext) => Promise<void>`
  - `onResponseReceived`: `(response: AgentResponse, context: ConversationContext) => Promise<void>`
  - `onConversationEnded`: `(summary: ConversationSummary, context: ConversationContext) => Promise<void>`

- `manager` - Manager-level handlers (see ConversationManager)
- `history` - History-level handlers (see ConversationHistory)
- `context` - Context-level handlers (see ConversationContext)

## Return Type: ConversationLoop

### Methods

#### sendMessage
```typescript
sendMessage(message: string): Promise<SendMessageResult>
```
Send a message and get the agent's response, automatically handling tool calls.

**Parameters**:
- `message`: The user's message

**Returns**: Object containing:
- `content`: The final response content
- `role`: Always "assistant"
- `toolCalls`: Array of tool calls made (if any)
- `metadata`: Additional response metadata

**Process**:
1. Adds user message to history
2. Sends to agent with full conversation context
3. Automatically executes any tool calls
4. Returns final response after all tools complete

#### getMessages
```typescript
getMessages(): ChatMessage[]
```
Get all messages in the conversation.

**Returns**: Array of all messages including system prompt

#### getState
```typescript
getState(): Record<string, any>
```
Get the current conversation state.

**Returns**: Current state object

#### updateState
```typescript
updateState(key: string, value: any): Promise<void>
```
Update a state value.

**Parameters**:
- `key`: State key (supports dot notation)
- `value`: Value to set

#### getAnalytics
```typescript
getAnalytics(): ConversationAnalytics
```
Get detailed conversation analytics.

**Returns**: Object containing:
- `messageCount`: Total messages
- `userMessageCount`: Number of user messages
- `assistantMessageCount`: Number of assistant messages
- `toolCallCount`: Total tool calls made
- `turnCount`: Number of conversation turns
- `duration`: Total duration in milliseconds
- `avgResponseTime`: Average response time
- `isActive`: Whether conversation is active

#### exportConversation
```typescript
exportConversation(): ConversationExport
```
Export the full conversation for persistence.

**Returns**: Object containing:
- `messages`: All conversation messages
- `state`: Current state
- `metadata`: Current metadata
- `analytics`: Conversation analytics
- `exportedAt`: Export timestamp

#### importConversation
```typescript
importConversation(data: ConversationExport): void
```
Import a previously exported conversation.

**Parameters**:
- `data`: Previously exported conversation data

#### endConversation
```typescript
endConversation(): Promise<void>
```
End the conversation and trigger cleanup handlers.

**Side Effects**:
- Marks conversation as ended
- Triggers `onConversationEnded` handler
- Prevents further messages

#### resetConversation
```typescript
resetConversation(): Promise<void>
```
Reset the conversation to start fresh.

**Side Effects**:
- Clears all messages except system prompt
- Resets state and metrics
- Allows new conversation to begin

## Examples

### Basic Usage

```typescript
import { createConversationLoop, createConfigurableAgent } from "@mrck-labs/grid-core";

// Create an agent
const agent = createConfigurableAgent({
  // ... agent configuration
});

// Create conversation loop
const loop = await createConversationLoop({
  agent,
  systemPrompt: "You are a helpful assistant"
});

// Send a message and get response
const response = await loop.sendMessage("Hello! What can you help me with?");
console.log(response.content);

// Send another message - maintains context
const response2 = await loop.sendMessage("Can you explain quantum computing?");
console.log(response2.content);
```

### With Tool Execution

```typescript
const loop = await createConversationLoop({
  agent: agentWithTools,
  toolExecutor: myToolExecutor,
  onProgress: (update) => {
    console.log(`[${update.type}] ${update.message}`);
  }
});

// User asks something requiring tools
const response = await loop.sendMessage("What's the weather in Paris?");

// Progress updates:
// [thinking] Processing your request...
// [tool_execution] Executing tool: get_weather
// [tool_result] Weather data retrieved
// [complete] Response ready

console.log(response.content); // "The weather in Paris is..."
```

### With Lifecycle Handlers

```typescript
const loop = await createConversationLoop({
  agent,
  handlers: {
    loop: {
      onConversationStarted: async (context) => {
        console.log("New conversation started");
        
        // Load previous messages if user has history
        const userId = context.getUserId();
        if (userId) {
          const previousMessages = await database.messages.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 10
          });
          
          return { initialMessages: previousMessages.reverse() };
        }
      },
      
      onMessageSent: async (message, context) => {
        await database.audit.create({
          data: {
            type: "user_message",
            content: message,
            userId: context.getUserId(),
            sessionId: context.getSessionId(),
            timestamp: new Date()
          }
        });
      },
      
      onResponseReceived: async (response, context) => {
        await database.audit.create({
          data: {
            type: "agent_response",
            content: response.content,
            toolCallsCount: response.toolCalls?.length || 0,
            sessionId: context.getSessionId(),
            timestamp: new Date()
          }
        });
      },
      
      onConversationEnded: async (summary, context) => {
        await database.sessions.update({
          where: { id: context.getSessionId() },
          data: {
            endedAt: new Date(),
            summary: JSON.stringify(summary),
            status: "completed"
          }
        });
      }
    }
  }
});
```

### Real-time Progress Updates

```typescript
const loop = await createConversationLoop({
  agent,
  onProgress: (update) => {
    // Send to WebSocket for real-time UI updates
    websocket.emit('conversation:progress', {
      type: update.type,
      message: update.message,
      timestamp: update.timestamp,
      metadata: update.metadata
    });
  }
});

// Progress update types:
// - "thinking": LLM is processing
// - "tool_execution": Tool is being executed
// - "tool_result": Tool execution completed
// - "error": An error occurred
// - "complete": Response is ready
```

### State Management

```typescript
const loop = await createConversationLoop({
  agent,
  handlers: {
    context: {
      onStateChanged: async (key, value) => {
        await redis.hset(`session:${sessionId}:state`, key, JSON.stringify(value));
      }
    }
  }
});

// Update state during conversation
await loop.updateState("user.name", "Alice");
await loop.updateState("conversation.topic", "technical-support");

// State is available to agent in prompts
const response = await loop.sendMessage("What's my name?");
// Agent can access state and respond: "Your name is Alice"
```

### Export and Import

```typescript
// Export conversation for persistence
const conversationData = loop.exportConversation();
await database.conversations.create({
  data: {
    userId: "user_123",
    exportData: JSON.stringify(conversationData),
    exportedAt: conversationData.exportedAt
  }
});

// Later: Import and continue conversation
const saved = await database.conversations.findFirst({
  where: { userId: "user_123" },
  orderBy: { exportedAt: 'desc' }
});

const newLoop = await createConversationLoop({ agent });
newLoop.importConversation(JSON.parse(saved.exportData));

// Continue where left off
const response = await newLoop.sendMessage("What were we discussing?");
```

### Analytics and Monitoring

```typescript
const loop = await createConversationLoop({ agent });

// Have a conversation
await loop.sendMessage("Hello!");
await loop.sendMessage("Can you help me with math?");
await loop.sendMessage("What's 25 * 4?");

// Get analytics
const analytics = loop.getAnalytics();
console.log(analytics);
// {
//   messageCount: 6, // Including system and responses
//   userMessageCount: 3,
//   assistantMessageCount: 3,
//   toolCallCount: 1, // Calculator was used
//   turnCount: 3,
//   duration: 15000, // 15 seconds
//   avgResponseTime: 5000, // 5 seconds average
//   isActive: true
// }

// End conversation
await loop.endConversation();
```

## Progress Message Types

The `onProgress` callback receives messages with these types:

- `"thinking"` - LLM is processing the request
- `"tool_execution"` - A tool is being executed
- `"tool_result"` - Tool execution completed
- `"error"` - An error occurred
- `"complete"` - Final response is ready
- `"info"` - General information update

## Best Practices

1. **Always handle errors** - Wrap sendMessage in try-catch for production
2. **Use lifecycle handlers** - Implement persistence and analytics through handlers
3. **Monitor progress** - Use onProgress for real-time user feedback
4. **Export long conversations** - Periodically export for recovery
5. **End conversations properly** - Call endConversation() for cleanup

## TypeScript Types

```typescript
interface ConversationAnalytics {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  toolCallCount: number;
  turnCount: number;
  duration: number;
  avgResponseTime: number;
  isActive: boolean;
}

interface ConversationExport {
  messages: ChatMessage[];
  state: Record<string, any>;
  metadata: Record<string, any>;
  analytics: ConversationAnalytics;
  exportedAt: number;
}

interface SendMessageResult {
  content: string | null;
  role: "assistant";
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}

interface ProgressMessage {
  type: "thinking" | "tool_execution" | "tool_result" | "error" | "complete" | "info";
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

## Related APIs

- [`createConversationManager`](./conversation-manager) - Underlying manager
- [`createConfigurableAgent`](../factories/configurable-agent) - Create agents
- [`createToolExecutor`](../services/tool-executor) - Tool execution service