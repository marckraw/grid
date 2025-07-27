---
sidebar_position: 7
---

# Getting Started with Workflows

Learn how to build deterministic multi-step processes with Grid's workflow primitives.

## What are Workflows?

Workflows in Grid allow you to:
- Build **multi-step processes** with clear execution paths
- Combine **deterministic functions** with **AI-powered decisions**
- Route between steps based on **conditional logic**
- Access all **conversation primitives** in every step

## Installation

```bash
npm install @mrck-labs/grid-workflows
# or
pnpm add @mrck-labs/grid-workflows
```

## Your First Workflow

Let's build a simple customer support workflow:

```typescript
import { createWorkflow } from '@mrck-labs/grid-workflows';
import { createConfigurableAgent, baseLLMService } from '@mrck-labs/grid-core';

// Create a categorization agent
const categorizationAgent = createConfigurableAgent({
  llmService: baseLLMService({ langfuse: { enabled: false } }),
  config: {
    id: "categorizer",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: `Categorize customer issues as: 'technical', 'billing', or 'general'.
               Respond with only the category name.`
    },
    metadata: {
      id: "categorizer",
      type: "general",
      name: "Issue Categorizer",
      description: "Categorizes customer issues",
      capabilities: ["general"],
      version: "1.0.0",
      icon: "🏷️"
    },
    tools: {
      builtin: [],
      custom: [],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text",
      validateResponse: true
    }
  }
});

// Create the workflow
const supportWorkflow = createWorkflow({
  name: "Customer Support",
  managerOptions: {
    historyOptions: {
      systemPrompt: "You are managing a customer support workflow"
    }
  }
});

// Define workflow steps
supportWorkflow
  .step('categorize')
    .llm(categorizationAgent)
    .then(category => {
      // Route based on category
      switch (category.toLowerCase().trim()) {
        case 'technical':
          return 'handleTechnical';
        case 'billing':
          return 'handleBilling';
        default:
          return 'handleGeneral';
      }
    })
  
  .step('handleTechnical')
    .function(async (issue, { addMessage, setState }) => {
      await addMessage("I'll connect you with our technical team.");
      await setState('department', 'technical');
      await setState('priority', 'high');
      
      return {
        routed: true,
        department: 'technical',
        message: 'Technical support will assist you shortly.'
      };
    })
  
  .step('handleBilling')
    .function(async (issue, { addMessage, setState }) => {
      await addMessage("I'll help you with your billing question.");
      await setState('department', 'billing');
      
      return {
        routed: true,
        department: 'billing',
        message: 'Our billing team will contact you within 24 hours.'
      };
    })
  
  .step('handleGeneral')
    .function(async (issue, { addMessage }) => {
      await addMessage("I'll help you with your question.");
      
      return {
        routed: true,
        department: 'general',
        message: 'How can I assist you today?'
      };
    });

// Execute the workflow
async function handleCustomerIssue(issue: string) {
  const result = await supportWorkflow.run('categorize', issue);
  
  console.log('Department:', result.finalResult.department);
  console.log('Response:', result.finalResult.message);
  console.log('Steps executed:', result.executedSteps);
}

// Example usage
handleCustomerIssue("I can't log into my account");
```

## Step Context

Every workflow step receives a context object with these injected primitives:

```typescript
interface StepContext {
  // Core primitives
  manager: ConversationManager;    // Full conversation management
  context: ConversationContext;     // State management
  history: ConversationHistory;     // Message history
  
  // Convenience methods
  addMessage: (content: string) => Promise<void>;      // Add to conversation
  getState: () => Record<string, any>;                 // Get current state
  setState: (key: string, value: any) => Promise<void>; // Update state
  
  // Metadata
  stepName: string;  // Current step name
}
```

## Types of Steps

### Function Steps

Execute deterministic operations:

