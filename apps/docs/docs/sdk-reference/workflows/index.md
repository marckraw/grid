---
sidebar_position: 1
---

# Workflows

The workflows package provides deterministic flow patterns for orchestrating LLM operations with Grid's conversation primitives.

## Overview

`@mrck-labs/grid-workflows` enables you to build structured, multi-step workflows that combine:
- Deterministic function steps
- LLM-powered decision making
- Conditional branching
- State management across steps
- Full access to conversation primitives

## Installation

```bash
npm install @mrck-labs/grid-workflows
# or
pnpm add @mrck-labs/grid-workflows
```

## Core Concepts

### Workflows
A workflow is a series of connected steps that execute in sequence, with each step potentially determining the next step based on its output.

### Steps
Steps are the individual units of work in a workflow. They can be:
- **Function steps**: Deterministic operations
- **LLM steps**: AI-powered processing
- **Conditional steps**: Route to different paths based on results

### Context Injection
Every step receives a context object with access to all conversation primitives:
- `manager`: ConversationManager instance
- `context`: ConversationContext for state
- `history`: ConversationHistory for messages
- Plus convenience methods

## Quick Example

```typescript
import { createWorkflow } from '@mrck-labs/grid-workflows';
import { createConfigurableAgent } from '@mrck-labs/grid-core';

// Create a customer support workflow
const workflow = createWorkflow({
  managerOptions: {
    historyOptions: {
      systemPrompt: "You are a support assistant"
    }
  }
});

// Define workflow steps
workflow
  .step('categorize')
    .llm(categorizationAgent)
    .then(category => {
      if (category === 'urgent') return 'escalate';
      if (category === 'billing') return 'billing-team';
      return 'general-support';
    })
  
  .step('escalate')
    .function(async (issue, { setState, addMessage }) => {
      await addMessage("Escalating to senior support...");
      await setState('priority', 'high');
      await setState('escalated', true);
      return { escalated: true, team: 'senior' };
    })
  
  .step('billing-team')
    .function(async (issue, { setState }) => {
      await setState('department', 'billing');
      return { routed: true, team: 'billing' };
    });

// Execute the workflow
const result = await workflow.run('categorize', "I can't access my account!");
console.log(result.finalResult); // { routed: true, team: 'billing' }
console.log(result.executedSteps); // ['categorize', 'billing-team']
```

## API Reference

See the detailed API documentation:
- [createWorkflow](./create-workflow) - Main workflow factory
- [Workflow Types](./types) - TypeScript interfaces
- [Step Builders](./step-builders) - Building workflow steps