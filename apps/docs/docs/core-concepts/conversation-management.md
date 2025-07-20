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

## Conversation History Service

The `ConversationHistoryService` manages message storage and retrieval:

### Basic Usage

```typescript
const history = new ConversationHistoryService();

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
const recent = history.getRecentMessages(10);
const all = history.getAllMessages();
```

### Context Window Management

Automatically manage context windows to stay within token limits:

```typescript
const history = new ConversationHistoryService({
  maxMessages: 50,  // Keep last 50 messages
  maxTokens: 4000,  // Or limit by estimated tokens
  preserveSystemMessage: true,  // Always keep system message
});

// Messages are automatically trimmed when limits are exceeded
history.addMessage(newMessage);  // Oldest messages removed if needed
```

### Message Filtering

Filter messages by type or content:

```typescript
// Get only user and assistant messages
const conversation = history.getMessages({
  roles: ["user", "assistant"],
});

// Get messages with tool calls
const toolInteractions = history.getMessages({
  filter: (msg) => msg.toolCalls?.length > 0,
});

// Get messages from the last hour
const recentHour = history.getMessages({
  since: new Date(Date.now() - 3600000),
});
```

## Conversation Context Service

The `ConversationContextService` maintains stateful information:

### Setting Context

```typescript
const context = new ConversationContextService();

// Set user preferences
context.set("user.name", "Alice");
context.set("user.preferences", {
  language: "en",
  timezone: "PST",
  verbose: true,
});

// Set session data
context.set("session.id", "sess_123");
context.set("session.startTime", new Date());
```

### Using Context in Agents

```typescript
const agent = createConfigurableAgent({
  systemPrompt: "You are a helpful assistant.",
  customHandlers: {
    transformInput: async (input, config) => {
      const userName = context.get("user.name");
      const preferences = context.get("user.preferences");
      
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

Save and restore context:

```typescript
// Save context
const snapshot = context.snapshot();
await saveToDatabase(snapshot);

// Restore context
const saved = await loadFromDatabase();
context.restore(saved);
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

Maintain context across multiple turns:

```typescript
class ConversationSession {
  private history = new ConversationHistoryService();
  private context = new ConversationContextService();
  
  async process(userInput: string): Promise<string> {
    // Add user message
    this.history.addMessage({ role: "user", content: userInput });
    
    // Get conversation context
    const messages = this.history.getAllMessages();
    
    // Process with agent
    const response = await agent.act({
      messages,
      context: this.context.getAll(),
    });
    
    // Add response to history
    this.history.addMessage(response);
    
    return response.content;
  }
}
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
class ConversationSessionManager {
  private sessions = new Map<string, ConversationSession>();
  
  createSession(userId: string): ConversationSession {
    const session = new ConversationSession({
      id: generateId(),
      userId,
      startTime: new Date(),
      history: new ConversationHistoryService(),
      context: new ConversationContextService(),
    });
    
    this.sessions.set(session.id, session);
    return session;
  }
  
  getSession(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }
}
```

### Session Persistence

Save sessions for later:

```typescript
interface SessionStorage {
  save(session: ConversationSession): Promise<void>;
  load(sessionId: string): Promise<ConversationSession>;
  list(userId: string): Promise<SessionSummary[]>;
}

class DatabaseSessionStorage implements SessionStorage {
  async save(session: ConversationSession): Promise<void> {
    await db.sessions.upsert({
      id: session.id,
      userId: session.userId,
      messages: session.history.getAllMessages(),
      context: session.context.snapshot(),
      updatedAt: new Date(),
    });
  }
  
  async load(sessionId: string): Promise<ConversationSession> {
    const data = await db.sessions.findUnique({ where: { id: sessionId } });
    
    const session = new ConversationSession();
    session.history.restore(data.messages);
    session.context.restore(data.context);
    
    return session;
  }
}
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