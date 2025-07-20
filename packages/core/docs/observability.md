# Observability in Grid

Grid provides comprehensive observability features to help you monitor, debug, and optimize your LLM-powered applications. This guide covers how to integrate observability into your Grid applications.

## Overview

Grid's observability system is built on these core concepts:

- **Traces**: Track the entire lifecycle of a conversation or agent execution
- **Spans**: Monitor individual operations within a trace (LLM calls, tool executions)
- **Events**: Record significant occurrences during execution
- **Generations**: Track LLM-specific metrics (tokens, cost, latency)
- **Sessions**: Group related traces together

## Quick Start

### 1. Basic Setup with Langfuse

```typescript
import {
  createTracedServices,
  createLangfuseProvider,
} from "@mrck-labs/grid-core";

// Create a Langfuse provider
const langfuseProvider = createLangfuseProvider({
  // API keys from environment variables:
  // LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY
  debug: true,
});

// Create traced services
const services = createTracedServices({
  observability: {
    enabled: true,
    provider: langfuseProvider,
    sampling: 1.0, // Trace 100% of requests
  },
  llm: {
    defaultModel: "gpt-4",
  },
});
```

### 2. Using Traced Services

```typescript
// Start a conversation with session tracking
const trace = await services.startConversation(
  "session-123", // Session ID
  "user-456"     // User ID
);

try {
  // Use services normally - they're automatically traced
  const result = await services.conversationFlow.sendMessage(
    "What's the weather like?"
  );
  
  console.log(result.response.content);
} finally {
  // End the trace
  await services.endConversation(trace);
  
  // Flush pending data
  await services.flush();
}
```

## Architecture

### Atomic Primitives

#### ObservabilityService
The core service that manages tracing, spans, and events:

```typescript
const observability = createObservabilityService({
  enabled: true,
  provider: langfuseProvider,
  sampling: 0.1, // Sample 10% of requests
  filters: {
    excludeTools: ["internal_tool"],
    excludeEvents: ["debug_event"],
    sensitiveFields: ["apiKey", "password"],
  },
  attributes: {
    service: "my-app",
    environment: "production",
  },
});
```

#### ObservabilityProvider
The interface that observability backends must implement:

```typescript
interface ObservabilityProvider {
  startTrace(name: string, context?: TraceContext): Promise<TraceContext>;
  endTrace(context: TraceContext): Promise<void>;
  startSpan(name: string, parent?: SpanContext): Promise<SpanContext>;
  endSpan(context: SpanContext, result?: any): Promise<void>;
  recordEvent(event: TraceEvent): Promise<void>;
  recordGeneration(generation: GenerationTrace): Promise<void>;
  recordToolExecution(tool: ToolTrace): Promise<void>;
  setSession(session: SessionInfo): void;
  flush(): Promise<void>;
}
```

### Service Integration

#### LLM Service Tracing
The BaseLLMService automatically tracks:
- Model used
- Prompt and completion
- Token usage (prompt, completion, total)
- Duration
- Parameters (temperature, max tokens, etc.)

```typescript
const llmService = baseLLMService({
  defaultModel: "gpt-4",
  observability: observabilityService,
});
```

#### Tool Executor Tracing
The ToolExecutor tracks:
- Tool name and parameters
- Execution result or error
- Duration
- Metadata (tool call ID, agent ID)

```typescript
const toolExecutor = createToolExecutor({
  observability: observabilityService,
});
```

### Decorator Pattern

You can add observability to any service using the decorator:

```typescript
import { createTracedService } from "@mrck-labs/grid-core";

const myService = {
  async processData(data: string) {
    // Service logic
    return data.toUpperCase();
  }
};

const tracedService = createTracedService(
  myService,
  observabilityService,
  {
    serviceName: "DataProcessor",
    methodsToTrace: ["processData"],
    defaultSpanAttributes: {
      component: "custom",
    },
  }
);
```

## Configuration

### Sampling

Control the percentage of requests that are traced:

```typescript
{
  sampling: 0.1, // Trace 10% of requests
}
```

