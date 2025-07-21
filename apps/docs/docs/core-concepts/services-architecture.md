---
sidebar_position: 3
---

# Services Architecture

Grid's services architecture follows a layered design pattern, organizing functionality from atomic building blocks to complex orchestration systems. This architecture ensures modularity, reusability, and clear separation of concerns.

## Architecture Overview

Grid organizes services into three distinct layers:

```
┌─────────────────────────────────────────┐
│        Organism Level Services          │
│     (ConversationLoop, AgentFlow)       │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│        Composed Level Services          │
│      (ConversationManager)              │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│         Atomic Level Services           │
│ (History, Context, ToolExecutor, LLM)   │
└─────────────────────────────────────────┘
```

## Atomic Level Services

These are the fundamental building blocks that handle specific, focused responsibilities. All services use a closure-based pattern - no classes, just functions returning objects with methods.

### baseLLMService

The core service for LLM interactions:

```typescript
const llmService = baseLLMService({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
});

// Usage
const response = await llmService.generateText({
  model: "gpt-4",
  messages: [...],
  tools: [...],
});
```

Key features:
- Provider abstraction (OpenAI, Anthropic)
- Automatic retry logic
- Token counting and limits
- Response streaming support

### createConversationHistory

Manages message history using closure-based pattern:

```typescript
export const createConversationHistory = (systemPrompt?: string) => {
  // Private state in closure
  const messages: Message[] = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  
  // Public methods
  return {
    addMessage: (message: Message) => {
      messages.push(message);
    },
    
    getMessages: () => [...messages], // Return copy
    
    getNonSystemMessages: () => 
      messages.filter(m => m.role !== "system"),
    
    clear: () => {
      const systemMsg = messages.find(m => m.role === "system");
      messages.length = 0;
      if (systemMsg) messages.push(systemMsg);
    },
    
    getLastMessageByRole: (role: MessageRole) => 
      messages.findLast(m => m.role === role),
  };
};
```

Features:
- Message storage and retrieval
- System message preservation
- Tool response handling
- Message filtering by role

### createConversationContext

Maintains conversation state:

```typescript
export const createConversationContext = () => {
  // Private state
  const state: Record<string, any> = {};
  const metadata: ConversationMetadata = {
    startTime: new Date(),
    messageCount: 0,
    toolCallCount: 0,
  };
  
  // Public API
  return {
    updateState: (key: string, value: any) => {
      state[key] = value;
    },
    
    getState: () => ({ ...state }), // Return copy
    
    updateMetadata: (key: string, value: any) => {
      metadata[key] = value;
    },
    
    incrementMessageCount: () => {
      metadata.messageCount++;
    },
    
    getMetrics: () => ({
      duration: Date.now() - metadata.startTime.getTime(),
      messages: metadata.messageCount,
      toolCalls: metadata.toolCallCount,
    }),
  };
};
```

Use cases:
- User preferences
- Session state
- Tool results caching
- Conversation metrics

### toolExecutor

Executes tools safely and efficiently:

```typescript
export const createToolExecutor = (tools: Record<string, CoreTool>) => {
  // Private helper functions
  const validateParams = async (tool: CoreTool, params: any) => {
    return tool.parameters.parseAsync(params);
  };
  
  // Public methods
  return {
    execute: async (toolCall: ToolCall) => {
      const tool = tools[toolCall.name];
      if (!tool) throw new Error(`Tool not found: ${toolCall.name}`);
      
      try {
        const validated = await validateParams(tool, toolCall.args);
        const result = await tool.execute(validated);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    
    getAvailableTools: () => Object.keys(tools),
  };
};
```

Features:
- Parameter validation with Zod
- Error boundaries
- Tool discovery
- Result formatting

## Composed Level Services

These services combine atomic services to provide higher-level functionality.

### createConversationManager

Orchestrates history and context using the closure pattern:

