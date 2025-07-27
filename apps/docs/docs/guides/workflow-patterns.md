---
sidebar_position: 6
---

# Workflow Patterns

Learn how to implement common workflow patterns using Grid's workflow primitives.

## Overview

Grid's workflow package enables you to build deterministic, multi-step processes that combine AI capabilities with traditional programming logic. This guide covers common patterns and best practices.

## When to Use Workflows

Workflows are ideal when you need:
- **Predictable execution paths** with conditional branching
- **Multi-step processes** with clear stages
- **State management** across operations
- **Mixed AI and deterministic logic**
- **Auditable execution traces**

## Basic Patterns

### Sequential Processing

The simplest pattern - steps execute one after another.

```typescript
const workflow = createWorkflow();

workflow
  .step('fetch')
    .function(async (url) => {
      const data = await fetch(url).then(r => r.json());
      return data;
    })
    .then(() => 'process')
  
  .step('process')
    .function(async (data) => {
      const processed = transformData(data);
      return processed;
    })
    .then(() => 'save')
  
  .step('save')
    .function(async (data, { setState }) => {
      await saveToDatabase(data);
      await setState('saved', true);
      return { success: true };
    });

await workflow.run('fetch', 'https://api.example.com/data');
```

### Conditional Routing

Route to different paths based on conditions.

```typescript
workflow
  .step('evaluate')
    .function(async (input) => {
      const score = calculateScore(input);
      return { score, input };
    })
    .then(result => {
      if (result.score > 80) return 'highScore';
      if (result.score > 50) return 'mediumScore';
      return 'lowScore';
    })
  
  .step('highScore')
    .function(async (data) => {
      return { tier: 'premium', ...data };
    })
  
  .step('mediumScore')
    .function(async (data) => {
      return { tier: 'standard', ...data };
    })
  
  .step('lowScore')
    .function(async (data) => {
      return { tier: 'basic', ...data };
    });
```

### AI-Powered Decision Making

Use LLMs to make routing decisions.

```typescript
const decisionAgent = createConfigurableAgent({
  llmService: baseLLMService(),
  config: {
    // ... agent config
    prompts: {
      system: `Analyze the input and categorize it as:
      - "urgent": Requires immediate attention
      - "normal": Standard processing
      - "low": Can be deferred
      
      Respond with only the category.`
    }
  }
});

workflow
  .step('categorize')
    .llm(decisionAgent)
    .then(category => {
      const routes = {
        'urgent': 'immediateAction',
        'normal': 'standardProcess',
        'low': 'deferredQueue'
      };
      return routes[category.toLowerCase().trim()] || 'standardProcess';
    });
```

## Advanced Patterns

### Retry with Backoff

Implement retry logic for unreliable operations.

```typescript
workflow
  .step('attempt')
    .function(async (input, { getState, setState }) => {
      const attempts = getState().attempts || 0;
      
      try {
        const result = await unreliableOperation(input);
        return { success: true, result };
      } catch (error) {
        await setState('attempts', attempts + 1);
        await setState('lastError', error.message);
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return { success: false, attempts: attempts + 1 };
      }
    })
    .then(result => {
      if (!result.success && result.attempts < 3) {
        return 'attempt'; // Retry
      }
      return result.success ? 'success' : 'failure';
    });
```

### Parallel Processing with Aggregation

Process multiple items in parallel, then aggregate results.

```typescript
workflow
  .step('split')
    .function(async (items) => {
      // Process items in parallel
      const results = await Promise.all(
        items.map(item => processItem(item))
      );
      return results;
    })
    .then(() => 'aggregate')
  
  .step('aggregate')
    .function(async (results, { setState }) => {
      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        data: results
      };
      
      await setState('summary', summary);
      return summary;
    })
    .then(summary => 
      summary.failed > 0 ? 'handleFailures' : 'complete'
    );
```

### State Machine Pattern

Implement complex state machines with workflows.

```typescript
workflow
  .step('idle')
    .function(async (event, { getState, setState }) => {
      const currentState = getState().machineState || 'idle';
      
      switch (currentState) {
        case 'idle':
          if (event.type === 'start') {
            await setState('machineState', 'processing');
            return { transition: true, nextState: 'processing' };
          }
          break;
        
        case 'processing':
          if (event.type === 'complete') {
            await setState('machineState', 'done');
            return { transition: true, nextState: 'done' };
          }
          if (event.type === 'error') {
            await setState('machineState', 'error');
            return { transition: true, nextState: 'error' };
          }
          break;
      }
      
      return { transition: false, currentState };
    })
    .then(result => 
      result.transition ? result.nextState : null
    );
```

### Conversation Flow

Build conversational workflows that maintain context.

