---
sidebar_position: 5
---

# Event Handlers

Grid provides a comprehensive event system that enables you to hook into various lifecycle events at all levels of the conversation architecture. This allows for seamless integration with databases, analytics, monitoring, and other external systems.

## Architecture Overview

Event handlers are available at four levels:

1. **Atomic Level**: History and Context primitives
2. **Composed Level**: Conversation Manager with grouped handlers
3. **Organism Level**: Conversation Loop with lifecycle events
4. **Agent Level**: Custom handlers for agent behavior

## Atomic Level Events

### History Events

The conversation history primitive emits events when messages are added or cleared:

```typescript
import { createConversationHistory } from "@mrck-labs/grid-core";

const history = createConversationHistory("You are a helpful assistant", {
  onMessageAdded: async (message) => {
    // Save to database
    await db.messages.create({
      data: {
        role: message.role,
        content: message.content,
        timestamp: new Date(),
        sessionId: currentSession,
      },
    });
  },
  
  onMessagesCleared: async () => {
    // Clean up database
    await db.messages.deleteMany({
      where: { sessionId: currentSession },
    });
  },
});
```

### Context Events

The conversation context emits events when state or metadata changes:

```typescript
import { createConversationContext } from "@mrck-labs/grid-core";

const context = createConversationContext({
  onStateChanged: async (key, value) => {
    // Persist state changes
    await db.state.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value, sessionId: currentSession },
    });
  },
  
  onMetadataChanged: async (key, value) => {
    // Track metadata updates
    await analytics.track("metadata_updated", {
      key,
      value,
      timestamp: new Date(),
    });
  },
});
```

## Composed Level Events

### Grouped Manager Handlers

The conversation manager provides grouped handlers for better organization:

```typescript
import { createConversationManager } from "@mrck-labs/grid-core";

const manager = createConversationManager("You are a helpful assistant", {
  // Manager-specific events
  manager: {
    onUserMessageAdded: async (message) => {
      // Track user interactions
      await analytics.track("user_message", {
        content: message,
        timestamp: new Date(),
      });
    },
    
    onAgentResponseProcessed: async (response) => {
      // Monitor agent responses
      await monitoring.logResponse({
        hasTools: response.toolCalls?.length > 0,
        contentLength: response.content.length,
      });
    },
    
    onToolResponseAdded: async (toolCallId, toolName, result) => {
      // Track tool usage
      await analytics.track("tool_executed", {
        toolName,
        success: !result.includes("error"),
      });
    },
  },
  
  // Delegate to underlying primitives
  history: {
    onMessageAdded: async (message) => {
      await db.messages.create({ data: message });
    },
  },
  
  context: {
    onStateChanged: async (key, value) => {
      await db.state.upsert({ key, value });
    },
  },
});
```

## Organism Level Events

### Conversation Loop Lifecycle

The conversation loop provides high-level lifecycle events:

```typescript
import { createConversationLoop } from "@mrck-labs/grid-core";

const loop = createConversationLoop({
  agent: myAgent,
  handlers: {
    onConversationStarted: async ({ sessionId, userId, conversationId }) => {
      // Initialize conversation
      const previousMessages = await db.messages.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });
      
      // Log conversation start
      await db.sessions.create({
        data: {
          id: sessionId,
          userId,
          startedAt: new Date(),
        },
      });
      
      // Return initial messages to restore context
      return { initialMessages: previousMessages };
    },
    
    onMessageSent: async (message, context) => {
      // Audit trail
      await db.audit.create({
        data: {
          type: "message_sent",
          content: message,
          userId: context.userId,
          sessionId: context.sessionId,
          timestamp: new Date(),
        },
      });
    },
    
    onResponseReceived: async (response, context) => {
      // Track response metrics
      await monitoring.recordMetrics({
        responseTime: Date.now() - context.messageTimestamp,
        tokenCount: response.usage?.totalTokens,
        toolsUsed: response.toolCalls?.length || 0,
      });
    },
    
    onConversationEnded: async (summary, context) => {
      // Finalize session
      await db.sessions.update({
        where: { id: context.sessionId },
        data: {
          summary,
          endedAt: new Date(),
          totalMessages: summary.messageCount,
          totalTokens: summary.totalTokens,
        },
      });
    },
  },
});
```

## Agent Level Events

### Custom Agent Handlers