```typescript
export const createConversationManager = (systemPrompt?: string) => {
  // Compose atomic services
  const history = createConversationHistory(systemPrompt);
  const context = createConversationContext();
  
  // Public API combining both services
  return {
    // Unified message handling
    addUserMessage: (content: string) => {
      history.addMessage({ role: "user", content });
      context.incrementMessageCount();
    },
    
    processAgentResponse: (response: AgentResponse) => {
      // Add assistant message
      history.addMessage({
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
      });
      
      // Update context metrics
      context.incrementMessageCount();
      if (response.toolCalls?.length) {
        context.incrementToolCallCount(response.toolCalls.length);
      }
    },
    
    // Combined state access
    getConversationState: () => ({
      messages: history.getMessages(),
      context: context.getState(),
      metrics: context.getMetrics(),
    }),
    
    // Delegate to underlying services
    ...history,  // All history methods
    updateState: context.updateState,
    getMetadata: context.getMetadata,
    
    reset: () => {
      history.clear();
      context.resetState();
    },
  };
};
```

Responsibilities:
- Message flow coordination
- State synchronization
- Metrics tracking
- Unified interface

## Organism Level Services

The highest level services that implement complete workflows and autonomous behaviors.

### createConversationLoop

Manages complete conversation lifecycles with agent integration:

```typescript
export const createConversationLoop = (options: ConversationLoopOptions) => {
  // Private state
  const manager = createConversationManager(options.systemPrompt);
  const agent = options.agent;
  let isActive = true;
  let turnCount = 0;
  
  // Private helper functions
  const resolveToolCalls = async (toolCalls: ToolCall[], maxRounds = 5) => {
    let rounds = 0;
    let currentToolCalls = toolCalls;
    
    while (currentToolCalls.length > 0 && rounds < maxRounds) {
      // Execute tools and collect results
      for (const toolCall of currentToolCalls) {
        const result = await options.toolExecutor.execute(toolCall);
        manager.addToolResponse(toolCall.id, toolCall.name, result);
      }
      
      // Get next response with tool results
      const response = await agent.act({
        messages: manager.getMessages(),
      });
      
      currentToolCalls = response.toolCalls || [];
      rounds++;
    }
  };
  
  // Public API
  return {
    sendMessage: async (userMessage: string) => {
      if (!isActive) throw new Error("Conversation has ended");
      
      manager.addUserMessage(userMessage);
      turnCount++;
      
      const response = await agent.act({
        messages: manager.getMessages(),
        context: manager.getState(),
      });
      
      manager.processAgentResponse(response);
      
      if (response.toolCalls?.length) {
        await resolveToolCalls(response.toolCalls);
      }
      
      return response;
    },
    
    endConversation: () => {
      isActive = false;
    },
    
    resetConversation: () => {
      manager.reset();
      isActive = true;
      turnCount = 0;
    },
    
    getAnalytics: () => ({
      ...manager.getMetrics(),
      turnCount,
      isActive,
    }),
    
    exportConversation: () => ({
      messages: manager.getMessages(),
      context: manager.getState(),
      metadata: {
        turnCount,
        exported: new Date().toISOString(),
      },
    }),
    
    // Delegate manager methods
    getMessages: manager.getMessages,
    getConversationState: manager.getConversationState,
  };
};
```


### agentFlowService

Enables autonomous agent execution:

```typescript
export const createAgentFlow = (options: AgentFlowOptions) => {
  const { agent, goal, maxIterations = 5 } = options;
  
  // Private state for autonomous execution
  const executionHistory: ExecutionStep[] = [];
  let isRunning = false;
  
  return {
    runAutonomous: async () => {
      if (isRunning) throw new Error("Already running");
      isRunning = true;
      
      try {
        for (let i = 0; i < maxIterations; i++) {
          const step = await executeStep(i);
          executionHistory.push(step);
          
          if (step.isComplete) break;
        }
        
        return synthesizeResults(executionHistory);
      } finally {
        isRunning = false;
      }
    },
    
    getExecutionHistory: () => [...executionHistory],
  };
};
```

## Service Integration

### Composition Pattern

Services are composed together using function composition:

```typescript
// Create an agent
const agent = createConfigurableAgent({
  llmConfig: { model: "gpt-4", provider: "openai" },
  systemPrompt: "You are a helpful assistant",
  tools: [weatherTool, calculatorTool],
});

// Create conversation loop with all features
const conversation = createConversationLoop({
  agent,
  conversationOptions: {
    historyOptions: {
      systemPrompt: agent.config.systemPrompt,
    },
  },
  onProgress: (update) => {
    console.log(`[${update.type}] ${update.content}`);
  },
});

// Use the composed service
const response = await conversation.sendMessage("What's the weather?");
```