```typescript
workflow
  .step('calculate')
    .function(async (input, { setState }) => {
      const result = input.price * input.quantity;
      await setState('total', result);
      
      return { total: result };
    });
```

### LLM Steps

Use AI for decision making:

```typescript
workflow
  .step('analyze')
    .llm(analysisAgent)
    .then(response => {
      // Route based on AI response
      if (response.includes('urgent')) return 'escalate';
      return 'normal';
    });
```

### Conditional Routing

Direct flow based on results:

```typescript
workflow
  .step('checkInventory')
    .function(async (order) => {
      const available = await checkStock(order.items);
      return { available, order };
    })
    .then(result => 
      result.available ? 'processOrder' : 'backorder'
    );
```

## Complete Example: Order Processing

Here's a more complex workflow that processes orders:

```typescript
const orderWorkflow = createWorkflow({
  name: "Order Processing"
});

orderWorkflow
  // Validate order
  .step('validate')
    .function(async (order, { setState }) => {
      const errors = [];
      
      if (!order.items || order.items.length === 0) {
        errors.push('No items in order');
      }
      
      if (!order.customer.email) {
        errors.push('Customer email required');
      }
      
      await setState('validationErrors', errors);
      
      return {
        valid: errors.length === 0,
        errors,
        order
      };
    })
    .then(result => result.valid ? 'checkInventory' : 'rejectOrder')
  
  // Check inventory
  .step('checkInventory')
    .function(async ({ order }, { setState }) => {
      const availability = await Promise.all(
        order.items.map(async item => ({
          sku: item.sku,
          requested: item.quantity,
          available: await getStock(item.sku)
        }))
      );
      
      const allAvailable = availability.every(
        item => item.available >= item.requested
      );
      
      await setState('inventory', availability);
      
      return { allAvailable, order };
    })
    .then(result => 
      result.allAvailable ? 'processPayment' : 'offerAlternatives'
    )
  
  // Process payment
  .step('processPayment')
    .function(async ({ order }, { setState, addMessage }) => {
      try {
        const payment = await chargeCard(order.payment, order.total);
        await setState('paymentId', payment.id);
        await addMessage(`Payment processed: ${payment.id}`);
        
        return { success: true, order, paymentId: payment.id };
      } catch (error) {
        return { success: false, error: error.message };
      }
    })
    .then(result => 
      result.success ? 'shipOrder' : 'paymentFailed'
    )
  
  // Ship order
  .step('shipOrder')
    .function(async ({ order, paymentId }, { setState }) => {
      const tracking = await createShipment(order);
      await setState('trackingNumber', tracking);
      
      return {
        status: 'completed',
        order,
        paymentId,
        trackingNumber: tracking
      };
    })
  
  // Handle rejection
  .step('rejectOrder')
    .function(async ({ errors }, { addMessage }) => {
      await addMessage(`Order rejected: ${errors.join(', ')}`);
      return { status: 'rejected', errors };
    });

// Execute the workflow
const result = await orderWorkflow.run('validate', {
  items: [{ sku: 'ABC123', quantity: 2 }],
  customer: { email: 'customer@example.com' },
  payment: { method: 'card', token: 'tok_123' },
  total: 99.99
});

console.log('Order status:', result.finalResult.status);
console.log('Executed steps:', result.executedSteps);
```

## Best Practices

1. **Keep steps focused** - Each step should do one thing well
2. **Use meaningful names** - Step names should clearly indicate their purpose
3. **Handle errors gracefully** - Return error states instead of throwing
4. **Leverage state** - Use setState/getState to share data between steps
5. **Test steps independently** - Design steps to be testable in isolation

## Next Steps

- Explore [Workflow Patterns](/docs/guides/workflow-patterns) for advanced use cases
- Read the [SDK Reference](/docs/sdk-reference/workflows) for complete API details
- Check out [Terminal Agent Examples](https://github.com/your-repo/grid/tree/main/apps/terminal-agent/src/commands/workflow-examples.ts) for working code