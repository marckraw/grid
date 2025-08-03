---
sidebar_position: 3
---

# Memory Types 🚧

:::warning Beta Feature
Memory types are currently in beta and may change in future releases.
:::

Type definitions for the Grid memory system.

## Core Types

### MemoryEvent

The fundamental unit of memory - a signal-agnostic event structure.

```typescript
interface MemoryEvent {
  timestamp: string;    // ISO 8601 timestamp
  type: string;         // Hierarchical event type
  data: any;            // Flexible payload
  metadata?: {
    source?: string;         // Event origin
    agentId?: string;        // Creating agent
    userId?: string;         // Associated user
    conversationId?: string; // Conversation context
    priority?: number;       // 1-5 scale
    tags?: string[];         // Categorization
    [key: string]: any;      // Extensible
  };
}
```

#### Usage Examples

```typescript
// Conversation event
const conversationEvent: MemoryEvent = {
  timestamp: "2025-01-15T10:30:00.000Z",
  type: "conversation.user.message",
  data: { 
    message: "Hello, AI!",
    intent: "greeting"
  },
  metadata: {
    source: "chat",
    conversationId: "conv_123",
    userId: "user_456",
    tags: ["greeting", "conversation-start"],
    priority: 3
  }
};

// GitHub event
const githubEvent: MemoryEvent = {
  timestamp: "2025-01-15T14:20:00.000Z",
  type: "github.pr.merged",
  data: {
    repository: "mrck-labs/grid",
    prNumber: 42,
    title: "Add memory system"
  },
  metadata: {
    source: "github",
    userId: "dev_789",
    tags: ["development", "feature"],
    priority: 4
  }
};

// IoT sensor event
const sensorEvent: MemoryEvent = {
  timestamp: "2025-01-15T08:00:00.000Z",
  type: "sensor.temperature.reading",
  data: {
    value: 22.5,
    unit: "celsius",
    location: "office"
  },
  metadata: {
    source: "iot",
    deviceId: "temp_sensor_01",
    tags: ["environment", "monitoring"],
    priority: 2
  }
};
```

### STMService

Interface for Short-Term Memory operations.

```typescript
interface STMService {
  log: (event: Omit<MemoryEvent, 'timestamp'>) => Promise<void>;
  getRecent: (hours?: number) => Promise<MemoryEvent[]>;
  getByType: (type: string, limit?: number) => Promise<MemoryEvent[]>;
  clear: () => Promise<void>;
  getLogPath: () => string;
}
```

### STMConfig

Configuration for STM service.

```typescript
interface STMConfig {
  logPath?: string;  // Default: './memory/stm.jsonl'
}
```

### MTMSummary

Daily summary structure for Mid-Term Memory.

```typescript
interface MTMSummary {
  date: string;                          // YYYY-MM-DD format
  extractedFacts: {
    userName?: string;                   // Identified user name
    userPreferences?: string[];          // Extracted preferences
    keyTopics?: string[];                // Main discussion topics
    importantEvents?: string[];          // Significant occurrences
    relationships?: Record<string, string>; // Key relationships
    [key: string]: any;                  // Domain-specific facts
  };
  conversations: {
    count: number;                       // Number of conversations
    totalMessages: number;               // Total message count
    avgLength: number;                   // Average message length
    topics: string[];                    // Conversation topics
  };
  eventStatistics: Record<string, number>; // Event type counts
  highlights: string[];                    // Key moments
  createdAt: string;                      // Summary creation time
}
```

### MTMService

Interface for Mid-Term Memory operations.

```typescript
interface MTMService {
  summarizeDay: (date?: Date) => Promise<MTMSummary>;
  getSummary: (date: Date) => Promise<MTMSummary | null>;
  getSummaryMarkdown: (date: Date) => Promise<string | null>;
  listSummaries: () => Promise<string[]>;
  searchFacts: (query: string) => Promise<MTMSummary[]>;
  getStoragePath: () => string;
}
```

### MTMConfig

Configuration for MTM service.

```typescript
interface MTMConfig {
  storagePath?: string;     // Default: './memory/mtm'
  llmService?: LLMService;  // Optional LLM for fact extraction
}
```

## Event Type Conventions

### Hierarchical Naming

Use dot notation for event type hierarchy:

```typescript
// Good
"conversation.user.message"
"conversation.agent.response"
"github.pr.opened"
"sensor.temperature.reading"

// Avoid
"userMessage"
"agentResponse"
"prOpened"
"tempReading"
```

### Common Prefixes

| Prefix | Description | Examples |
|--------|-------------|----------|
| `conversation.*` | Chat interactions | `conversation.started`, `conversation.user.message` |
| `tool.*` | Tool executions | `tool.execution`, `tool.error` |
| `github.*` | GitHub events | `github.pr.merged`, `github.issue.created` |
| `user.*` | User actions | `user.login`, `user.preference.changed` |
| `system.*` | System events | `system.error`, `system.startup` |
| `sensor.*` | IoT readings | `sensor.motion.detected`, `sensor.temperature.reading` |

## Metadata Standards

### Priority Levels

```typescript
enum Priority {
  LOW = 1,      // Background events
  NORMAL = 2,   // Regular events
  MEDIUM = 3,   // Important events
  HIGH = 4,     // Critical events
  URGENT = 5    // Immediate attention
}
```

### Tag Conventions

Use consistent, lowercase tags:

```typescript
// Good tags
["user-input", "greeting", "question"]
["error", "api-failure", "retry-needed"]
["feature-request", "enhancement", "ui"]

// Avoid
["UserInput", "GREETING", "Question?"]
["ERROR!!!", "api_failure", "retry needed"]
```

## Type Guards

Utility functions for type checking:

```typescript
// Check if event is a conversation message
function isConversationMessage(event: MemoryEvent): boolean {
  return event.type.startsWith('conversation.') && 
         event.type.includes('message');
}

// Check if event has high priority
function isHighPriority(event: MemoryEvent): boolean {
  return (event.metadata?.priority ?? 0) >= 4;
}

// Check if event is from specific source
function isFromSource(event: MemoryEvent, source: string): boolean {
  return event.metadata?.source === source;
}
```

## Future Types (Planned)

### LTMPattern
```typescript
// Coming in Phase 3
interface LTMPattern {
  id: string;
  pattern: string;
  frequency: number;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  examples: MemoryEvent[];
}
```

### MemoryQuery
```typescript
// Coming in Phase 2
interface MemoryQuery {
  layers: ('stm' | 'mtm' | 'ltm')[];
  timeRange?: { start: Date; end: Date };
  types?: string[];
  tags?: string[];
  confidence?: number;
  limit?: number;
}
```

## Best Practices

1. **Type Safety**: Use TypeScript interfaces for all events
2. **Consistent Naming**: Follow hierarchical naming conventions
3. **Rich Metadata**: Include relevant context for filtering
4. **Extensibility**: Use index signatures for domain-specific data
5. **Validation**: Validate events before logging

## Related

- [STM Service](/docs/sdk-reference/services/memory/stm-service) - STM implementation
- [MTM Service](/docs/sdk-reference/services/memory/mtm-service) - MTM implementation
- [Memory Tools](/docs/sdk-reference/tools/memory-tools) - Memory query tools