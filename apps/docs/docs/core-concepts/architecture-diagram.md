---
sidebar_position: 7
---

# Architecture Overview

Grid's conversation primitives follow a layered architecture that provides flexibility and composability at every level.

## Visual Architecture

```
┌─────────────────────────────────────────────────┐
│              workflowLoop                       │  ← Future: Workflow patterns
│         (autonomous, guided, hybrid)            │     (not yet implemented)
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│            conversationLoop                     │  ← Organism: Full orchestration
│         (agent integration, tools)              │     Adds instrumentation
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│          conversationManager                    │  ← Composed: Unified interface
│        (combines history + context)             │     Optional convenience layer
└─────────────────────────────────────────────────┘
                    ↙     ↘
┌──────────────────────┐  ┌──────────────────────┐
│ conversationHistory  │  │ conversationContext  │  ← Atomic: Core primitives
│  (message storage)   │  │  (state management)  │     Can be used independently
└──────────────────────┘  └──────────────────────┘
```

## Layer Descriptions

### 🔧 Atomic Layer (Foundation)

The atomic primitives are the building blocks:

- **`conversationHistory`**: Manages message storage and retrieval
- **`conversationContext`**: Handles state, metadata, and metrics

These can be used completely independently:

```typescript
// Direct usage without any higher layers
const history = createConversationHistory();
const context = createConversationContext();

// Build your own custom flow
history.addMessage({ role: "user", content: "Hello" });
context.updateState("topic", "greeting");
```

### 🔗 Composed Layer (Convenience)

The manager combines atomic primitives for convenience:

- **`conversationManager`**: Unifies history and context with a single interface
- Provides helper methods that coordinate both primitives
- **Completely optional** - you can skip this and use atomics directly

```typescript
// Using the manager for convenience
const manager = createConversationManager();
manager.addUserMessage("Hello"); // Manages both history and context
```

### 🎯 Organism Layer (Orchestration)

The conversation loop adds full orchestration:

- **`conversationLoop`**: Integrates agents, handles tool execution, manages flow
- Provides lifecycle hooks and progress tracking
- Built on top of the manager (or can use primitives directly)

```typescript
// Full orchestration with agent integration
const loop = createConversationLoop({ agent });
const response = await loop.sendMessage("Hello");
```

### 🚀 Workflow Layer (Future)

Planned abstraction for different conversation patterns:

- **`workflowLoop`**: Will support autonomous, guided, and hybrid flows
- Different execution strategies and patterns
- Built on top of conversation loop

## Key Design Principles

### 1. Independence at Every Level

Each primitive can function independently:

```typescript
// Just history
const history = createConversationHistory();
// Use it alone for simple message tracking

// Just context  
const context = createConversationContext();
// Use it alone for state management

// Just manager (without loop)
const manager = createConversationManager();
// Use it for combined history+context without agents
```

### 2. Composability

Build exactly what you need:

```typescript
// Option 1: Use everything
const loop = createConversationLoop({ agent });

// Option 2: Use manager without loop
const manager = createConversationManager();
// Add your own agent integration

// Option 3: Use only atomics
const history = createConversationHistory();
const context = createConversationContext();
// Build completely custom solution
```

### 3. No Lock-in

The architecture doesn't force you into a specific pattern:

- Start with atomics and add layers as needed
- Use the manager for some parts, direct primitives for others
- Replace any layer with your own implementation

## Data Flow

```
User Input
    ↓
conversationLoop (if used)
    ↓
conversationManager (if used)
    ↙        ↘
History    Context
 ↓           ↓
Messages    State
```

### Shared Context

The context primitive is designed to be shared:
- Stores conversation state accessible by all layers
- Maintains metrics and metadata
- Can be passed between different components

### Message Flow

1. User message enters the system
2. Added to history (with event handlers)
3. Context updated (metrics, state)
4. Agent processes (if using loop)
5. Response added to history
6. Context updated again

## Common Patterns

### Pattern 1: Full Stack
Use all layers for complete functionality:

```typescript
const loop = createConversationLoop({
  agent: myAgent,
  handlers: { /* ... */ }
});
```

### Pattern 2: Custom Loop
Use manager but build your own loop:

```typescript
const manager = createConversationManager();

async function myCustomLoop() {
  while (active) {
    const input = await getUserInput();
    manager.addUserMessage(input);
    // Custom agent integration
    const response = await myAgent.process(manager.getMessages());
    manager.processAgentResponse(response);
  }
}
```

### Pattern 3: Direct Primitives
Build everything from scratch:

```typescript
const history = createConversationHistory();
const context = createConversationContext();

class MyConversationSystem {
  async processMessage(msg: string) {
    await history.addMessage({ role: "user", content: msg });
    await context.incrementMessageCount();
    // Completely custom implementation
  }
}
```

## When to Use Each Layer

### Use Atomic Primitives When:
- Building a custom conversation system
- Need fine-grained control
- Integrating with existing infrastructure
- Learning the system from ground up

### Use ConversationManager When:
- Want convenience methods
- Need unified history + context
- Building standard conversational flows
- Don't need agent integration yet

### Use ConversationLoop When:
- Need full agent integration
- Want automatic tool handling
- Building production applications
- Need progress tracking and lifecycle hooks

### Wait for WorkflowLoop When:
- Need specific workflow patterns
- Building autonomous agents
- Implementing complex multi-step flows
- Need guided or hybrid execution modes

## Migration Paths

### Starting Simple
```typescript
// Start with just history
const history = createConversationHistory();

// Later add context
const context = createConversationContext();

// Eventually upgrade to manager
const manager = createConversationManager();

// Finally add loop when needed
const loop = createConversationLoop({ agent });
```

### Top-Down Approach
```typescript
// Start with full loop
const loop = createConversationLoop({ agent });

// Access underlying primitives when needed
const messages = loop.manager.history.getMessages();
const state = loop.manager.context.getState();
```

## Best Practices

1. **Start at the right level** - Don't over-engineer, but don't under-build
2. **Use event handlers** - Available at every level for persistence
3. **Leverage the flexibility** - Mix and match approaches as needed
4. **Plan for growth** - Structure allows easy migration to higher levels

## Next Steps

- [Building Custom Flows](/docs/guides/custom-flows) - Learn to build without the manager
- [Choosing Primitives](/docs/guides/choosing-primitives) - Decision guide for architecture
- [Conversation Primitives](/docs/core-concepts/conversation-primitives) - Deep dive into each primitive