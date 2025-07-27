---
sidebar_position: 2
---

# createConversationContext

Creates a context manager for storing conversation state, metadata, and metrics.

## Overview

`createConversationContext` is an atomic primitive that manages contextual information and metadata for conversations. It provides state management with nested key support, automatic metric tracking, and event handlers for persistence.

**Independence**: This primitive stands alone - use it without any other Grid components for state management, user preferences, session tracking, or analytics. No conversation history or manager required.

## Import

```typescript
import { createConversationContext } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createConversationContext(
  options?: ConversationContextOptions
): ConversationContext
```

## Parameters

### options (optional)
- **Type**: `ConversationContextOptions`
- **Properties**:
  - `handlers` (optional)
    - **Type**: `ConversationContextHandlers`
    - **Properties**:
      - `onStateChanged`: `(key: string, value: any) => Promise<void>`
        - Called when state is updated
      - `onMetadataChanged`: `(key: string, value: any) => Promise<void>`
        - Called when metadata is updated

## Return Type: ConversationContext

### Methods

#### updateState
```typescript
updateState(key: string, value: any): Promise<void>
```
Update a single state value. Supports nested keys using dot notation.

**Parameters**:
- `key`: State key (supports dot notation for nesting)
- `value`: Value to set

**Example**:
```typescript
await context.updateState("user.name", "Alice");
await context.updateState("user.preferences.theme", "dark");
```

#### updateStates
```typescript
updateStates(updates: Record<string, any>): Promise<void>
```
Update multiple state values at once.

**Parameters**:
- `updates`: Object with key-value pairs to update

**Example**:
```typescript
await context.updateStates({
  "user.name": "Alice",
  "user.preferences.language": "en",
  "session.startTime": Date.now()
});
```

#### getState
```typescript
getState(): Record<string, any>
```
Get a copy of the entire state object.

**Returns**: Deep copy of the current state

#### getStateValue
```typescript
getStateValue(key: string): any
```
Get a specific state value by key. Supports nested keys.

**Parameters**:
- `key`: State key (supports dot notation)

**Returns**: The value at the specified key, or undefined

**Example**:
```typescript
const userName = context.getStateValue("user.name");
const theme = context.getStateValue("user.preferences.theme");
```

#### updateMetadata
```typescript
updateMetadata(key: string, value: any): Promise<void>
```
Update metadata about the conversation.

**Parameters**:
- `key`: Metadata key
- `value`: Value to set

**Example**:
```typescript
await context.updateMetadata("topic", "weather");
await context.updateMetadata("priority", "high");
```

#### getMetadata
```typescript
getMetadata(key?: string): any
```
Get metadata value(s).

**Parameters**:
- `key` (optional): Specific metadata key

**Returns**: 
- If key provided: The value for that key
- If no key: The entire metadata object

#### incrementMessageCount
```typescript
incrementMessageCount(): void
```
Increment the internal message counter.

#### incrementToolCallCount
```typescript
incrementToolCallCount(count: number = 1): void
```
Increment the tool call counter.

**Parameters**:
- `count`: Number to increment by (default: 1)

#### getMetrics
```typescript
getMetrics(): ConversationMetrics
```
Get conversation metrics.

**Returns**: Object containing:
- `messageCount`: Total messages processed
- `toolCallCount`: Total tool calls made
- `startTime`: Conversation start timestamp
- `duration`: Time since conversation started (ms)

#### getSessionId
```typescript
getSessionId(): string
```
Get the auto-generated session ID.

**Returns**: Unique session identifier

#### getUserId
```typescript
getUserId(): string | undefined
```
Get the user ID if set in state.

**Returns**: User ID from state["user.id"] or undefined

#### resetState
```typescript
resetState(): Promise<void>
```
Clear all state while preserving metadata and metrics.

#### getSnapshot
```typescript
getSnapshot(): ConversationSnapshot
```
Get a complete snapshot of context for persistence.

**Returns**: Object containing:
- `state`: Current state object
- `metadata`: Current metadata object
- `metrics`: Current metrics
- `sessionId`: Session identifier

## Examples

### Basic State Management

