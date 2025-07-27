---
sidebar_position: 3
---

# agentFlowService

A service for running autonomous agent loops with configurable iteration limits and progress tracking.

## Overview

`agentFlowService` enables agents to run autonomously, making multiple LLM calls to complete complex tasks. It manages the flow of execution, handles iteration limits, tracks progress, and provides hooks for monitoring the agent's thinking process.

## Import

```typescript
import { agentFlowService } from "@mrck-labs/grid-core";
```

## Methods

### runAutonomousFlow

```typescript
runAutonomousFlow(params: {
  agent: Agent;
  initialInput: string;
  context?: AgentFlowContext;
  maxIterations?: number;
  onProgress?: (message: ProgressMessage) => void;
}): Promise<AgentResponse>
```

Run an autonomous agent flow that can make multiple iterations to complete a task.

**Parameters**:
- `agent`: The agent instance to run autonomously
- `initialInput`: The initial user request or task
- `context` (optional): Additional context for the flow
  - `sessionId`: Session identifier
  - `userId`: User identifier
  - `metadata`: Additional metadata
- `maxIterations` (optional): Maximum number of iterations (default: 5)
- `onProgress` (optional): Callback for progress updates

**Returns**: Final `AgentResponse` after all iterations complete

**Progress Message Types**:
- `"thinking"` - Agent is processing
- `"acting"` - Agent is taking an action
- `"observing"` - Agent is analyzing results
- `"complete"` - Flow has completed
- `"error"` - An error occurred
- `"limit_reached"` - Max iterations reached

## Examples

### Basic Autonomous Flow

```typescript
import { agentFlowService, createConfigurableAgent } from "@mrck-labs/grid-core";

const agent = createConfigurableAgent({
  // ... agent configuration
});

// Run autonomous flow
const result = await agentFlowService.runAutonomousFlow({
  agent,
  initialInput: "Research the latest AI developments and create a summary report",
  maxIterations: 10
});

console.log(result.content);
// The agent will autonomously:
// 1. Search for information
// 2. Analyze findings
// 3. Create a summary
// 4. Return the final report
```

### With Progress Tracking

```typescript
const result = await agentFlowService.runAutonomousFlow({
  agent,
  initialInput: "Analyze our sales data and identify top 3 trends",
  maxIterations: 8,
  onProgress: (message) => {
    console.log(`[${message.type}] ${message.message}`);
    
    // Update UI based on progress
    switch (message.type) {
      case "thinking":
        updateUI("Agent is analyzing...");
        break;
      case "acting":
        updateUI("Agent is taking action...");
        break;
      case "observing":
        updateUI("Agent is reviewing results...");
        break;
      case "complete":
        updateUI("Analysis complete!");
        break;
    }
  }
});

// Progress output:
// [thinking] Analyzing the request...
// [acting] Querying sales database...
// [observing] Processing sales data...
// [thinking] Identifying patterns...
// [complete] Analysis completed successfully
```

### With Context

```typescript
const context: AgentFlowContext = {
  sessionId: "session_123",
  userId: "user_456",
  metadata: {
    department: "sales",
    timeRange: "last_quarter",
    region: "north_america"
  }
};

const result = await agentFlowService.runAutonomousFlow({
  agent: salesAnalysisAgent,
  initialInput: "Generate quarterly performance report",
  context,
  maxIterations: 15
});
```

### Complex Multi-Step Task

```typescript
// Agent configured with multiple tools
const researchAgent = createConfigurableAgent({
  config: {
    // ... configuration
    prompts: {
      system: `You are a research assistant. When given a task:
      1. Break it down into steps
      2. Execute each step using available tools
      3. Synthesize findings into a coherent response
      4. Iterate if needed to improve quality`
    },
    tools: {
      custom: [searchTool, analysisTool, writingTool, validationTool]
    }
  }
});

// Run complex autonomous task
const result = await agentFlowService.runAutonomousFlow({
  agent: researchAgent,
  initialInput: `Research renewable energy trends in Europe:
    - Current adoption rates
    - Government policies
    - Future projections
    - Investment opportunities
    Create a comprehensive report with citations`,
  maxIterations: 20,
  onProgress: (message) => {
    // Log to file for debugging
    logger.info(`Flow progress: ${message.type} - ${message.message}`);
    
    // Send real-time updates
    websocket.emit("agent:progress", message);
  }
});
```