```typescript
workflow
  .step('greet')
    .function(async (_, { addMessage }) => {
      await addMessage("Hello! I'm here to help. What's your name?");
      return { stage: 'getName' };
    })
    .then(() => 'waitForName')
  
  .step('waitForName')
    .function(async (input, { setState, addMessage }) => {
      // In real app, this would wait for user input
      const userName = input.name;
      await setState('userName', userName);
      await addMessage(`Nice to meet you, ${userName}! How can I help you today?`);
      return { stage: 'getRequest' };
    })
    .then(() => 'processRequest')
  
  .step('processRequest')
    .llm(assistantAgent)
    .then(response => {
      if (response.includes('goodbye')) {
        return 'farewell';
      }
      return 'continueConversation';
    });
```

## Integration Patterns

### Database Integration

```typescript
workflow
  .step('loadUser')
    .function(async (userId, { setState }) => {
      const user = await db.users.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      await setState('user', user);
      return user;
    })
    .then(user => user.status === 'active' ? 'processActive' : 'handleInactive')
  
  .step('processActive')
    .function(async (user, { history }) => {
      // Log interaction
      await db.interactions.create({
        userId: user.id,
        timestamp: new Date(),
        messages: history.getMessages()
      });
      
      return { processed: true };
    });
```

### External API Integration

```typescript
workflow
  .step('enrichData')
    .function(async (input, { setState, getState }) => {
      // Check cache first
      const cached = getState()[`cache.${input.id}`];
      if (cached && Date.now() - cached.timestamp < 3600000) {
        return cached.data;
      }
      
      // Fetch from API
      const enriched = await externalApi.enrich(input);
      
      // Cache result
      await setState(`cache.${input.id}`, {
        data: enriched,
        timestamp: Date.now()
      });
      
      return enriched;
    });
```

### Event-Driven Workflows

```typescript
workflow
  .step('waitForEvent')
    .function(async (_, { getState }) => {
      const events = getState().pendingEvents || [];
      
      if (events.length === 0) {
        // In real app, would subscribe to event stream
        return { type: 'wait' };
      }
      
      const event = events.shift();
      return event;
    })
    .then(event => {
      if (event.type === 'wait') return null; // End workflow
      
      const handlers = {
        'user.created': 'handleUserCreated',
        'order.placed': 'handleOrderPlaced',
        'payment.received': 'handlePaymentReceived'
      };
      
      return handlers[event.type] || 'handleUnknown';
    });
```

## Best Practices

### 1. Design for Testability

```typescript
// Separate business logic from workflow structure
const businessLogic = {
  validateOrder: async (order: Order) => {
    // Validation logic
    return { valid: true, errors: [] };
  },
  
  calculateDiscount: async (order: Order) => {
    // Discount logic
    return { discount: 0.1 };
  }
};

// Use in workflow
workflow
  .step('validate')
    .function(async (order) => businessLogic.validateOrder(order))
    .then(result => result.valid ? 'discount' : 'reject');
```

### 2. Handle Errors Gracefully

```typescript
workflow
  .step('riskyOperation')
    .function(async (input, { setState }) => {
      try {
        return await riskyOperation(input);
      } catch (error) {
        await setState('error', {
          step: 'riskyOperation',
          message: error.message,
          timestamp: Date.now()
        });
        
        // Return error state instead of throwing
        return { error: true, message: error.message };
      }
    })
    .then(result => 
      result.error ? 'errorHandler' : 'continue'
    );
```

### 3. Use Context Effectively

```typescript
workflow
  .step('collectData')
    .function(async (input, { setState }) => {
      // Store intermediate results
      await setState('raw', input);
      await setState('timestamp', Date.now());
      
      const processed = processData(input);
      await setState('processed', processed);
      
      return processed;
    })
  
  .step('audit')
    .function(async (_, { getState }) => {
      // Access all stored data for audit
      const auditLog = {
        raw: getState().raw,
        processed: getState().processed,
        timestamp: getState().timestamp,
        duration: Date.now() - getState().timestamp
      };
      
      await saveAuditLog(auditLog);
      return auditLog;
    });
```

### 4. Monitor and Observe

```typescript
// Add observability to workflows
const monitoredWorkflow = createWorkflow({
  name: 'OrderProcessing',
  managerOptions: {
    historyOptions: {
      systemPrompt: 'Order processing assistant'
    }
  }
});

// Wrap steps with monitoring
const monitorStep = (stepName: string, fn: StepFunction) => {
  return async (input: any, context: StepContext) => {
    const start = Date.now();
    
    try {
      const result = await fn(input, context);
      
      metrics.recordSuccess(stepName, Date.now() - start);
      return result;
    } catch (error) {
      metrics.recordFailure(stepName, Date.now() - start);
      throw error;
    }
  };
};

monitoredWorkflow
  .step('process')
    .function(monitorStep('process', async (input) => {
      // Your logic here
      return processed;
    }));
```

## Next Steps

- Explore [Workflow SDK Reference](/docs/sdk-reference/workflows) for detailed API documentation
- See [Terminal Agent Examples](https://github.com/your-repo/grid/tree/main/apps/terminal-agent/src/commands/workflow-examples.ts) for working code
- Learn about [Conversation Primitives](/docs/core-concepts/conversation-primitives) that power workflows