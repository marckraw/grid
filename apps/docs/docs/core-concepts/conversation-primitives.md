---
sidebar_position: 6
---

# Conversation Primitives

Grid provides a hierarchical set of conversation primitives that enable flexible conversation management. **Each primitive can be used independently** - you don't need to use all layers. All primitives use a closure-based functional pattern - no classes, just functions returning objects with methods.

## Independence by Design

**Important**: While these primitives work beautifully together, each one is designed to function independently:

- **Use only what you need** - Don't want the manager? Use atomic primitives directly
- **No forced dependencies** - Each layer is optional
- **Mix and match** - Combine primitives however suits your needs
- **Future-proof** - Start simple, add layers as requirements grow

## Architecture Overview

Grid's conversation primitives are organized in three layers:

```
┌─────────────────────────────────────────┐
│          Organism Level                 │
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

Manages the storage and retrieval of conversation messages with optional event handlers.

```typescript
import { createConversationHistory } from "@mrck-labs/grid-core";

const history = createConversationHistory("You are a helpful assistant", {
  // Optional event handlers for persistence
  onMessageAdded: async (message) => {
    console.log("Message added:", message);
    await database.messages.create({ data: message });
  },
  onMessagesCleared: async () => {
    console.log("Messages cleared");
    await database.messages.deleteMany({ sessionId });
  },
});

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

// Clear (preserves system message, triggers onMessagesCleared)
history.clear();
```

**Key Features:**
- System message preservation
- Tool response handling
- Message filtering by role
- Immutable message access (returns copies)

### createConversationContext

Manages contextual information and conversation metadata with optional event handlers.

```typescript
import { createConversationContext } from "@mrck-labs/grid-core";

const context = createConversationContext({
  // Optional event handlers for persistence
  onStateChanged: async (key, value) => {
    console.log(`State changed: ${key} = ${value}`);
    await database.state.upsert({ key, value });
  },
  onMetadataChanged: async (key, value) => {
    console.log(`Metadata changed: ${key} = ${value}`);
    await database.metadata.upsert({ key, value });
  },
});

// State management (triggers onStateChanged)
context.updateState("user.name", "Alice");
context.updateStates({
  "user.preferences.language": "en",
  "user.preferences.timezone": "PST",
  "session.id": "sess_123",
});

// Access state
const state = context.getState(); // Returns copy
const userName = context.getStateValue("user.name");

// Metadata tracking (triggers onMetadataChanged)
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

Combines history and context into a unified interface with grouped event handlers.

```typescript
import { createConversationManager } from "@mrck-labs/grid-core";

const manager = createConversationManager("You are a helpful assistant", {
  // Grouped handlers for clean organization
  manager: {
    onUserMessageAdded: async (message) => {
      await analytics.track("user_message", { message });
    },
    onAgentResponseProcessed: async (response) => {
      await analytics.track("agent_response", response);
    },
    onToolResponseAdded: async (toolCallId, toolName, result) => {
      await analytics.track("tool_executed", { toolName, result });
    },
  },
  // Delegate to underlying primitive handlers
  history: {
    onMessageAdded: async (message) => {
      await database.messages.create({ data: message });
    },
  },
  context: {
    onStateChanged: async (key, value) => {
      await database.state.upsert({ key, value });
    },
  },
});

// Unified message handling (triggers handlers)
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

Orchestrates complete conversation flows with agent integration and lifecycle event handlers.

```typescript
import { createConversationLoop } from "@mrck-labs/grid-core";

const loop = createConversationLoop({
  agent: myAgent,
  systemPrompt: "You are a helpful assistant",
  toolExecutor: myToolExecutor,
  handlers: {
    // Lifecycle event handlers
    onConversationStarted: async ({ sessionId, userId, conversationId }) => {
      console.log("Conversation started", { sessionId });
      // Load previous messages from database
      const messages = await database.messages.findMany({ 
        where: { sessionId } 
      });
      return { initialMessages: messages };
    },
    onMessageSent: async (message, context) => {
      console.log("Message sent:", message);
      await database.audit.create({ 
        type: "message_sent",
        content: message,
        context,
      });
    },
    onResponseReceived: async (response, context) => {
      console.log("Response received:", response);
      await database.audit.create({ 
        type: "response_received",
        response,
        context,
      });
    },
    onConversationEnded: async (summary, context) => {
      console.log("Conversation ended", summary);
      await database.sessions.update({
        where: { id: context.sessionId },
        data: { summary, endedAt: new Date() },
      });
    },
  },
});

// Send messages with automatic tool resolution
const response = await loop.sendMessage("What's the weather in Paris?");
console.log(response.content);

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

// Lifecycle management (triggers handlers)
loop.endConversation();
loop.resetConversation();
```

**Key Features:**
- Automatic tool call resolution
- Turn counting and analytics
- Export/import for persistence
- Conversation lifecycle management
- Multi-round tool execution

## Independent Usage Examples

### Using Only ConversationHistory

Perfect when you just need message storage:

```typescript
// No manager, no loop - just history
const history = createConversationHistory("System prompt");

// Use it directly for logging, auditing, or simple chats
await history.addMessage({ role: "user", content: "Hello" });
await history.addMessage({ role: "assistant", content: "Hi!" });

// That's it! No other primitives required
const messages = history.getMessages();
```

### Using Only ConversationContext

Great for state management without message tracking:

```typescript
// Just context - no history needed
const context = createConversationContext();

// Perfect for tracking user preferences, form state, etc.
await context.updateState("form.step", 1);
await context.updateState("user.preferences", { theme: "dark" });

// Access your state
const currentStep = context.getStateValue("form.step");
```

### Building Your Own Manager

Skip ConversationManager and build exactly what you need:

```typescript
// Custom combination of primitives
function createMyCustomFlow() {
  const history = createConversationHistory();
  const context = createConversationContext();
  
  return {
    // Only expose what you need
    addMessage: (msg: string) => history.addMessage({ role: "user", content: msg }),
    getState: () => context.getState(),
    updatePreference: (key: string, value: any) => 
      context.updateState(`prefs.${key}`, value)
  };
}
```

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
const llmService = baseLLMService({ langfuse: { enabled: false } });
const toolExecutor = createToolExecutor();

const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "travel-planner",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are a helpful travel planning assistant."
    },
    metadata: {
      id: "travel-planner",
      type: "general",
      name: "Travel Planner",
      description: "Helps plan trips and travel itineraries",
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

const loop = createConversationLoop({ agent });
const response = await loop.sendMessage("Help me plan a trip");
```

### Production Conversation

```typescript
// For production with monitoring
const loop = createConversationLoop({
  agent: productionAgent,
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
  const loop = createConversationLoop(options);
  const analytics = createAnalyticsTracker();
  
  return {
    ...loop,
    sendMessage: async (msg) => {
      analytics.track("message.sent");
      const response = await loop.sendMessage(msg);
      analytics.track("message.completed");
      return response;
    },
  };
};
```

### 4. Handle Errors Gracefully

```typescript
const loop = createConversationLoop({
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
- [Event Handlers](/docs/getting-started/event-handlers) - Implement persistence with events
- [Tools](/docs/core-concepts/tools) - Extend conversations with tools