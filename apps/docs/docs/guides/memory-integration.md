---
sidebar_position: 5
---

# Memory Integration Guide 🚧

:::warning Beta Feature
The memory system is currently in beta. This guide covers the current implementation, but APIs may change in future releases.
:::

Learn how to add memory capabilities to your Grid agents, enabling them to remember and learn from interactions.

## Overview

This guide walks you through integrating Grid's memory system into your agents. By the end, you'll have an agent that can:

- Remember user information across sessions
- Recall previous conversations
- Extract and store important facts
- Search through historical interactions

## Prerequisites

- Grid Core installed (`@mrck-labs/grid-core`)
- Basic understanding of Grid agents
- Node.js environment with file system access

## Quick Start

### 1. Install Dependencies

```bash
pnpm add @mrck-labs/grid-core
```

### 2. Create Memory Services

```typescript
import { 
  createSimpleSTMService,
  createMTMService,
  baseLLMService 
} from "@mrck-labs/grid-core";

// Short-Term Memory for raw events
const stm = createSimpleSTMService({
  logPath: './memory/stm.jsonl'
});

// Mid-Term Memory for daily summaries
const mtm = createMTMService({
  stm,
  llmService: baseLLMService(), // Optional: enhances fact extraction
  config: { 
    storagePath: './memory/mtm' 
  }
});
```

### 3. Add Memory Tools to Your Agent

```typescript
import { 
  createMemoryTools,
  createToolExecutor,
  createConfigurableAgent 
} from "@mrck-labs/grid-core";

// Create memory tools
const memoryTools = createMemoryTools({ stm, mtm });

// Register tools with executor
const toolExecutor = createToolExecutor();
Object.values(memoryTools).forEach(tool => {
  toolExecutor.registerTool(tool);
});

// Create memory-aware agent
const agent = createConfigurableAgent({
  llmService: baseLLMService(),
  toolExecutor,
  config: {
    id: "assistant-with-memory",
    type: "general",
    prompts: {
      system: `You are a helpful assistant with memory.
      
You can remember information about users and conversations using these tools:
- search_recent_memory: Search recent events
- recall_conversation_history: Recall past messages
- recall_facts: Remember user information and preferences
- get_memory_statistics: Analyze interaction patterns

Always use memory tools when users reference past interactions or ask if you remember something.`
    },
    tools: {
      custom: Object.values(memoryTools)
    }
  }
});
```

## Logging Events to Memory

### Automatic Logging with Handlers

The recommended approach is to use conversation handlers:

```typescript
import { createConversationLoop } from "@mrck-labs/grid-core";

const conversation = createConversationLoop({
  agent,
  handlers: {
    loop: {
      onConversationStarted: async (context) => {
        await stm.log({
          type: 'conversation.started',
          data: { context },
          metadata: {
            source: 'conversation',
            conversationId: context.conversationId,
            priority: 2
          }
        });
        return { initialMessages: [] };
      },
      
      onMessageSent: async (message, context) => {
        await stm.log({
          type: 'conversation.user.message',
          data: { message },
          metadata: {
            source: 'conversation',
            conversationId: context?.conversationId,
            userId: context?.userId,
            tags: ['user-input']
          }
        });
      },
      
      onResponseReceived: async (response, context) => {
        await stm.log({
          type: 'conversation.agent.response',
          data: { 
            content: response.content,
            toolCalls: response.toolCalls
          },
          metadata: {
            source: 'conversation',
            conversationId: context?.conversationId,
            agentId: agent.id,
            tags: ['agent-output']
          }
        });
      }
    }
  }
});
```

### Manual Event Logging

You can also log custom events directly:

```typescript
// Log user preferences
await stm.log({
  type: 'user.preference.set',
  data: {
    preference: 'theme',
    value: 'dark'
  },
  metadata: {
    userId: 'user123',
    source: 'settings',
    tags: ['preference', 'ui']
  }
});

// Log important actions
await stm.log({
  type: 'task.completed',
  data: {
    task: 'Generate weekly report',
    duration: 120000 // 2 minutes
  },
  metadata: {
    priority: 4,
    tags: ['task', 'report', 'success']
  }
});
```

## Creating Daily Summaries

