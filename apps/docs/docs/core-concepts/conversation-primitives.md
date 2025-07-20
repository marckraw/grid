---
sidebar_position: 6
---

# Conversation Primitives

Grid provides a hierarchical set of conversation primitives that enable flexible conversation management. All primitives use a closure-based functional pattern - no classes, just functions returning objects with methods.

## Architecture Overview

Grid's conversation primitives are organized in three layers:

```
┌─────────────────────────────────────────┐
│          Organism Level                 │
│  (createConversationFlow)               │  ← Safety & Progress
│  (createConversationLoop)               │  ← Full Orchestration
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│          Composed Level                 │
│    (createConversationManager)          │  ← Unified Interface
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│           Atomic Level                  │
│  (createConversationHistory)            │  ← Message Storage
│  (createConversationContext)            │  ← State Management
└─────────────────────────────────────────┘
```

## Closure-Based Pattern

All primitives follow the same implementation pattern:

```typescript
export const createPrimitive = (options?: PrimitiveOptions) => {
  // Private state in closure
  const privateState = { /* ... */ };
  
  // Private helper functions
  const helperFunction = () => { /* ... */ };
  
  // Return public API
  return {
    publicMethod: () => {
      // Access and modify private state
      return /* ... */;
    },
    anotherMethod: () => { /* ... */ },
  };
};
```

## Atomic Primitives

### createConversationHistory

Manages the storage and retrieval of conversation messages.

```typescript
import { createConversationHistory } from "@mrck-labs/grid-core";

const history = createConversationHistory("You are a helpful assistant");

// Add messages
history.addMessage({ role: "user", content: "Hello!" });
history.addMessage({ 
  role: "assistant", 
  content: "Hi there! How can I help?" 
});

// Add tool responses
history.addToolResponse(
  "call_123",           // toolCallId
  "get_weather",        // toolName
  "72°F and sunny"      // result
);

// Access messages
const all = history.getMessages();
const nonSystem = history.getNonSystemMessages();
const lastUser = history.getLastMessageByRole("user");

// Message metrics
const userCount = history.getMessageCountByRole("user");
const hasMessages = history.hasMessages();

// Clear (preserves system message)
history.clear();
```

**Key Features:**
- System message preservation
- Tool response handling
- Message filtering by role
- Immutable message access (returns copies)

### createConversationContext

Manages contextual information and conversation metadata.

```typescript
import { createConversationContext } from "@mrck-labs/grid-core";

const context = createConversationContext();

// State management
context.updateState("user.name", "Alice");
context.updateStates({
  "user.preferences.language": "en",
  "user.preferences.timezone": "PST",
  "session.id": "sess_123",
});

// Access state
const state = context.getState(); // Returns copy
const userName = context.getStateValue("user.name");

// Metadata tracking
context.updateMetadata("topic", "weather");
context.incrementMessageCount();
context.incrementToolCallCount(2);

// Get metrics
const metrics = context.getMetrics();
// { messageCount: 5, toolCallCount: 2, startTime: Date, ... }

// Snapshot for persistence
const snapshot = context.getSnapshot();
```

**Key Features:**
- Nested state management
- Automatic metric tracking
- Metadata for categorization
- Snapshot/restore capability

## Composed Primitives

### createConversationManager

Combines history and context into a unified interface.

```typescript
import { createConversationManager } from "@mrck-labs/grid-core";

const manager = createConversationManager("You are a helpful assistant");

// Unified message handling
manager.addUserMessage("What's the weather?");

// Process agent responses
manager.processAgentResponse({
  content: "I'll check the weather for you.",
  toolCalls: [{
    id: "call_123",
    name: "get_weather",
    args: { location: "SF" },
  }],
});

// Add tool results
manager.addToolResponse("call_123", "get_weather", "72°F");

// Combined state access
const state = manager.getConversationState();
// {
//   messages: [...],
//   context: { ... },
//   metrics: { messageCount: 3, ... }
// }

// Get summary
const summary = manager.getSummary();
// {
//   messageCount: 3,
//   lastUserMessage: "What's the weather?",
//   lastAssistantMessage: "I'll check...",
//   hasToolCalls: true
// }

// State management (delegated to context)
manager.updateState("weather.location", "San Francisco");

// Reset everything
manager.reset();
```

**Key Features:**
- Automatic metric tracking
- Unified interface for history and context
- Convenient summary generation
- Method delegation to underlying services

## Organism Primitives

### createConversationLoop

Orchestrates complete conversation flows with agent integration.

