---
sidebar_position: 4
---

# createLangfuseService

Creates a Langfuse observability service for tracking LLM interactions and performance metrics.

## Overview

`createLangfuseService` provides integration with Langfuse for comprehensive observability of your LLM applications. It tracks token usage, latency, costs, and provides detailed traces of all LLM interactions.

## Import

```typescript
import { createLangfuseService, langfuseService } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createLangfuseService(config?: {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  release?: string;
  debug?: boolean;
}): LangfuseService
```

## Parameters

### config (optional)
- **Type**: Object
- **Properties**:
  - `publicKey` (optional): Langfuse public key (defaults to env LANGFUSE_PUBLIC_KEY)
  - `secretKey` (optional): Langfuse secret key (defaults to env LANGFUSE_SECRET_KEY)
  - `baseUrl` (optional): Langfuse API URL (defaults to Langfuse cloud)
  - `release` (optional): Release version for tracking
  - `debug` (optional): Enable debug logging

## Singleton Service

Grid also exports a pre-configured singleton instance:

```typescript
import { langfuseService } from "@mrck-labs/grid-core";
```

This singleton is automatically initialized with environment variables.

## Return Type: LangfuseService

### Methods

#### trace
```typescript
trace(params: {
  name: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  release?: string;
  version?: string;
}): LangfuseTrace
```
Create a new trace for tracking an operation.

#### generation
```typescript
generation(params: {
  traceId?: string;
  name: string;
  model?: string;
  modelParameters?: Record<string, any>;
  input?: any;
  output?: any;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, any>;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  statusMessage?: string;
  version?: string;
}): LangfuseGeneration
```
Track an LLM generation (completion).

#### span
```typescript
span(params: {
  traceId?: string;
  name: string;
  startTime?: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
  statusMessage?: string;
  input?: any;
  output?: any;
  version?: string;
}): LangfuseSpan
```
Track a span of execution within a trace.

#### event
```typescript
event(params: {
  traceId?: string;
  name: string;
  startTime?: Date;
  metadata?: Record<string, any>;
  input?: any;
  output?: any;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
}): void
```
Log an event within a trace.

#### score
```typescript
score(params: {
  traceId: string;
  name: string;
  value: number;
  comment?: string;
}): void
```
Add a score to a trace (e.g., quality, relevance).

#### flush
```typescript
flush(): Promise<void>
```
Flush all pending events to Langfuse.

#### shutdown
```typescript
shutdown(): Promise<void>
```
Gracefully shutdown the service.

## Examples

### Basic Usage

```typescript
import { createLangfuseService } from "@mrck-labs/grid-core";

const langfuse = createLangfuseService({
  publicKey: "pk-lf-...",
  secretKey: "sk-lf-...",
  release: "v1.0.0"
});

// Create a trace
const trace = langfuse.trace({
  name: "chat-completion",
  userId: "user_123",
  sessionId: "session_456",
  metadata: {
    feature: "customer-support"
  }
});

// Track generation
const generation = langfuse.generation({
  traceId: trace.id,
  name: "openai-completion",
  model: "gpt-4",
  input: { messages: [{ role: "user", content: "Hello" }] },
  output: { content: "Hi! How can I help?" },
  usage: {
    promptTokens: 10,
    completionTokens: 8,
    totalTokens: 18
  }
});

// Flush to ensure data is sent
await langfuse.flush();
```

### Tracing Complex Workflows

```typescript
const langfuse = createLangfuseService();

// Start trace for entire workflow
const trace = langfuse.trace({
  name: "research-workflow",
  userId: "user_123",
  metadata: {
    workflow: "research-assistant",
    topic: "renewable-energy"
  }
});

// Track search phase
const searchSpan = langfuse.span({
  traceId: trace.id,
  name: "search-phase",
  input: { query: "renewable energy trends" }
});

// Track individual searches
for (const source of ["web", "academic", "news"]) {
  langfuse.event({
    traceId: trace.id,
    name: `search-${source}`,
    metadata: { source, resultCount: 10 }
  });
}

// End search phase
searchSpan.end({ output: { totalResults: 30 } });

// Track analysis phase
const analysisGen = langfuse.generation({
  traceId: trace.id,
  name: "analyze-results",
  model: "gpt-4",
  input: { results: "..." },
  output: { analysis: "..." },
  usage: { totalTokens: 500 }
});

// Score the quality
langfuse.score({
  traceId: trace.id,
  name: "relevance",
  value: 0.85,
  comment: "High relevance to query"
});
```

### Error Tracking

