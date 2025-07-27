---
sidebar_position: 3
---

# Step Builders

Fluent API for building workflow steps with different execution types.

## Overview

Step builders provide a chainable interface for defining workflow steps. Each step can execute different types of operations and optionally define transitions to other steps.

## StepBuilder Interface

```typescript
interface StepBuilder {
  function<TInput = any, TOutput = any>(
    fn: StepFunction<TInput, TOutput>
  ): StepBuilder;
  
  llm(agent: Agent): StepBuilder;
  
  then(transition: TransitionFunction): StepBuilder;
}
```

## Step Types

### Function Steps

Execute deterministic operations with full access to conversation primitives.

```typescript
workflow
  .step('processData')
    .function(async (input, context) => {
      // Access injected primitives
      const { manager, context: ctx, history } = context;
      
      // Convenience methods
      await context.addMessage(`Processing: ${input.data}`);
      await context.setState('processing', true);
      const state = context.getState();
      
      // Your logic here
      const result = processData(input);
      
      // Return value becomes input for next step
      return result;
    });
```

### LLM Steps

Execute AI-powered operations using configured agents.

```typescript
const analysisAgent = createConfigurableAgent({
  // ... agent configuration
});

workflow
  .step('analyzeContent')
    .llm(analysisAgent)
    .then(response => {
      // Response is the LLM's text output
      if (response.includes('urgent')) return 'handleUrgent';
      return 'continueNormal';
    });
```

### Conditional Transitions

Define dynamic routing based on step results.

```typescript
workflow
  .step('evaluate')
    .function(async (input) => {
      const score = calculateScore(input);
      return { score, data: input };
    })
    .then(result => {
      // Return next step name or null to end
      if (result.score > 90) return 'excellent';
      if (result.score > 70) return 'good';
      if (result.score > 50) return 'needsWork';
      return 'failed';
    });
```

## Step Context

Every step receives a context object with the following structure:

```typescript
interface StepContext {
  // Core primitives
  manager: ConversationManager;
  context: ConversationContext;
  history: ConversationHistory;
  
  // Convenience methods
  addMessage: (content: string) => Promise<void>;
  getState: () => Record<string, any>;
  setState: (key: string, value: any) => Promise<void>;
  
  // Step metadata
  stepName: string;
  workflow?: Workflow;
}
```

## Examples

### Data Processing Pipeline

```typescript
workflow
  .step('fetchData')
    .function(async (url, { setState }) => {
      const data = await fetch(url).then(r => r.json());
      await setState('rawData', data);
      return data;
    })
    .then(() => 'validateData')
  
  .step('validateData')
    .function(async (data, { setState }) => {
      const errors = validateSchema(data);
      if (errors.length > 0) {
        await setState('validationErrors', errors);
        return { valid: false, errors };
      }
      return { valid: true, data };
    })
    .then(result => result.valid ? 'processData' : 'handleErrors')
  
  .step('processData')
    .function(async (validatedData, { addMessage, setState }) => {
      await addMessage('Processing validated data...');
      const processed = await heavyProcessing(validatedData.data);
      await setState('processedData', processed);
      return processed;
    });
```

### Multi-Agent Workflow

```typescript
const classifier = createConfigurableAgent({ /* ... */ });
const technicalAgent = createConfigurableAgent({ /* ... */ });
const salesAgent = createConfigurableAgent({ /* ... */ });

workflow
  .step('classify')
    .llm(classifier)
    .then(category => {
      const routes = {
        'technical': 'technicalResponse',
        'sales': 'salesResponse',
        'general': 'generalResponse'
      };
      return routes[category] || 'generalResponse';
    })
  
  .step('technicalResponse')
    .llm(technicalAgent)
    .then(() => 'wrapUp')
  
  .step('salesResponse')
    .llm(salesAgent)
    .then(() => 'wrapUp')
  
  .step('wrapUp')
    .function(async (response, { history, setState }) => {
      const conversation = history.getMessages();
      await setState('conversationComplete', true);
      await setState('finalResponse', response);
      return {
        response,
        messageCount: conversation.length
      };
    });
```

### State Machine Pattern

```typescript
workflow
  .step('idle')
    .function(async (event, { getState }) => {
      const state = getState();
      if (state.queue && state.queue.length > 0) {
        return state.queue.shift();
      }
      return { status: 'waiting' };
    })
    .then(result => 
      result.status === 'waiting' ? null : 'processing'
    )
  
  .step('processing')
    .function(async (task, { setState, addMessage }) => {
      await addMessage(`Processing task: ${task.id}`);
      await setState('currentTask', task);
      
      try {
        const result = await processTask(task);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    })
    .then(result => 
      result.success ? 'complete' : 'errorHandler'
    )
  
  .step('complete')
    .function(async (result, { setState, getState }) => {
      await setState('lastCompleted', Date.now());
      const completed = getState().completed || [];
      await setState('completed', [...completed, result]);
      return result;
    })
    .then(() => 'idle'); // Loop back to check for more tasks
```

### Error Handling

```typescript
workflow
  .step('riskyOperation')
    .function(async (input, { setState }) => {
      try {
        const result = await riskyApiCall(input);
        return { success: true, data: result };
      } catch (error) {
        await setState('lastError', {
          step: 'riskyOperation',
          error: error.message,
          timestamp: Date.now()
        });
        return { success: false, error: error.message };
      }
    })
    .then(result => 
      result.success ? 'processSuccess' : 'handleFailure'
    )
  
  .step('handleFailure')
    .function(async (failure, { getState, setState }) => {
      const retryCount = getState().retryCount || 0;
      
      if (retryCount < 3) {
        await setState('retryCount', retryCount + 1);
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        return { retry: true };
      }
      
      return { retry: false, failed: true };
    })
    .then(result => 
      result.retry ? 'riskyOperation' : 'notifyFailure'
    );
```

## Best Practices

1. **Keep steps focused** - Each step should have a single responsibility
2. **Use meaningful names** - Step names should describe what they do
3. **Handle errors** - Always consider failure cases in your steps
4. **Document transitions** - Make routing logic clear and understandable
5. **Leverage context** - Use setState/getState for sharing data between steps
6. **Test steps independently** - Design steps to be testable in isolation

## TypeScript Support

The step builder API is fully typed:

```typescript
// Step function with typed input/output
workflow
  .step('typedStep')
    .function<{ userId: string }, { user: User }>(
      async (input, context) => {
        const user = await fetchUser(input.userId);
        return { user };
      }
    )
    .then((result: { user: User }) => {
      return result.user.role === 'admin' ? 'adminFlow' : 'userFlow';
    });
```

## Related APIs

- [createWorkflow](./create-workflow) - Main workflow factory
- [Workflow Types](./types) - TypeScript interfaces
- [Agent Factory](/docs/sdk-reference/factories/configurable-agent) - Creating agents for LLM steps