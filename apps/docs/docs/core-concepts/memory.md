---
sidebar_position: 9
---

# Memory System 🚧 Beta

:::warning Beta Feature
The memory system is currently in beta. APIs may change in future releases. 
Use in production with caution. We recommend testing with the terminal-agent example first.
:::

Learn how Grid's memory system enables agents to remember and learn from interactions across sessions.

## Overview

Grid's memory system provides a human-inspired, multi-layered approach to storing and retrieving information. Unlike simple conversation history, the memory system can extract facts, identify patterns, and maintain context across multiple sessions.

## Architecture

The memory system consists of three layers, each serving a specific purpose:

```
┌─────────────────────────────────────────────────┐
│                 Memory System                    │
├─────────────────────────────────────────────────┤
│  STM (Short-Term Memory)  │  Hours to Days      │
│  - Raw event logging       │  - High detail     │
│  - Complete history        │  - JSONL format    │
├─────────────────────────────────────────────────┤
│  MTM (Mid-Term Memory)     │  Days to Months    │
│  - Daily summaries         │  - Extracted facts │
│  - Key information         │  - JSON + Markdown │
├─────────────────────────────────────────────────┤
│  LTM (Long-Term Memory)    │  Permanent         │
│  - Patterns & knowledge    │  - Coming Soon     │
│  - Learned behaviors       │  - Future Release  │
└─────────────────────────────────────────────────┘
```

## Signal-Agnostic Design

The memory system is designed to work with any type of signal, not just conversations:

```typescript
interface MemoryEvent {
  timestamp: string;
  type: string;      // 'conversation.message', 'github.pr.merged', 'sensor.reading'
  data: any;         // Flexible payload
  metadata?: {
    source?: string;
    agentId?: string;
    userId?: string;
    tags?: string[];
    priority?: number;
  };
}
```

This flexibility allows the memory system to:
- Track conversations
- Monitor GitHub events
- Record sensor data
- Log user actions
- Store any domain-specific events

## Current Implementation

### STM (Short-Term Memory)

STM provides raw event logging with immediate storage:

```typescript
import { createSimpleSTMService } from "@mrck-labs/grid-core";

const stm = createSimpleSTMService({
  logPath: './memory/stm.jsonl'
});

// Log any event
await stm.log({
  type: 'user.preference',
  data: { preference: 'dark-mode', value: true },
  metadata: {
    source: 'settings',
    userId: 'user123'
  }
});

// Retrieve recent events
const recentEvents = await stm.getRecent(24); // Last 24 hours
const userMessages = await stm.getByType('conversation.user.message', 10);
```

### MTM (Mid-Term Memory)

MTM creates daily summaries with fact extraction:

```typescript
import { createMTMService } from "@mrck-labs/grid-core";

const mtm = createMTMService({
  stm,
  llmService: baseLLMService(),
  config: { storagePath: './memory/mtm' }
});

// Create daily summary
const summary = await mtm.summarizeDay();

// Search for facts
const results = await mtm.searchFacts("user preferences");
```

MTM provides hybrid storage:
- **JSON files** for structured queries
- **Markdown files** for human-readable context

Example MTM summary structure:
```json
{
  "date": "2025-01-15",
  "extractedFacts": {
    "userName": "Marcin",
    "userPreferences": ["likes running in mountains"],
    "keyTopics": ["memory system", "Grid framework"]
  },
  "conversations": {
    "count": 3,
    "totalMessages": 45,
    "avgLength": 120
  },
  "highlights": [
    "Learned user's name: Marcin",
    "Discussed memory implementation"
  ]
}
```

## Memory Tools

Agents can query their own memory using built-in tools:

```typescript
const memoryTools = createMemoryTools({ stm, mtm });

// Available tools:
// - search_recent_memory
// - recall_conversation_history
// - get_memory_statistics
// - search_memory_by_tags
// - recall_facts
```

## Testing Memory

The best way to test the memory system is through the terminal-agent:

```bash
pnpm terminal-agent conversation-with-memory
```

Available commands:
- `/memory` - Show memory statistics
- `/memory recent` - Show recent messages
- `/memory summarize` - Create daily summary
- `/memory view` - View markdown summary
- `/memory history-disable` - Test memory retrieval without context

## Current Limitations

:::info Beta Limitations
- No LTM implementation yet
- Basic fact extraction (regex + LLM)
- File-based storage only
- No distributed memory sync
- Limited to local filesystem
:::

## Future Roadmap

### Phase 1.2: Memory-Aware Handlers
- Automatic temporal detection ("yesterday", "last week")
- Context pre-loading based on queries

### Phase 2: Memory Primitives
- Unified memory service combining all layers
- Cascading retrieval system
- Cross-layer search with confidence scoring

### Phase 3: Long-Term Memory
- Pattern detection across sessions
- Knowledge graph construction
- Behavioral learning

## Best Practices

1. **Start with STM** - Log everything, filter later
2. **Daily Summaries** - Run MTM summarization regularly
3. **Test Thoroughly** - Use terminal-agent for testing
4. **Monitor Storage** - STM files can grow large
5. **Backup Memory** - Regular backups recommended

## Next Steps

- [Memory Integration Guide](/docs/guides/memory-integration) - Step-by-step implementation
- [Memory Tools Reference](/docs/sdk-reference/tools/memory-tools) - Tool documentation
- [STM Service API](/docs/sdk-reference/services/memory/stm-service) - Detailed API reference

## Feedback

As this is a beta feature, we welcome feedback! Please share your experience:
- [GitHub Issues](https://github.com/mrck-labs/grid/issues)
- [Discord Community](https://discord.gg/grid)