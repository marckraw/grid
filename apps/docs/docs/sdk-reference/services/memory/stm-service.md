---
sidebar_position: 1
---

# createSimpleSTMService 🚧

:::warning Beta Feature
The STM service is currently in beta. APIs may change in future releases.
:::

Creates a Short-Term Memory service for logging and retrieving raw events.

## Overview

`createSimpleSTMService` provides a file-based implementation of Short-Term Memory (STM) that logs events in JSONL format. It's designed to capture all signals and events with high fidelity for later processing and retrieval.

## Import

```typescript
import { createSimpleSTMService } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createSimpleSTMService(
  config?: STMConfig
): STMService
```

## Parameters

### config (optional)
- **Type**: `STMConfig`
- **Properties**:
  - `logPath` (optional)
    - **Type**: `string`
    - **Default**: `'./memory/stm.jsonl'`
    - **Description**: Path to the JSONL log file

## Return Type: STMService

### Methods

#### log
```typescript
log(event: Omit<MemoryEvent, 'timestamp'>): Promise<void>
```
Logs an event to STM with automatic timestamp.

**Parameters:**
- `event`: Event to log (without timestamp)
  - `type`: Event type (e.g., 'conversation.message')
  - `data`: Event payload (any structure)
  - `metadata`: Optional metadata

**Example:**
```typescript
await stm.log({
  type: 'conversation.user.message',
  data: { message: 'Hello, AI!' },
  metadata: {
    source: 'chat',
    userId: 'user123',
    tags: ['greeting']
  }
});
```

#### getRecent
```typescript
getRecent(hours?: number): Promise<MemoryEvent[]>
```
Retrieves recent events within the specified time window.

**Parameters:**
- `hours`: Number of hours to look back (default: 24)

**Returns:** Array of memory events

**Example:**
```typescript
const recentEvents = await stm.getRecent(48); // Last 48 hours
```

#### getByType
```typescript
getByType(type: string, limit?: number): Promise<MemoryEvent[]>
```
Retrieves events of a specific type.

**Parameters:**
- `type`: Event type to filter by
- `limit`: Maximum number of events to return (default: 100)

**Returns:** Array of memory events

**Example:**
```typescript
const userMessages = await stm.getByType('conversation.user.message', 20);
```

#### clear
```typescript
clear(): Promise<void>
```
Clears all events from STM.

**Example:**
```typescript
await stm.clear(); // Removes all events
```

#### getLogPath
```typescript
getLogPath(): string
```
Returns the path to the log file.

**Example:**
```typescript
const path = stm.getLogPath(); // './memory/stm.jsonl'
```

## Event Structure

### MemoryEvent
```typescript
interface MemoryEvent {
  timestamp: string;              // ISO 8601 timestamp
  type: string;                   // Event type identifier
  data: any;                      // Event payload
  metadata?: {
    source?: string;              // Event source
    agentId?: string;             // Agent that created event
    userId?: string;              // Associated user
    conversationId?: string;      // Conversation context
    priority?: number;            // 1-5 priority
    tags?: string[];              // Categorization tags
    [key: string]: any;           // Additional metadata
  };
}
```

## Usage Examples

### Basic Usage
```typescript
const stm = createSimpleSTMService();

// Log a conversation message
await stm.log({
  type: 'conversation.user.message',
  data: { message: 'What is the weather?' }
});

// Retrieve recent messages
const recent = await stm.getRecent(1); // Last hour
```

### With Custom Path
```typescript
const stm = createSimpleSTMService({
  logPath: './data/memory/events.jsonl'
});
```

### Integration with Handlers
```typescript
const conversationHandlers = {
  onMessageSent: async (message, context) => {
    await stm.log({
      type: 'conversation.user.message',
      data: { message },
      metadata: {
        source: 'conversation',
        conversationId: context.conversationId,
        userId: context.userId,
        tags: ['user-input']
      }
    });
  }
};
```

## File Format

Events are stored in JSONL (JSON Lines) format:
```jsonl
{"timestamp":"2025-01-15T10:30:00.000Z","type":"conversation.started","data":{...},"metadata":{...}}
{"timestamp":"2025-01-15T10:30:15.000Z","type":"conversation.user.message","data":{...},"metadata":{...}}
```

## Performance Considerations

- STM files can grow large over time
- Consider implementing rotation or archival
- File operations are synchronous (may block)
- No built-in indexing (linear search for queries)

## Best Practices

1. **Event Types**: Use hierarchical naming (e.g., 'conversation.user.message')
2. **Metadata**: Include relevant context for filtering
3. **Tags**: Use consistent tag taxonomy
4. **Cleanup**: Implement regular cleanup or rotation
5. **Backup**: Regular backups recommended

## Future Enhancements

- Database adapters (PostgreSQL, MongoDB)
- Built-in rotation and archival
- Indexed search capabilities
- Streaming API for large datasets
- Compression support

## Related

- [MTM Service](/docs/sdk-reference/services/memory/mtm-service) - Mid-term memory
- [Memory Types](/docs/sdk-reference/services/memory/memory-types) - Type definitions
- [Memory Tools](/docs/sdk-reference/tools/memory-tools) - Agent memory tools