### Filtering

Exclude specific tools, events, or redact sensitive fields:

```typescript
{
  filters: {
    excludeTools: ["debug_tool"],
    excludeEvents: ["heartbeat"],
    sensitiveFields: ["apiKey", "ssn", "creditCard"],
  }
}
```

### Global Attributes

Add attributes to all traces and spans:

```typescript
{
  attributes: {
    service: "my-app",
    version: "1.2.3",
    environment: "production",
    region: "us-east-1",
  }
}
```

## Advanced Usage

### Custom Spans

Use `withSpan` for fine-grained tracking:

```typescript
const result = await observability.withSpan(
  "custom_operation",
  async () => {
    // Your operation
    return computeExpensiveResult();
  },
  {
    input: "data",
    algorithm: "v2",
  }
);
```

### Manual Event Recording

Record custom events:

```typescript
await observability.recordEvent("user_action", {
  action: "clicked_button",
  button: "submit",
  timestamp: Date.now(),
});
```

### Context Propagation

The observability service uses AsyncLocalStorage for automatic context propagation:

```typescript
// Parent span context is automatically available
await observability.withSpan("parent", async () => {
  // This span will be nested under "parent"
  await observability.withSpan("child", async () => {
    // Nested operation
  });
});
```

## Langfuse Integration

The Langfuse provider integrates with [Langfuse](https://langfuse.com) for LLM observability:

### Features
- Automatic trace visualization
- Token usage tracking
- Cost calculation
- Latency monitoring
- Error tracking
- Session grouping

### Configuration

Set environment variables:
```bash
LANGFUSE_SECRET_KEY=your_secret_key
LANGFUSE_PUBLIC_KEY=your_public_key
LANGFUSE_BASEURL=https://cloud.langfuse.com # Optional
```

Or configure programmatically:
```typescript
const provider = createLangfuseProvider({
  secretKey: "your_secret_key",
  publicKey: "your_public_key",
  baseUrl: "https://cloud.langfuse.com",
  debug: true,
  flushInterval: 10000, // Flush every 10 seconds
});
```

## Best Practices

1. **Use Sessions**: Group related traces together for better analysis
   ```typescript
   observability.setSession({
     sessionId: "user-session-123",
     userId: "user-456",
     metadata: { plan: "premium" },
   });
   ```

2. **Add Meaningful Attributes**: Include context that helps debugging
   ```typescript
   await observability.withSpan("process_order", async () => {
     // Processing logic
   }, {
     orderId: "order-789",
     itemCount: 5,
     totalAmount: 99.99,
   });
   ```

3. **Handle Errors**: Errors are automatically tracked, but add context
   ```typescript
   try {
     await riskyOperation();
   } catch (error) {
     await observability.recordEvent("operation_failed", {
       error: error.message,
       stack: error.stack,
       context: { userId, operation: "risky" },
     });
     throw error;
   }
   ```

4. **Flush on Shutdown**: Ensure data is sent before exit
   ```typescript
   process.on("SIGTERM", async () => {
     await observability.flush();
     process.exit(0);
   });
   ```

## Performance Considerations

1. **Sampling**: Use sampling in production to reduce overhead
2. **Async Operations**: All observability operations are async and non-blocking
3. **Batching**: The Langfuse provider batches data for efficient transmission
4. **Filtering**: Exclude high-frequency, low-value events

## Troubleshooting

### Debug Mode

Enable debug logging to troubleshoot:

```typescript
{
  debug: true, // Logs all observability operations
}
```

### Common Issues

1. **Missing Traces**: Check if observability is enabled and provider is configured
2. **No Data in Langfuse**: Verify API keys and ensure `flush()` is called
3. **Performance Impact**: Reduce sampling rate or exclude frequent events
4. **Context Loss**: Ensure async operations maintain context properly

## Future Enhancements

- Additional providers (OpenTelemetry, Datadog, New Relic)
- Metrics collection (counters, histograms)
- Distributed tracing across services
- Custom dashboards and alerting