---
sidebar_position: 1
---

# Agent Types

Type definitions for agents and agent-related functionality.

## Overview

This page documents the TypeScript types used throughout Grid for agents, responses, and related structures.

## Core Types

### Agent

```typescript
interface Agent {
  id: string;
  type: string;
  availableTools: string[];
  act: (input: string | AgentActInput) => Promise<AgentResponse>;
  getMetadata: () => AgentMetadata;
}
```

The main agent interface that all agents implement.

### AgentActInput

```typescript
interface AgentActInput {
  messages: ChatMessage[];
  context?: Record<string, any>;
  tools?: Tool[];
  toolChoice?: ToolChoice;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}
```

Input structure for agent.act() method.

### AgentResponse

```typescript
interface AgentResponse {
  role: "assistant";
  content: string | null;
  toolCalls?: ToolCall[];
  metadata?: Record<string, any>;
}
```

Response structure from agent execution.

### AgentConfig

```typescript
interface AgentConfig {
  id: string;
  type: string;
  version: string;
  prompts: {
    system: string;
  };
  metadata: AgentMetadata;
  tools?: {
    builtin?: Tool[];
    custom?: Tool[];
    mcp?: Tool[];
  };
  behavior?: {
    maxRetries?: number;
    responseFormat?: "text" | "json_object";
    temperature?: number;
    maxTokens?: number;
  };
  orchestration?: {
    mode?: "autonomous" | "guided" | "hybrid";
    maxIterations?: number;
  };
  customConfig?: Record<string, any>;
}
```

Complete configuration for createConfigurableAgent.

### AgentMetadata

```typescript
interface AgentMetadata {
  id: string;
  type: string;
  name: string;
  description: string;
  capabilities: string[];
  version: string;
  [key: string]: any;
}
```

Metadata describing an agent's capabilities.

## Flow Types

### AgentFlowContext

```typescript
interface AgentFlowContext {
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}
```

Context for autonomous agent flows.

### ProgressMessage

```typescript
interface ProgressMessage {
  type: ProgressMessageType;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}
```

Progress updates during agent execution.

### ProgressMessageType

```typescript
type ProgressMessageType = 
  | "thinking"
  | "acting" 
  | "observing"
  | "tool_execution"
  | "tool_result"
  | "complete"
  | "error"
  | "info"
  | "limit_reached";
```

Types of progress messages.

## Usage Examples

### Creating Typed Agents

```typescript
const myAgent: Agent = {
  id: "custom-agent",
  type: "research",
  availableTools: ["search", "analyze"],
  
  async act(input: AgentActInput): Promise<AgentResponse> {
    // Implementation
    return {
      role: "assistant",
      content: "Research completed",
      metadata: { sources: 5 }
    };
  },
  
  getMetadata(): AgentMetadata {
    return {
      id: "custom-agent",
      type: "research",
      name: "Research Agent",
      description: "Performs research tasks",
      capabilities: ["search", "analysis"],
      version: "1.0.0"
    };
  }
};
```

### Type-Safe Configuration

```typescript
const config: AgentConfig = {
  id: "my-agent",
  type: "general",
  version: "1.0.0",
  prompts: {
    system: "You are a helpful assistant"
  },
  metadata: {
    id: "my-agent",
    type: "general",
    name: "My Agent",
    description: "General purpose agent",
    capabilities: ["conversation"],
    version: "1.0.0"
  },
  behavior: {
    maxRetries: 3,
    responseFormat: "text",
    temperature: 0.7
  }
};
```

### Type Guards

```typescript
function isAgentResponse(value: any): value is AgentResponse {
  return (
    value &&
    typeof value === "object" &&
    value.role === "assistant" &&
    (value.content === null || typeof value.content === "string")
  );
}

function hasToolCalls(response: AgentResponse): response is AgentResponse & { toolCalls: ToolCall[] } {
  return response.toolCalls !== undefined && response.toolCalls.length > 0;
}
```

## Related Types

- [`LLM Types`](./llm-types) - Message and LLM-related types
- [`Tool Types`](./tool-types) - Tool and tool execution types