```typescript
const context = createConversationContext();

// Set user information
await context.updateState("user.name", "Alice");
await context.updateState("user.id", "user_123");

// Set preferences
await context.updateStates({
  "user.preferences.language": "en",
  "user.preferences.timezone": "America/New_York",
  "user.preferences.notifications": true
});

// Get values
const userName = context.getStateValue("user.name"); // "Alice"
const language = context.getStateValue("user.preferences.language"); // "en"
const allState = context.getState(); // Returns full state object
```

### With Event Handlers

```typescript
const context = createConversationContext({
  handlers: {
    onStateChanged: async (key, value) => {
      console.log(`State updated: ${key} = ${value}`);
      await database.state.upsert({
        where: { key },
        update: { value, updatedAt: new Date() },
        create: { key, value, sessionId: context.getSessionId() }
      });
    },
    onMetadataChanged: async (key, value) => {
      console.log(`Metadata updated: ${key} = ${value}`);
      await database.metadata.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }
  }
});
```

### Metadata and Metrics

```typescript
const context = createConversationContext();

// Set conversation metadata
await context.updateMetadata("topic", "technical-support");
await context.updateMetadata("priority", "high");
await context.updateMetadata("tags", ["billing", "subscription"]);

// Track activity
context.incrementMessageCount(); // User message
context.incrementMessageCount(); // Assistant response
context.incrementToolCallCount(2); // Two tools used

// Get metrics
const metrics = context.getMetrics();
console.log(metrics);
// {
//   messageCount: 2,
//   toolCallCount: 2,
//   startTime: 1234567890,
//   duration: 5000
// }

// Get specific metadata
const topic = context.getMetadata("topic"); // "technical-support"
const allMetadata = context.getMetadata(); // All metadata
```

### Persistence and Restoration

```typescript
// Save context
const snapshot = context.getSnapshot();
await database.sessions.create({
  data: {
    sessionId: snapshot.sessionId,
    snapshot: JSON.stringify(snapshot),
    savedAt: new Date()
  }
});

// Later: Restore context
const saved = await database.sessions.findUnique({ 
  where: { sessionId } 
});
const savedSnapshot = JSON.parse(saved.snapshot);

// Create new context and restore state
const newContext = createConversationContext();
Object.entries(savedSnapshot.state).forEach(([key, value]) => {
  newContext.updateState(key, value);
});
Object.entries(savedSnapshot.metadata).forEach(([key, value]) => {
  newContext.updateMetadata(key, value);
});
```

### Complex State Management

```typescript
const context = createConversationContext();

// Build complex user profile
await context.updateStates({
  "user.id": "user_123",
  "user.name": "Alice Johnson",
  "user.email": "alice@example.com",
  "user.subscription.plan": "premium",
  "user.subscription.expiresAt": "2024-12-31",
  "user.settings.theme": "dark",
  "user.settings.language": "en",
  "user.settings.notifications.email": true,
  "user.settings.notifications.push": false
});

// Track conversation flow
await context.updateStates({
  "conversation.intent": "support",
  "conversation.subIntent": "billing",
  "conversation.sentiment": "frustrated",
  "conversation.resolution": "pending"
});

// Get nested values
const plan = context.getStateValue("user.subscription.plan"); // "premium"
const emailNotifs = context.getStateValue("user.settings.notifications.email"); // true
```

## Best Practices

1. **Use dot notation for organization** - Structure state hierarchically (e.g., "user.preferences.theme")
2. **Leverage event handlers** - Implement persistence through the handler callbacks
3. **Track metrics consistently** - Call increment methods when processing messages/tools
4. **Separate state from metadata** - Use state for conversation data, metadata for categorization
5. **Take snapshots regularly** - Use getSnapshot() for checkpointing long conversations

## TypeScript Types

```typescript
interface ConversationMetrics {
  messageCount: number;
  toolCallCount: number;
  startTime: number;
  duration: number;
}

interface ConversationSnapshot {
  state: Record<string, any>;
  metadata: Record<string, any>;
  metrics: ConversationMetrics;
  sessionId: string;
}
```

## Related APIs

- [`createConversationHistory`](./conversation-history) - For managing message history
- [`createConversationManager`](./conversation-manager) - Combines history and context
- [`createConversationLoop`](./conversation-loop) - Full conversation orchestration