### Service Communication

Services communicate through:

1. **Direct method calls** for synchronous operations
2. **Events** for asynchronous notifications
3. **Shared state** through context service
4. **Message passing** for loosely coupled components

## Observability Integration

All services integrate with Langfuse for comprehensive observability:

```typescript
class ObservableService {
  protected trace: LangfuseTrace;
  
  async execute(operation: string, fn: Function) {
    const span = this.trace.span({
      name: operation,
      startTime: new Date(),
    });
    
    try {
      const result = await fn();
      span.end({ output: result });
      return result;
    } catch (error) {
      span.end({ level: "ERROR", statusMessage: error.message });
      throw error;
    }
  }
}
```

## Service Patterns

### Error Handling

Consistent error handling using closure pattern:

```typescript
export const createServiceWithErrorHandling = (options: ServiceOptions) => {
  // Private error handling logic
  const handleError = async (error: Error, context: string) => {
    console.error(`[${context}] Error:`, error.message);
    
    if (options.onError) {
      await options.onError(error, context);
    }
    
    if (options.throwErrors) {
      throw error;
    }
    
    return options.fallbackValue;
  };
  
  // Public API with error boundaries
  return {
    safeExecute: async <T>(
      operation: () => Promise<T>,
      context: string
    ): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        return handleError(error, context);
      }
    },
  };
};
```

### Caching

Services implement caching for performance:

```typescript
export const createCachedService = () => {
  // Private cache state
  const cache = new Map<string, { value: any; expiry: number }>();
  
  // Cache management functions
  const isExpired = (expiry: number) => Date.now() > expiry;
  
  const cleanup = () => {
    for (const [key, entry] of cache.entries()) {
      if (isExpired(entry.expiry)) {
        cache.delete(key);
      }
    }
  };
  
  // Public API
  return {
    getCached: async <T>(
      key: string,
      factory: () => Promise<T>,
      ttl: number = 3600000
    ): Promise<T> => {
      const cached = cache.get(key);
      
      if (cached && !isExpired(cached.expiry)) {
        return cached.value as T;
      }
      
      const value = await factory();
      cache.set(key, {
        value,
        expiry: Date.now() + ttl,
      });
      
      // Periodic cleanup
      if (cache.size > 100) cleanup();
      
      return value;
    },
    
    invalidate: (key: string) => {
      cache.delete(key);
    },
    
    clear: () => {
      cache.clear();
    },
  };
};
```

### Rate Limiting

Protect external resources:

```typescript
export const createRateLimitedService = (config: RateLimitConfig) => {
  // Private rate limit state
  let tokens = config.tokensPerInterval;
  let lastRefill = Date.now();
  
  // Token bucket algorithm
  const refillTokens = () => {
    const now = Date.now();
    const timePassed = now - lastRefill;
    const intervalsPasssed = timePassed / config.intervalMs;
    
    tokens = Math.min(
      config.tokensPerInterval,
      tokens + intervalsPasssed * config.tokensPerInterval
    );
    lastRefill = now;
  };
  
  // Public API
  return {
    executeWithLimit: async <T>(
      operation: () => Promise<T>
    ): Promise<T> => {
      refillTokens();
      
      if (tokens < 1) {
        throw new Error("Rate limit exceeded");
      }
      
      tokens -= 1;
      return operation();
    },
    
    getTokensRemaining: () => {
      refillTokens();
      return Math.floor(tokens);
    },
  };
};
```

## Best Practices

### 1. Single Responsibility
Each service should have one clear purpose.

### 2. Interface Segregation
Services expose only necessary methods.

### 3. Dependency Inversion
Depend on abstractions, not concrete implementations.

### 4. Testability
Services should be easily testable in isolation.

### 5. Observability
All services should emit telemetry data.

## Next Steps

- [Conversation Management](/docs/core-concepts/conversation-management) - Deep dive into conversation handling
- [Observability](/docs/core-concepts/observability) - Monitor your services
- [API Reference](/docs/api/services) - Detailed service API documentation