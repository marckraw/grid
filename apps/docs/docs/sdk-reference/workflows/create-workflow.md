---
sidebar_position: 2
---

# createWorkflow

Creates a new workflow instance with injected conversation primitives.

## Overview

`createWorkflow` is the main factory function for creating workflows. It sets up dedicated conversation primitives (manager, context, history) that are automatically injected into all workflow steps.

## Import

```typescript
import { createWorkflow } from "@mrck-labs/grid-workflows";
```

## Function Signature

```typescript
function createWorkflow(config?: WorkflowConfig): Workflow
```

## Parameters

### config (optional)
- **Type**: `WorkflowConfig`
- **Properties**:
  - `name` (optional): Workflow name for identification
    - **Type**: `string`
  - `description` (optional): Workflow description
    - **Type**: `string`
  - `managerOptions` (optional): Options for the conversation manager
    - **Type**: `object`
    - **Properties**:
      - `historyOptions`: Options for conversation history
        - `systemPrompt`: Initial system prompt
        - `maxMessages`: Maximum message limit
      - `contextOptions`: Options for conversation context

## Return Type: Workflow

### Methods

#### step
```typescript
step(name: string): StepBuilder
```
Define a new workflow step with the given name.

**Parameters**:
- `name`: Unique identifier for the step

**Returns**: StepBuilder for configuring the step

#### run
```typescript
run<T = any>(initialStep: string, input?: any): Promise<WorkflowResult<T>>
```
Execute the workflow starting from the specified step.

**Parameters**:
- `initialStep`: Name of the first step to execute
- `input` (optional): Initial input data

**Returns**: Promise resolving to WorkflowResult containing:
- `finalResult`: The output from the last executed step
- `executedSteps`: Array of step names that were executed
- `state`: Final workflow state
- `history`: Conversation messages
- `duration`: Total execution time in milliseconds

#### suspend
```typescript
suspend(): Promise<WorkflowCheckpoint>
```
Suspend the workflow execution and get a checkpoint.

**Returns**: Checkpoint containing current state, history, and progress

#### resume
```typescript
resume(checkpoint: WorkflowCheckpoint): Promise<void>
```
Resume workflow execution from a checkpoint.

**Parameters**:
- `checkpoint`: Previously saved checkpoint

#### primitives
```typescript
primitives: {
  manager: ConversationManager;
  context: ConversationContext;
  history: ConversationHistory;
}
```
Direct access to the underlying conversation primitives.

## Examples

### Basic Workflow

```typescript
const workflow = createWorkflow();

workflow
  .step('start')
    .function(async (input) => {
      console.log('Starting workflow with:', input);
      return { processed: true, data: input };
    })
    .then(() => 'finish');

workflow
  .step('finish')
    .function(async (input) => {
      console.log('Finishing with:', input);
      return { complete: true };
    });

const result = await workflow.run('start', { message: 'Hello' });
```

### With System Prompt

```typescript
const workflow = createWorkflow({
  name: 'Support Workflow',
  description: 'Handles customer support requests',
  managerOptions: {
    historyOptions: {
      systemPrompt: 'You are a helpful support assistant',
      maxMessages: 100
    }
  }
});
```

### Accessing Primitives in Steps

```typescript
workflow
  .step('process')
    .function(async (input, { manager, context, history }) => {
      // Use conversation manager
      await manager.addUserMessage(input.message);
      
      // Update context state
      await context.updateState('processed', true);
      await context.updateState('timestamp', Date.now());
      
      // Check history
      const messageCount = history.getMessages().length;
      console.log(`Total messages: ${messageCount}`);
      
      return { processed: true };
    });
```

### LLM Steps

```typescript
const agent = createConfigurableAgent({
  // ... agent configuration
});

workflow
  .step('analyze')
    .llm(agent)
    .then(response => {
      // Route based on LLM response
      if (response.includes('urgent')) return 'handleUrgent';
      return 'handleNormal';
    });
```

### Conditional Branching

```typescript
workflow
  .step('categorize')
    .function(async (input) => {
      const category = analyzeInput(input);
      return { category, originalInput: input };
    })
    .then(result => {
      switch (result.category) {
        case 'technical': return 'technicalSupport';
        case 'billing': return 'billingSupport';
        case 'general': return 'generalSupport';
        default: return 'unknownCategory';
      }
    });
```

### Error Handling

```typescript
try {
  const result = await workflow.run('start', input);
  console.log('Success:', result);
} catch (error) {
  console.error('Workflow failed:', error);
  // Check which step failed
  const checkpoint = await workflow.suspend();
  console.log('Failed at step:', checkpoint.currentStep);
}
```

### Suspend and Resume

```typescript
// Start workflow
const workflow = createWorkflow();
// ... define steps ...

// Execute partially
await workflow.run('start', input);

// Suspend execution
const checkpoint = await workflow.suspend();

// Save checkpoint (e.g., to database)
await saveCheckpoint(checkpoint);

// Later... restore and continue
const savedCheckpoint = await loadCheckpoint();
await workflow.resume(savedCheckpoint);

// Continue execution
const result = await workflow.run(savedCheckpoint.currentStep, savedInput);
```

## Best Practices

1. **Use descriptive step names** - Makes debugging and tracing easier
2. **Keep steps focused** - Each step should do one thing well
3. **Handle errors gracefully** - Use try-catch in function steps
4. **Leverage context** - Store intermediate results in context
5. **Use transitions wisely** - Make routing logic clear and testable

## TypeScript Types

```typescript
interface WorkflowConfig {
  name?: string;
  description?: string;
  managerOptions?: {
    historyOptions?: {
      systemPrompt?: string;
      maxMessages?: number;
    };
    contextOptions?: any;
  };
}

interface WorkflowResult<T = any> {
  finalResult: T;
  executedSteps: string[];
  state: Record<string, any>;
  history: ChatMessage[];
  duration: number;
}

interface WorkflowCheckpoint {
  currentStep: string | null;
  state: Record<string, any>;
  history: ChatMessage[];
  executedSteps: string[];
}
```

## Related APIs

- [Step Builders](./step-builders) - Building workflow steps
- [Workflow Types](./types) - Complete type definitions
- [ConversationManager](/docs/sdk-reference/conversation-primitives/conversation-manager) - Underlying manager
- [ConversationContext](/docs/sdk-reference/conversation-primitives/conversation-context) - State management