MTM processes STM events to create daily summaries:

```typescript
// Create today's summary
const summary = await mtm.summarizeDay();

// Create summary for specific date
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdaySummary = await mtm.summarizeDay(yesterday);

// View summary content
console.log('Extracted facts:', summary.extractedFacts);
console.log('Conversation stats:', summary.conversations);
console.log('Key highlights:', summary.highlights);
```

### Automatic Summarization

Set up a daily cron job or interval:

```typescript
// Run daily at midnight
setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    try {
      const summary = await mtm.summarizeDay();
      console.log(`Created summary for ${summary.date}`);
    } catch (error) {
      console.error('Summarization failed:', error);
    }
  }
}, 60000); // Check every minute
```

## Testing with History Modes

Test memory retrieval by disabling conversation history:

```typescript
// Disable history - agent has "amnesia"
conversation.setHistoryMode('none');

// Now the agent must use memory tools to recall context
// User: "What's my name?"
// Agent will use recall_facts tool to find the answer

// Re-enable normal history
conversation.setHistoryMode('full');
```

## Terminal Agent Example

The best way to explore memory features is through the terminal agent:

```bash
pnpm terminal-agent conversation-with-memory
```

### Memory Commands

- `/memory` - Show memory statistics
- `/memory recent` - View recent messages
- `/memory responses` - View recent agent responses
- `/memory summarize` - Create daily summary
- `/memory summaries` - List available summaries
- `/memory view [date]` - View markdown summary
- `/memory clear` - Clear all memory
- `/memory history-disable` - Test without conversation history
- `/memory history-enable` - Re-enable conversation history

### Example Session

```
You: Hi, my name is Marcin and I love running in the mountains
🤖 Assistant: Nice to meet you, Marcin! Running in the mountains sounds wonderful...

You: /memory summarize
✅ Daily summary created!
Date: 2025-01-15
User name: Marcin
Preferences: loves running in the mountains

You: /memory history-disable
⚠️ History disabled - Agent now has amnesia!

You: Do you remember my name?
🧠 Using memory: recall_facts...
🤖 Assistant: Yes, your name is Marcin! I have that stored in my memory.

You: What do I like to do?
🧠 Using memory: recall_facts...
🤖 Assistant: You love running in the mountains! That's one of your preferences I remember.
```

## Memory Storage Structure

Understanding the file structure helps with debugging and management:

```
./memory/
├── stm.jsonl                    # Raw event stream
└── mtm/
    ├── 2025-01-14.json         # Structured daily summary
    ├── 2025-01-14.md           # Human-readable summary
    ├── 2025-01-15.json
    └── 2025-01-15.md
```

### STM Format (JSONL)

Each line is a complete JSON object:
```jsonl
{"timestamp":"2025-01-15T10:30:00Z","type":"conversation.user.message","data":{"message":"Hello"},"metadata":{...}}
{"timestamp":"2025-01-15T10:30:15Z","type":"conversation.agent.response","data":{"content":"Hi there!"},"metadata":{...}}
```

### MTM Format (Hybrid)

JSON for queries:
```json
{
  "date": "2025-01-15",
  "extractedFacts": {
    "userName": "Marcin",
    "userPreferences": ["loves running in mountains"]
  }
}
```

Markdown for context:
```markdown
# Daily Memory Summary - 2025-01-15

## User Profile
- **Name**: Marcin
- **Preferences**: loves running in mountains

## Conversation Highlights
- User introduced themselves
- Discussed outdoor activities
```

## Common Patterns

### Pattern 1: Greeting with Memory

```typescript
const agent = createConfigurableAgent({
  config: {
    prompts: {
      system: `When greeting users, check if you remember their name.
If you do, greet them personally.`
    }
  }
});

// User: "Hello!"
// Agent uses recall_facts to check for userName
// Agent: "Hello Marcin! Good to see you again."
```

### Pattern 2: Contextual Follow-ups

```typescript
// In system prompt
`When users say "like we discussed" or "as I mentioned", 
always search recent memory for context before responding.`

// User: "Can you continue with the project we discussed?"
// Agent uses search_recent_memory to find project details
```

### Pattern 3: Preference Learning

