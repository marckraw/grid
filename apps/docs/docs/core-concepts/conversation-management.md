---
sidebar_position: 4
---

# Conversation Management

Grid provides a sophisticated conversation management system that handles message history, context preservation, and stateful interactions across different conversation patterns.

## Overview

Conversation management in Grid involves:
- **Message History**: Tracking and managing conversation messages
- **Context Preservation**: Maintaining state across interactions
- **Memory Management**: Optimizing for LLM context windows
- **Session Handling**: Managing multi-turn conversations

## Message Types

Grid uses Vercel AI SDK's message format:

```typescript
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;  // For tool messages
  toolCalls?: ToolCall[];  // For assistant messages
  toolCallId?: string;  // For tool result messages
}
```

### User Messages

Messages from the user:

```typescript
const userMessage: Message = {
  role: "user",
  content: "What's the weather in San Francisco?",
};
```

### Assistant Messages

Responses from the AI:

```typescript
const assistantMessage: Message = {
  role: "assistant",
  content: "I'll check the weather for you.",
  toolCalls: [{
    id: "call_123",
    name: "get_weather",
    args: { location: "San Francisco" },
  }],
};
```

### Tool Messages

Results from tool executions:

```typescript
const toolMessage: Message = {
  role: "tool",
  content: "72°F and sunny",
  toolCallId: "call_123",
  name: "get_weather",
};
```

## Using Conversation Primitives

Grid provides conversation primitives that handle message storage and state management. See [Conversation Primitives](/docs/core-concepts/conversation-primitives) for detailed API documentation.

### Basic Message History

Using `createConversationHistory` for message management:

```typescript
import { createConversationHistory } from "@mrck-labs/grid-core";

const history = createConversationHistory("You are a helpful assistant");

// Add messages
history.addMessage({
  role: "user",
  content: "Hello!",
});

history.addMessage({
  role: "assistant",
  content: "Hi there! How can I help you today?",
});

// Retrieve messages
const all = history.getMessages();
const nonSystem = history.getNonSystemMessages();
const lastUser = history.getLastMessageByRole("user");
```

### Context Management

Using `createConversationContext` for state management:

```typescript
import { createConversationContext } from "@mrck-labs/grid-core";

const context = createConversationContext();

// Set user preferences
context.updateState("user.name", "Alice");
context.updateStates({
  "user.preferences.language": "en",
  "user.preferences.timezone": "PST",
  "user.preferences.verbose": true,
});

// Set session data
context.updateMetadata("sessionId", "sess_123");
context.updateMetadata("topic", "technical-support");

// Track metrics
context.incrementMessageCount();
context.incrementToolCallCount(1);
```

### Using Context in Agents

```typescript
const context = createConversationContext();

const agent = createConfigurableAgent({
  systemPrompt: "You are a helpful assistant.",
  customHandlers: {
    transformInput: async (input, config) => {
      const userName = context.getStateValue("user.name");
      const language = context.getStateValue("user.preferences.language");
      
      // Personalize the interaction
      if (userName) {
        input.messages[0].content = 
          `${userName} asks: ${input.messages[0].content}`;
      }
      
      return input;
    },
  },
});
```

### Context Persistence

Save and restore conversation state:

```typescript
// Save context
const snapshot = context.getSnapshot();
await saveToDatabase(snapshot);

// Restore context
const saved = await loadFromDatabase();
const newContext = createConversationContext();
// Restore by updating state and metadata
Object.entries(saved.state).forEach(([key, value]) => {
  newContext.updateState(key, value);
});
Object.entries(saved.metadata).forEach(([key, value]) => {
  newContext.updateMetadata(key, value);
});
```

## Conversation Patterns

### Simple Q&A

Basic question-answer pattern:

```typescript
async function simpleQA(agent: Agent, question: string) {
  const response = await agent.act(question);
  console.log(response.content);
}
```

### Multi-turn Conversations

Maintain context across multiple turns using conversation primitives:

```typescript
import { createConversationManager } from "@mrck-labs/grid-core";

const createConversationSession = (agent) => {
  const manager = createConversationManager();
  
  return {
    process: async (userInput: string) => {
      // Add user message
      manager.addUserMessage(userInput);
      
      // Process with agent
      const response = await agent.act({
        messages: manager.getMessages(),
        context: manager.getState(),
      });
      
      // Process response
      manager.processAgentResponse(response);
      
      return response.content;
    },
    
    getState: () => manager.getConversationState(),
    reset: () => manager.reset(),
  };
};

// Usage
const session = createConversationSession(myAgent);
const response1 = await session.process("Hello!");
const response2 = await session.process("What's my name?"); // Maintains context
```

### Stateful Workflows

Complex workflows with state transitions:

```typescript
class WorkflowConversation {
  private state: "greeting" | "collecting_info" | "processing" | "complete" = "greeting";
  
  async process(input: string): Promise<string> {
    switch (this.state) {
      case "greeting":
        this.state = "collecting_info";
        return "Hello! I'll help you with your request. What's your name?";
        
      case "collecting_info":
        this.context.set("user.name", input);
        this.state = "processing";
        return `Nice to meet you, ${input}! What can I help you with?`;
        
      case "processing":
        const response = await this.processRequest(input);
        this.state = "complete";
        return response;
        
      case "complete":
        return "Is there anything else I can help you with?";
    }
  }
}
```

## Memory Strategies

### Sliding Window

Keep only recent messages:

