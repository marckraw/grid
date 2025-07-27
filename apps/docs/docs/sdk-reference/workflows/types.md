---
sidebar_position: 4
---

# Workflow Types

TypeScript type definitions for the workflows package.

## Core Types

### WorkflowConfig

Configuration options for creating a workflow.

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
```

### Workflow

The main workflow interface returned by `createWorkflow`.

```typescript
interface Workflow {
  step(name: string): StepBuilder;
  
  run<T = any>(
    initialStep: string,
    input?: any
  ): Promise<WorkflowResult<T>>;
  
  suspend(): Promise<WorkflowCheckpoint>;
  
  resume(checkpoint: WorkflowCheckpoint): Promise<void>;
  
  primitives: {
    manager: ConversationManager;
    context: ConversationContext;
    history: ConversationHistory;
  };
}
```

### WorkflowResult

Result returned after workflow execution.

```typescript
interface WorkflowResult<T = any> {
  finalResult: T;
  executedSteps: string[];
  state: Record<string, any>;
  history: ChatMessage[];
  duration: number;
}
```

### WorkflowCheckpoint

Checkpoint data for suspending and resuming workflows.

```typescript
interface WorkflowCheckpoint {
  currentStep: string | null;
  state: Record<string, any>;
  history: ChatMessage[];
  executedSteps: string[];
}
```

## Step Types

### StepContext

Context object provided to every workflow step.

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

### StepFunction

Function signature for workflow steps.

```typescript
type StepFunction<TInput = any, TOutput = any> = (
  input: TInput,
  context: StepContext
) => Promise<TOutput>;
```

### TransitionFunction

Function that determines the next step based on results.

```typescript
type TransitionFunction<TResult = any> = (
  result: TResult
) => string | null;
```

### WorkflowStep

Internal representation of a workflow step.

```typescript
interface WorkflowStep {
  name: string;
  type: "function" | "llm" | "conditional";
  execute: StepFunction;
  transition?: TransitionFunction;
}
```

### StepBuilder

Builder interface for creating workflow steps.

```typescript
interface StepBuilder {
  function<TInput = any, TOutput = any>(
    fn: StepFunction<TInput, TOutput>
  ): StepBuilder;
  
  llm(agent: Agent): StepBuilder;
  
  then(transition: TransitionFunction): StepBuilder;
}
```

## Usage Examples

### Typed Workflow Creation

```typescript
import { createWorkflow, WorkflowConfig } from '@mrck-labs/grid-workflows';

const config: WorkflowConfig = {
  name: 'Order Processing',
  description: 'Handles order processing workflow',
  managerOptions: {
    historyOptions: {
      systemPrompt: 'You are an order processing assistant',
      maxMessages: 50
    }
  }
};

const workflow = createWorkflow(config);
```

### Typed Step Functions

```typescript
interface OrderInput {
  orderId: string;
  customerId: string;
  items: Array<{ sku: string; quantity: number }>;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  order?: OrderInput;
}

workflow
  .step('validateOrder')
    .function<OrderInput, ValidationResult>(async (order, context) => {
      await context.addMessage(`Validating order ${order.orderId}`);
      
      const errors: string[] = [];
      
      if (!order.customerId) {
        errors.push('Customer ID is required');
      }
      
      if (!order.items || order.items.length === 0) {
        errors.push('Order must contain at least one item');
      }
      
      if (errors.length > 0) {
        await context.setState('validationErrors', errors);
        return { valid: false, errors };
      }
      
      return { valid: true, order };
    })
    .then((result: ValidationResult) => 
      result.valid ? 'processOrder' : 'handleValidationError'
    );
```

### Typed Workflow Results

```typescript
interface OrderResult {
  orderId: string;
  status: 'completed' | 'failed' | 'pending';
  trackingNumber?: string;
}

const result = await workflow.run<OrderResult>('validateOrder', orderInput);

// TypeScript knows the shape of result.finalResult
console.log(result.finalResult.orderId);
console.log(result.finalResult.status);
```

### Working with Checkpoints

```typescript
import { WorkflowCheckpoint } from '@mrck-labs/grid-workflows';

// Save checkpoint
const checkpoint: WorkflowCheckpoint = await workflow.suspend();

// Serialize for storage
const serialized = JSON.stringify(checkpoint);
await database.checkpoints.save({
  id: 'checkpoint-123',
  data: serialized
});

// Later... restore and resume
const saved = await database.checkpoints.findById('checkpoint-123');
const checkpoint = JSON.parse(saved.data) as WorkflowCheckpoint;

await workflow.resume(checkpoint);
```

### Custom Step Context Extensions

```typescript
// Extend step context with custom helpers
type ExtendedStepContext = StepContext & {
  log: (message: string) => void;
  metric: (name: string, value: number) => void;
};

const wrapStep = <T, R>(
  step: (input: T, context: ExtendedStepContext) => Promise<R>
): StepFunction<T, R> => {
  return async (input, context) => {
    const extended: ExtendedStepContext = {
      ...context,
      log: (message) => console.log(`[${context.stepName}] ${message}`),
      metric: (name, value) => metrics.record(name, value)
    };
    
    return step(input, extended);
  };
};

// Use wrapped step
workflow
  .step('enhanced')
    .function(wrapStep(async (input, context) => {
      context.log('Starting enhanced step');
      context.metric('step.start', Date.now());
      
      // Your logic here
      
      return { enhanced: true };
    }));
```

## Type Guards

Useful type guards for working with workflow data:

```typescript
// Check if a value is a valid transition result
function isValidTransition(value: any): value is string | null {
  return typeof value === 'string' || value === null;
}

// Check if an object is a workflow result
function isWorkflowResult<T>(value: any): value is WorkflowResult<T> {
  return (
    value &&
    typeof value === 'object' &&
    'finalResult' in value &&
    'executedSteps' in value &&
    Array.isArray(value.executedSteps) &&
    'duration' in value &&
    typeof value.duration === 'number'
  );
}

// Check if an object is a valid checkpoint
function isWorkflowCheckpoint(value: any): value is WorkflowCheckpoint {
  return (
    value &&
    typeof value === 'object' &&
    'state' in value &&
    'history' in value &&
    Array.isArray(value.history) &&
    'executedSteps' in value &&
    Array.isArray(value.executedSteps)
  );
}
```

## Related Types

These types are imported from `@mrck-labs/grid-core`:

- [`Agent`](/docs/sdk-reference/types/agent) - For LLM steps
- [`ConversationManager`](/docs/sdk-reference/conversation-primitives/conversation-manager)
- [`ConversationContext`](/docs/sdk-reference/conversation-primitives/conversation-context)
- [`ConversationHistory`](/docs/sdk-reference/conversation-primitives/conversation-history)
- [`ChatMessage`](/docs/sdk-reference/types/llm) - Message format