### Error Handling

```typescript
try {
  const result = await agentFlowService.runAutonomousFlow({
    agent,
    initialInput: "Complex task requiring many steps",
    maxIterations: 5,
    onProgress: (message) => {
      if (message.type === "error") {
        console.error("Flow error:", message.message);
        // Could implement retry logic here
      }
    }
  });
} catch (error) {
  if (error.message.includes("iteration limit")) {
    console.log("Task too complex - hit iteration limit");
    // Could increase limit and retry
  } else {
    console.error("Flow failed:", error);
  }
}
```

### Monitoring Agent Reasoning

```typescript
const debugFlow = await agentFlowService.runAutonomousFlow({
  agent,
  initialInput: "Debug why the application is running slowly",
  maxIterations: 10,
  onProgress: (message) => {
    // Capture agent's reasoning process
    const reasoning = {
      timestamp: Date.now(),
      type: message.type,
      message: message.message,
      metadata: message.metadata
    };
    
    // Store for analysis
    reasoningSteps.push(reasoning);
    
    // Display current thinking
    if (message.metadata?.currentThought) {
      console.log("Agent thinking:", message.metadata.currentThought);
    }
    
    // Show tool usage
    if (message.metadata?.toolsUsed) {
      console.log("Tools used:", message.metadata.toolsUsed);
    }
  }
});

// Analyze reasoning after completion
console.log(`Agent took ${reasoningSteps.length} steps`);
console.log(`Tools used: ${getUniqueTools(reasoningSteps)}`);
```

### Conditional Flows

```typescript
// Agent that adapts based on intermediate results
const adaptiveAgent = createConfigurableAgent({
  config: {
    prompts: {
      system: `You are an adaptive assistant. 
      Analyze results at each step and adjust your approach.
      If a method isn't working, try a different strategy.`
    }
  }
});

const result = await agentFlowService.runAutonomousFlow({
  agent: adaptiveAgent,
  initialInput: "Find the best solution to optimize our database queries",
  maxIterations: 12,
  context: {
    metadata: {
      allowedStrategies: ["indexing", "query_rewrite", "caching", "sharding"],
      performanceTarget: "sub_100ms"
    }
  },
  onProgress: (message) => {
    // Monitor strategy changes
    if (message.metadata?.strategyChange) {
      console.log(`Agent switching strategy: ${message.metadata.newStrategy}`);
    }
  }
});
```

## Flow Control

The agent flow service manages:

1. **Iteration Counting** - Prevents infinite loops
2. **Progress Tracking** - Real-time status updates
3. **Context Preservation** - Maintains state across iterations
4. **Error Recovery** - Handles failures gracefully
5. **Result Validation** - Ensures quality output

## Best Practices

1. **Set Appropriate Limits** - Balance between completion and resource usage
2. **Monitor Progress** - Use onProgress to track and debug flows
3. **Design Iterative Agents** - Create agents that can work incrementally
4. **Handle Limits Gracefully** - Plan for cases where max iterations is reached
5. **Use Context Wisely** - Pass relevant context to guide the agent

## Iteration Strategies

Agents can use different strategies for autonomous flows:

```typescript
// Single-pass strategy
const quickAgent = createConfigurableAgent({
  config: {
    prompts: {
      system: "Complete tasks in a single comprehensive response"
    }
  }
});

// Iterative refinement strategy  
const refiningAgent = createConfigurableAgent({
  config: {
    prompts: {
      system: `Approach tasks iteratively:
      1. First pass: rough solution
      2. Second pass: refine and improve
      3. Final pass: polish and validate`
    }
  }
});

// Exploratory strategy
const exploratoryAgent = createConfigurableAgent({
  config: {
    prompts: {
      system: `Explore multiple approaches:
      1. Try different methods
      2. Compare results
      3. Choose the best solution`
    }
  }
});
```

## TypeScript Types

```typescript
interface AgentFlowContext {
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ProgressMessage {
  type: "thinking" | "acting" | "observing" | "complete" | "error" | "limit_reached";
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

## Related APIs

- [`createConfigurableAgent`](../factories/configurable-agent) - Create agents for flows
- [`createConversationLoop`](../conversation-primitives/conversation-loop) - For conversational flows
- [`baseLLMService`](./base-llm-service) - Underlying LLM service