```typescript
const history = new ConversationHistoryService({
  strategy: "sliding_window",
  windowSize: 20,  // Keep last 20 messages
});
```

### Summary Compression

Summarize old messages to preserve context:

```typescript
class CompressedHistory extends ConversationHistoryService {
  async compress(): Promise<void> {
    const oldMessages = this.getMessages({ 
      count: 50, 
      offset: this.size() - 100 
    });
    
    const summary = await this.summarizeMessages(oldMessages);
    
    // Replace old messages with summary
    this.replaceRange(
      this.size() - 100,
      50,
      { role: "system", content: `Previous conversation summary: ${summary}` }
    );
  }
}
```

### Importance-based Retention

Keep important messages longer:

```typescript
class SmartHistory extends ConversationHistoryService {
  private importance = new Map<string, number>();
  
  addMessage(message: Message, importance: number = 1): void {
    super.addMessage(message);
    this.importance.set(message.id, importance);
  }
  
  trim(): void {
    // Sort by importance and recency
    const sorted = this.getAllMessages()
      .map((msg, idx) => ({ msg, idx, importance: this.importance.get(msg.id) || 1 }))
      .sort((a, b) => b.importance - a.importance || b.idx - a.idx);
    
    // Keep top N messages
    const keep = sorted.slice(0, this.config.maxMessages);
    this.messages = keep.map(item => item.msg);
  }
}
```

## Session Management

### Creating Sessions

```typescript
import { createConversationLoop } from "@mrck-labs/grid-core";

const createSessionManager = () => {
  const sessions = new Map();
  
  return {
    createSession: (userId: string, agent: Agent) => {
      const sessionId = generateId();
      
      const session = {
        id: sessionId,
        userId,
        startTime: new Date(),
        conversation: createConversationLoop({
          agent,
          systemPrompt: agent.config.systemPrompt,
        }),
      };
      
      sessions.set(sessionId, session);
      return session;
    },
    
    getSession: (sessionId: string) => {
      return sessions.get(sessionId);
    },
    
    listUserSessions: (userId: string) => {
      return Array.from(sessions.values())
        .filter(s => s.userId === userId)
        .map(s => ({
          id: s.id,
          startTime: s.startTime,
          analytics: s.conversation.getAnalytics(),
        }));
    },
  };
};
```

### Session Persistence

Save sessions for later:

```typescript
const createSessionStorage = (database) => {
  return {
    save: async (session) => {
      const exported = session.conversation.exportConversation();
      
      await database.sessions.upsert({
        id: session.id,
        userId: session.userId,
        conversationData: exported,
        updatedAt: new Date(),
      });
    },
    
    load: async (sessionId: string, agent: Agent) => {
      const data = await database.sessions.findUnique({ 
        where: { id: sessionId } 
      });
      
      const conversation = createConversationLoop({
        agent,
        systemPrompt: agent.config.systemPrompt,
      });
      
      conversation.importConversation(data.conversationData);
      
      return {
        id: data.id,
        userId: data.userId,
        conversation,
      };
    },
    
    list: async (userId: string) => {
      const sessions = await database.sessions.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      
      return sessions.map(s => ({
        id: s.id,
        updatedAt: s.updatedAt,
        messageCount: s.conversationData.messages.length,
      }));
    },
  };
};
```

## Advanced Features

### Branching Conversations

Support multiple conversation branches:

```typescript
class BranchingConversation {
  private branches = new Map<string, ConversationHistory>();
  private currentBranch = "main";
  
  branch(name: string): void {
    const current = this.branches.get(this.currentBranch);
    this.branches.set(name, current.clone());
    this.currentBranch = name;
  }
  
  switchBranch(name: string): void {
    if (this.branches.has(name)) {
      this.currentBranch = name;
    }
  }
  
  merge(fromBranch: string, toBranch: string): void {
    const from = this.branches.get(fromBranch);
    const to = this.branches.get(toBranch);
    
    // Merge strategy: append messages
    from.getAllMessages().forEach(msg => to.addMessage(msg));
  }
}
```

### Conversation Analytics

Track conversation metrics:

```typescript
class ConversationAnalytics {
  private metrics = {
    messageCount: 0,
    toolCallCount: 0,
    avgResponseTime: 0,
    sentimentScores: [],
  };
  
  trackMessage(message: Message, responseTime?: number): void {
    this.metrics.messageCount++;
    
    if (message.toolCalls?.length) {
      this.metrics.toolCallCount += message.toolCalls.length;
    }
    
    if (responseTime) {
      this.updateAvgResponseTime(responseTime);
    }
  }
  
  getMetrics(): ConversationMetrics {
    return {
      ...this.metrics,
      avgSentiment: this.calculateAvgSentiment(),
      conversationLength: this.calculateDuration(),
    };
  }
}
```

## Best Practices

### 1. Context Window Awareness
Always consider LLM context limits when designing conversations.

### 2. State Management
Use the context service for state that needs to persist across messages.

### 3. Message Cleanup
Implement appropriate retention policies for production systems.

### 4. Error Recovery
Design conversations to gracefully handle and recover from errors.

### 5. Privacy
Be mindful of sensitive information in conversation history.

## Next Steps

- [Observability](/docs/core-concepts/observability) - Monitor conversations with Langfuse
- [Agent Hooks](/docs/guides/agent-hooks) - Customize conversation behavior
- [Production Deployment](/docs/guides/production-deployment) - Scale conversation management