```typescript
// Log preferences explicitly
await stm.log({
  type: 'user.preference.stated',
  data: {
    category: 'activity',
    preference: 'running in mountains'
  },
  metadata: {
    userId: context.userId,
    confidence: 0.9,
    tags: ['preference', 'outdoor', 'activity']
  }
});
```

## Troubleshooting

### Memory Not Being Recalled

1. **Check if MTM summary exists**:
   ```typescript
   const summaries = await mtm.listSummaries();
   console.log('Available summaries:', summaries);
   ```

2. **Verify fact extraction**:
   ```typescript
   const today = await mtm.getSummary(new Date());
   console.log('Today\'s facts:', today?.extractedFacts);
   ```

3. **Test search directly**:
   ```typescript
   const results = await mtm.searchFacts('name');
   console.log('Search results:', results);
   ```

### Performance Issues

1. **Large STM files**: Implement rotation
   ```typescript
   // Rotate weekly
   const weeklyPath = `./memory/stm-week-${getWeekNumber()}.jsonl`;
   const stm = createSimpleSTMService({ logPath: weeklyPath });
   ```

2. **Slow searches**: Limit time windows
   ```typescript
   // Search only last 24 hours instead of week
   const recent = await stm.getRecent(24);
   ```

### Missing Facts

Enhance fact extraction with LLM:
```typescript
const mtm = createMTMService({
  stm,
  llmService: baseLLMService({
    model: 'gpt-4' // Better fact extraction
  })
});
```

## Best Practices

### 1. Event Naming
```typescript
// Use hierarchical, descriptive names
'conversation.user.message' ✓
'user.preference.stated' ✓
'task.completed' ✓

// Avoid generic names
'event' ✗
'message' ✗
'action' ✗
```

### 2. Metadata Enrichment
```typescript
// Include rich context
metadata: {
  source: 'conversation',
  conversationId: ctx.id,
  userId: ctx.userId,
  timestamp: new Date().toISOString(),
  tags: ['greeting', 'first-interaction'],
  sentiment: 'positive',
  priority: 3
}
```

### 3. Memory Hygiene
- Run daily summaries consistently
- Archive old STM files monthly
- Back up MTM summaries
- Monitor storage usage

### 4. Privacy Considerations
- Don't log sensitive information (passwords, keys)
- Consider user consent for memory storage
- Implement memory deletion on request
- Encrypt memory files if needed

## Advanced Usage

### Custom Fact Extractors

Extend MTM with domain-specific extraction:

```typescript
// In your extended MTM service
const extractCustomFacts = (events: MemoryEvent[]) => {
  const customFacts: any = {};
  
  // Extract domain-specific patterns
  events.forEach(event => {
    if (event.type === 'order.placed') {
      customFacts.favoriteProducts = customFacts.favoriteProducts || [];
      customFacts.favoriteProducts.push(event.data.product);
    }
  });
  
  return customFacts;
};
```

### Cross-Session Context

Build context from multiple sessions:

```typescript
// Before starting conversation
const recentSummaries = await Promise.all(
  [0, 1, 2].map(daysAgo => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return mtm.getSummary(date);
  })
);

const context = {
  userName: recentSummaries.find(s => s?.extractedFacts.userName)?.extractedFacts.userName,
  recentTopics: recentSummaries.flatMap(s => s?.extractedFacts.keyTopics || [])
};
```

## Next Steps

- Experiment with the terminal agent example
- Implement memory in your own agents  
- Contribute patterns back to the community
- Prepare for LTM when it releases

## Related Resources

- [Memory System Overview](/docs/core-concepts/memory) - Architecture and concepts
- [STM Service API](/docs/sdk-reference/services/memory/stm-service) - Detailed STM reference
- [MTM Service API](/docs/sdk-reference/services/memory/mtm-service) - Detailed MTM reference
- [Memory Tools](/docs/sdk-reference/tools/memory-tools) - Tool specifications

## Getting Help

- [GitHub Issues](https://github.com/mrck-labs/grid/issues) - Report bugs
- [Discord Community](https://discord.gg/grid) - Ask questions
- [Memory Examples](https://github.com/mrck-labs/grid/tree/main/examples/memory) - Code samples