Agents support custom handlers for fine-grained control:

```typescript
const agent = createConfigurableAgent({
  // ... configuration
  customHandlers: {
    beforeAct: async (input, config) => {
      // Pre-process input
      await logger.info("Processing request", { input });
      return input;
    },
    
    afterResponse: async (response, input) => {
      // Post-process response
      await logger.info("Generated response", { response });
      return response;
    },
    
    onError: async (error, attempt) => {
      // Error handling with retry logic
      await logger.error("Agent error", { error, attempt });
      
      if (attempt < 3) {
        return { shouldRetry: true, delayMs: 1000 * attempt };
      }
    },
    
    validateResponse: async (response) => {
      // Response validation
      if (response.content.includes("ERROR")) {
        return { 
          isValid: false, 
          reason: "Response contains error message" 
        };
      }
      return { isValid: true };
    },
  },
});
```

## Practical Examples

### Database Persistence Pattern

```typescript
// Create a persistence layer using events
function createPersistentConversation(sessionId: string) {
  return createConversationLoop({
    agent: myAgent,
    handlers: {
      onConversationStarted: async () => {
        const session = await db.sessions.findUnique({
          where: { id: sessionId },
          include: { messages: true },
        });
        
        return { 
          initialMessages: session?.messages || [] 
        };
      },
      
      onMessageSent: async (message) => {
        await db.messages.create({
          data: {
            sessionId,
            role: "user",
            content: message,
          },
        });
      },
      
      onResponseReceived: async (response) => {
        await db.messages.create({
          data: {
            sessionId,
            role: "assistant",
            content: response.content,
            toolCalls: response.toolCalls,
          },
        });
      },
    },
  });
}
```

### Analytics Integration

```typescript
// Integrate with analytics services
const analyticsHandlers = {
  manager: {
    onUserMessageAdded: async (message) => {
      mixpanel.track("user_message", {
        messageLength: message.length,
        timestamp: new Date(),
      });
    },
    
    onAgentResponseProcessed: async (response) => {
      mixpanel.track("agent_response", {
        hasTools: !!response.toolCalls?.length,
        responseTime: Date.now() - startTime,
      });
    },
  },
};

const manager = createConversationManager("Assistant", analyticsHandlers);
```

### Multi-Database Pattern

```typescript
// Use different databases for different purposes
const handlers = {
  // PostgreSQL for structured data
  history: {
    onMessageAdded: async (message) => {
      await postgres.messages.create({ data: message });
    },
  },
  
  // Redis for state cache
  context: {
    onStateChanged: async (key, value) => {
      await redis.set(`state:${sessionId}:${key}`, value);
    },
  },
  
  // MongoDB for analytics
  manager: {
    onAgentResponseProcessed: async (response) => {
      await mongodb.analytics.insertOne({
        timestamp: new Date(),
        response,
        metrics: calculateMetrics(response),
      });
    },
  },
};
```

## Best Practices

### 1. Error Handling

Always wrap handlers in try-catch blocks:

```typescript
onMessageAdded: async (message) => {
  try {
    await db.messages.create({ data: message });
  } catch (error) {
    logger.error("Failed to save message", { error, message });
    // Don't throw - let conversation continue
  }
},
```

### 2. Performance

Keep handlers lightweight and async:

```typescript
onStateChanged: async (key, value) => {
  // Don't block - queue for processing
  await queue.push({ 
    type: "state_change", 
    key, 
    value 
  });
},
```

### 3. Separation of Concerns

Use grouped handlers to organize by responsibility:

```typescript
const handlers = {
  // Persistence handlers
  history: { /* ... */ },
  
  // Analytics handlers  
  manager: { /* ... */ },
  
  // Monitoring handlers
  context: { /* ... */ },
};
```

### 4. Testing

Make handlers testable by extracting logic:

```typescript
// Separate handler logic
export const messageHandlers = {
  async saveMessage(message: Message) {
    return db.messages.create({ data: message });
  },
};

// Use in event handler
onMessageAdded: messageHandlers.saveMessage,
```

## Next Steps

- [Conversation Primitives](/docs/core-concepts/conversation-primitives) - Learn about all primitives
- [Pre-built Agents](/docs/getting-started/pre-built-agents) - Use agents with built-in persistence
- [Observability](/docs/core-concepts/observability) - Monitor with Langfuse