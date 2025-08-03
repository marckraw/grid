---
sidebar_position: 5
---

# Memory Tools 🚧

:::warning Beta Feature
Memory tools are currently in beta. Tool signatures may change in future releases.
:::

Tools that enable agents to query and interact with their memory system.

## Overview

Memory tools provide agents with the ability to search, recall, and analyze their own memory. These tools integrate with STM and MTM services to enable memory-aware agent behaviors.

## Import

```typescript
import { createMemoryTools } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createMemoryTools(deps: {
  stm: STMService;
  mtm?: MTMService;
}): {
  searchRecentMemory: CoreTool;
  recallConversationHistory: CoreTool;
  getMemoryStatistics: CoreTool;
  searchMemoryByTags: CoreTool;
  recallFacts: CoreTool;
}
```

## Available Tools

### search_recent_memory

Searches through recent memory events from STM.

**Parameters:**
- `hours` (number, optional): How many hours back to search (default: 24)
- `query` (string, optional): Text to search for in events
- `eventType` (string, optional): Filter by event type

**Returns:**
```typescript
{
  totalEvents: number;
  filteredEvents: number;
  timeRange: string;
  events: Array<{
    time: string;
    type: string;
    preview: string;
    tags: string[];
  }>;
}
```

**Example Usage:**
```typescript
// Agent searching for recent mentions of a topic
const result = await toolExecutor.execute({
  toolName: 'search_recent_memory',
  args: {
    hours: 48,
    query: 'project deadline',
    eventType: 'conversation.user.message'
  }
});
```

### recall_conversation_history

Recalls previous messages from conversations.

**Parameters:**
- `limit` (number, optional): Maximum messages to recall (default: 10)
- `messageType` ('user' | 'agent' | 'both', optional): Type of messages (default: 'both')

**Returns:**
```typescript
{
  messageCount: number;
  messages: Array<{
    time: string;
    role: 'user' | 'agent';
    content: string;
  }>;
}
```

**Example Usage:**
```typescript
// Agent recalling what user said earlier
const history = await toolExecutor.execute({
  toolName: 'recall_conversation_history',
  args: {
    limit: 5,
    messageType: 'user'
  }
});
```

### get_memory_statistics

Provides statistics about memory usage and patterns.

**Parameters:**
- `hours` (number, optional): Time window for statistics (default: 24)

**Returns:**
```typescript
{
  totalEvents: number;
  timeWindow: string;
  eventTypes: Record<string, number>;
  sources: Record<string, number>;
  activityByHour: Record<string, number>;
  mostActiveHour: string;
  mostCommonType: string;
}
```

**Example Usage:**
```typescript
// Agent analyzing its recent activity
const stats = await toolExecutor.execute({
  toolName: 'get_memory_statistics',
  args: { hours: 168 } // Last week
});
```

### search_memory_by_tags

Searches memory events by their tags.

**Parameters:**
- `tags` (string[]): Tags to search for
- `matchAll` (boolean, optional): Require all tags vs any tag (default: false)

**Returns:**
```typescript
{
  searchTags: string[];
  matchMode: 'all' | 'any';
  foundEvents: number;
  events: Array<{
    time: string;
    type: string;
    tags: string[];
    data: any;
  }>;
}
```

**Example Usage:**
```typescript
// Agent finding all work-related memories
const tagged = await toolExecutor.execute({
  toolName: 'search_memory_by_tags',
  args: {
    tags: ['work', 'project'],
    matchAll: false
  }
});
```

### recall_facts

Recalls important facts from MTM summaries.

:::info Requires MTM
This tool requires an MTM service instance. It will return an error if MTM is not available.
:::

**Parameters:**
- `query` (string): What fact to search for

**Returns:**
```typescript
{
  query: string;
  foundFacts: {
    userName?: string;
    userPreferences?: string[];
    keyTopics?: string[];
    [key: string]: any;
  };
  sourceDates: string[];
}
```

**Example Usage:**
```typescript
// Agent recalling user's name
const facts = await toolExecutor.execute({
  toolName: 'recall_facts',
  args: {
    query: 'user name'
  }
});

// Response might be:
// {
//   query: 'user name',
//   foundFacts: { userName: 'Marcin' },
//   sourceDates: ['2025-01-15']
// }
```

## Integration Example

### Adding Memory Tools to an Agent

```typescript
import { 
  createConfigurableAgent,
  createSimpleSTMService,
  createMTMService,
  createMemoryTools,
  createToolExecutor,
  baseLLMService
} from "@mrck-labs/grid-core";

// Create memory services
const stm = createSimpleSTMService();
const mtm = createMTMService({ 
  stm, 
  llmService: baseLLMService() 
});

// Create memory tools
const memoryTools = createMemoryTools({ stm, mtm });

// Create tool executor and register tools
const toolExecutor = createToolExecutor();
Object.values(memoryTools).forEach(tool => {
  toolExecutor.registerTool(tool);
});

// Create memory-aware agent
const agent = createConfigurableAgent({
  llmService: baseLLMService(),
  toolExecutor,
  config: {
    id: "memory-agent",
    type: "general",
    prompts: {
      system: `You are an AI with memory capabilities.
      
Use your memory tools to:
- search_recent_memory: Find recent events
- recall_conversation_history: Remember past messages
- get_memory_statistics: Analyze patterns
- search_memory_by_tags: Find categorized memories
- recall_facts: Remember important information

Be proactive in using memory to provide context-aware responses.`
    },
    tools: {
      custom: Object.values(memoryTools)
    }
  }
});
```

## Usage Patterns

### Temporal Queries

When users reference time:
```typescript
// "What did we discuss yesterday?"
if (message.includes('yesterday')) {
  await agent.useTool('search_recent_memory', {
    hours: 24,
    eventType: 'conversation.user.message'
  });
}
```

### Identity Queries

When users ask about themselves:
```typescript
// "Do you remember my name?"
if (message.includes('my name')) {
  await agent.useTool('recall_facts', {
    query: 'user name'
  });
}
```

### Context Building

Before responding to complex queries:
```typescript
// Build context from multiple sources
const [facts, recent, stats] = await Promise.all([
  agent.useTool('recall_facts', { query: 'user preferences' }),
  agent.useTool('search_recent_memory', { hours: 48 }),
  agent.useTool('get_memory_statistics', { hours: 168 })
]);
```

## Best Practices

1. **Tool Selection**: Use the most specific tool for the query
2. **Time Windows**: Start with smaller time windows, expand if needed
3. **Query Specificity**: More specific queries yield better results
4. **Fallback Strategy**: If one tool fails, try another approach
5. **Context Awareness**: Combine multiple tools for richer context

## Performance Considerations

- `search_recent_memory`: Linear search through events
- `recall_facts`: Searches all MTM summaries
- `get_memory_statistics`: Processes all events in time window
- Consider caching results for repeated queries

## Error Handling

Tools return structured errors:
```typescript
// When MTM is not available
{
  error: 'Mid-term memory not available',
  suggestion: 'Try using search_recent_memory instead'
}
```

## Future Enhancements

- Semantic search capabilities
- Cross-layer search coordination
- Confidence scoring in results
- Memory visualization tools
- Real-time memory streaming

## Related

- [Memory Integration Guide](/docs/guides/memory-integration) - Implementation guide
- [STM Service](/docs/sdk-reference/services/memory/stm-service) - STM reference
- [MTM Service](/docs/sdk-reference/services/memory/mtm-service) - MTM reference
- [Creating Tools](/docs/sdk-reference/tools/create-named-tool) - Custom tool creation