```typescript
import { createConversationLoop } from "@mrck-labs/grid-core";

const loop = createConversationLoop({
  agent: myAgent,
  systemPrompt: "You are a helpful assistant",
  toolExecutor: myToolExecutor,
});

// Send messages with automatic tool resolution
const response = await loop.sendMessage("What's the weather in Paris?");
console.log(response.content);

// With custom tool resolution rounds
const response2 = await loop.sendMessageWithToolResolution(
  "Book a flight and hotel",
  maxToolRounds = 10  // Allow up to 10 rounds of tool calls
);

// Analytics
const analytics = loop.getAnalytics();
// {
//   messageCount: 4,
//   toolCallCount: 3,
//   turnCount: 2,
//   duration: 45000,
//   isActive: true
// }

// Export/Import conversations
const exported = loop.exportConversation();
// Save to database...

// Later...
const newLoop = createConversationLoop(options);
newLoop.importConversation(exported);

// Lifecycle management
loop.endConversation();
loop.resetConversation();
```

**Key Features:**
- Automatic tool call resolution
- Turn counting and analytics
- Export/import for persistence
- Conversation lifecycle management
- Multi-round tool execution

### createConversationFlow

Enhanced conversation loop with safety features and progress streaming.

```typescript
import { createConversationFlow } from "@mrck-labs/grid-core";

const flow = createConversationFlow({
  agent: myAgent,
  systemPrompt: "You are a helpful assistant",
  maxIterations: 10,  // Safety limit
  onProgress: (update) => {
    console.log(`[${update.type}] ${update.message}`);
    // update.metadata includes iteration count and elapsed time
  },
});

// Send message with progress tracking
const response = await flow.sendMessage("Complex task");
// Console output:
// [thinking] Processing your message...
// [tool_execution] Running calculate_statistics...
// [complete] Response generated successfully

// Flow-specific statistics
const stats = flow.getFlowStats();
// {
//   iterations: 3,
//   maxIterations: 10,
//   elapsedTime: 15234,
//   canContinue: true
// }

// Reset flow state without losing conversation
flow.resetFlowState();

// All loop methods are available
const messages = flow.getMessages();
const exported = flow.exportConversation();
```

**Key Features:**
- Iteration limiting (prevents infinite loops)
- Real-time progress streaming
- Flow-specific metrics
- Enhanced error handling
- Inherits all loop functionality

## Usage Patterns

### Simple Conversation

```typescript
// For basic Q&A
const history = createConversationHistory();
history.addMessage({ role: "user", content: "Hello" });
history.addMessage({ role: "assistant", content: "Hi!" });
```

### Stateful Conversation

```typescript
// For conversations needing context
const manager = createConversationManager();
manager.addUserMessage("My name is Alice");
manager.updateState("user.name", "Alice");
manager.processAgentResponse({
  content: "Nice to meet you, Alice!",
});
```

### Agent-Powered Conversation

```typescript
// For full agent integration
const loop = createConversationLoop({
  agent: createConfigurableAgent({ /* ... */ }),
});
const response = await loop.sendMessage("Help me plan a trip");
```

### Production Conversation

```typescript
// For production with safety and monitoring
const flow = createConversationFlow({
  agent: productionAgent,
  maxIterations: 20,
  onProgress: (update) => {
    logger.info("Progress", update);
    websocket.emit("progress", update);
  },
});
```

## Best Practices

### 1. Choose the Right Level

- Use **atomic primitives** for fine-grained control
- Use **composed primitives** for standard use cases
- Use **organism primitives** for complete solutions

### 2. Leverage Closure Benefits

```typescript
// Private state is truly private
const history = createConversationHistory();
// No way to directly access internal messages array
// Must use public methods
```

### 3. Composition Over Inheritance

```typescript
// Compose primitives for custom behavior
const createCustomFlow = (options) => {
  const flow = createConversationFlow(options);
  const analytics = createAnalyticsTracker();
  
  return {
    ...flow,
    sendMessage: async (msg) => {
      analytics.track("message.sent");
      const response = await flow.sendMessage(msg);
      analytics.track("message.completed");
      return response;
    },
  };
};
```

### 4. Handle Errors Gracefully

```typescript
const flow = createConversationFlow({
  onProgress: (update) => {
    if (update.type === "error") {
      errorReporter.log(update.message);
    }
  },
});
```

### 5. Use TypeScript

All primitives are fully typed:

```typescript
import type { 
  ConversationHistory,
  ConversationContext,
  ConversationManager,
  ConversationLoop,
  ConversationFlow,
} from "@mrck-labs/grid-core";
```

## Migration Guide

If coming from class-based systems:

```typescript
// Instead of:
const history = new ConversationHistory();

// Use:
const history = createConversationHistory();

// Instead of:
class CustomHistory extends ConversationHistory { }

// Use composition:
const createCustomHistory = () => {
  const base = createConversationHistory();
  return {
    ...base,
    customMethod: () => { /* ... */ },
  };
};
```

## Next Steps

- [Services Architecture](/docs/core-concepts/services-architecture) - Deep dive into service patterns
- [Conversation Management](/docs/core-concepts/conversation-management) - Advanced conversation patterns
- [Building Custom Tools](/docs/guides/building-custom-tools) - Extend conversations with tools