```typescript
const langfuse = createLangfuseService({ debug: true });

try {
  const generation = langfuse.generation({
    name: "risky-operation",
    model: "gpt-4",
    input: { prompt: "..." }
  });
  
  // Risky operation
  const result = await riskyLLMCall();
  
  generation.end({
    output: result,
    level: "DEFAULT"
  });
} catch (error) {
  generation.end({
    output: null,
    level: "ERROR",
    statusMessage: error.message
  });
  
  // Log error event
  langfuse.event({
    name: "llm-error",
    level: "ERROR",
    metadata: {
      error: error.message,
      stack: error.stack
    }
  });
}
```

### Session Tracking

```typescript
// Track entire user session
const sessionTrace = langfuse.trace({
  name: "user-session",
  sessionId: "session_789",
  userId: "user_123",
  tags: ["production", "chat-ui"]
});

// Track each conversation turn
for (const turn of conversation) {
  const turnGen = langfuse.generation({
    traceId: sessionTrace.id,
    name: `turn-${turn.number}`,
    model: "gpt-4",
    input: turn.userMessage,
    output: turn.assistantMessage,
    usage: turn.usage,
    metadata: {
      turnNumber: turn.number,
      toolsUsed: turn.tools
    }
  });
}

// Score session quality
langfuse.score({
  traceId: sessionTrace.id,
  name: "session-quality",
  value: 0.9,
  comment: "Successful resolution"
});
```

### Cost Tracking

```typescript
const langfuse = createLangfuseService();

// Track generation with cost calculation
const generation = langfuse.generation({
  name: "expensive-operation",
  model: "gpt-4",
  modelParameters: {
    temperature: 0.7,
    maxTokens: 2000
  },
  usage: {
    promptTokens: 1500,
    completionTokens: 500,
    totalTokens: 2000
  },
  metadata: {
    // Langfuse automatically calculates costs based on model and usage
    estimatedCost: 0.06 // $0.03 per 1K prompt + $0.06 per 1K completion
  }
});
```

### Integration with Grid

```typescript
import { baseLLMService, createLangfuseService } from "@mrck-labs/grid-core";

// Langfuse is automatically integrated when enabled in baseLLMService
const llmService = baseLLMService({
  langfuse: {
    enabled: true,
    config: {
      release: "v2.0.0",
      debug: process.env.NODE_ENV === "development"
    }
  }
});

// All LLM calls are now automatically traced
const response = await llmService.runLLM({
  messages: [{ role: "user", content: "Hello" }]
});
// Langfuse tracks: tokens, latency, model, parameters, etc.
```

### Custom Scoring

```typescript
// Define custom scoring functions
async function scoreRelevance(trace: any, output: string): Promise<number> {
  // Custom logic to determine relevance
  return 0.85;
}

async function scoreAccuracy(trace: any, output: string): Promise<number> {
  // Custom logic to determine accuracy
  return 0.92;
}

// Apply scores
const trace = langfuse.trace({ name: "qa-task" });

// After generation completes
const relevanceScore = await scoreRelevance(trace, output);
const accuracyScore = await scoreAccuracy(trace, output);

langfuse.score({
  traceId: trace.id,
  name: "relevance",
  value: relevanceScore
});

langfuse.score({
  traceId: trace.id,
  name: "accuracy", 
  value: accuracyScore
});
```

## Environment Variables

- `LANGFUSE_PUBLIC_KEY` - Your Langfuse public key
- `LANGFUSE_SECRET_KEY` - Your Langfuse secret key
- `LANGFUSE_HOST` - Langfuse API URL (optional, for self-hosted)

## Best Practices

1. **Always flush in production** - Call `flush()` before process exit
2. **Use meaningful trace names** - Makes filtering and analysis easier
3. **Add metadata liberally** - More context helps with debugging
4. **Score important metrics** - Track quality, relevance, accuracy
5. **Group related operations** - Use traces to group related spans
6. **Handle errors gracefully** - Log errors with appropriate levels

## Debugging

Enable debug mode to see detailed logs:

```typescript
const langfuse = createLangfuseService({ debug: true });
```

Or set environment variable:
```bash
LANGFUSE_DEBUG=true
```

## TypeScript Types

```typescript
interface LangfuseService {
  trace(params: TraceParams): LangfuseTrace;
  generation(params: GenerationParams): LangfuseGeneration;
  span(params: SpanParams): LangfuseSpan;
  event(params: EventParams): void;
  score(params: ScoreParams): void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

interface TraceParams {
  name: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  release?: string;
  version?: string;
}

interface GenerationParams {
  traceId?: string;
  name: string;
  model?: string;
  modelParameters?: Record<string, any>;
  input?: any;
  output?: any;
  usage?: UsageParams;
  metadata?: Record<string, any>;
  level?: LogLevel;
  statusMessage?: string;
  version?: string;
}

interface UsageParams {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

type LogLevel = "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
```

## Related APIs

- [`baseLLMService`](./base-llm-service) - Integrates Langfuse automatically
- [`createConfigurableAgent`](../factories/configurable-agent) - Agents traced via LLM service