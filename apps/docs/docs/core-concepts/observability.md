---
sidebar_position: 5
---

# Observability

Grid provides comprehensive observability through Langfuse integration, enabling you to monitor, debug, and optimize your AI applications in production.

## Overview

Observability in Grid covers:
- **Tracing**: Track the complete execution flow
- **Metrics**: Monitor performance and usage
- **Cost Tracking**: Understand token usage and costs
- **Debugging**: Identify and fix issues quickly
- **Analytics**: Gain insights into agent behavior

## Setting Up Langfuse

### Installation

First, create a Langfuse account at [cloud.langfuse.com](https://cloud.langfuse.com) and get your API keys.

### Configuration

Grid's Langfuse integration supports multiple configuration methods:

#### Environment Variables

```bash
# .env file
LANGFUSE_ENABLED=true                    # Enable/disable tracing (default: false)
LANGFUSE_PUBLIC_KEY=pk-lf-...           # Required: Your public key
LANGFUSE_SECRET_KEY=sk-lf-...           # Required: Your secret key
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # Langfuse server URL

# Optional performance tuning
LANGFUSE_FLUSH_AT=10                    # Batch size for flushing (default: 1)
LANGFUSE_FLUSH_INTERVAL=5000            # Flush interval in ms (default: 1000)
```

#### Programmatic Configuration

```typescript
import { createLangfuseService, baseLLMService } from "@mrck-labs/grid-core";

// Create Langfuse service with custom configuration
const langfuseService = createLangfuseService({
  env: {
    LANGFUSE_ENABLED: true,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_BASE_URL: "https://cloud.langfuse.com",
    LANGFUSE_FLUSH_AT: 10,
    LANGFUSE_FLUSH_INTERVAL: 5000,
  },
  logs: {
    onInfo: (message) => console.log(`[Langfuse] ${message}`),
    onError: (message) => console.error(`[Langfuse Error] ${message}`),
    onDebug: (message) => console.debug(`[Langfuse Debug] ${message}`),
    onWarn: (message) => console.warn(`[Langfuse Warning] ${message}`),
  },
});

// Use with LLM service
const llmService = baseLLMService({
  langfuse: langfuseService,
  toolExecutionMode: "custom",
});
```

### Simple Agent Integration

For basic usage, Grid agents can enable Langfuse with minimal configuration:

```typescript
import { createConfigurableAgent, baseLLMService } from "@mrck-labs/grid-core";

const agent = createConfigurableAgent({
  llmService: baseLLMService({
    langfuse: { enabled: true },  // Uses environment variables
    toolExecutionMode: "custom",
  }),
  config: {
    id: "my-agent",
    type: "general",
    // ... rest of config
  },
});
```

## Tracing

### Session-Based Tracing

Grid's new Langfuse integration provides powerful session-based tracing that maintains context across multiple agent executions:

```typescript
import { langfuseService } from "@mrck-labs/grid-core";

// Start a new session
const sessionToken = "user-session-123";
const conversationId = "conv-456";

// Create an execution trace for this session
const trace = langfuseService.createExecutionTrace(
  sessionToken,
  "general",  // agent type
  { query: "What's the weather?" },  // input
  conversationId,
  { userId: "user-789", feature: "weather-bot" }  // metadata
);

// Traces are automatically numbered: agent-general-execution-1, agent-general-execution-2, etc.

// Create spans within the session
const span = langfuseService.createSpanForSession(
  sessionToken,
  "tool_execution",
  { toolName: "get_weather", location: "Paris" }
);

// End the span
span.end({ output: "72°F and sunny" });

// End the execution trace
langfuseService.endExecutionTrace(
  sessionToken,
  { response: "The weather in Paris is 72°F and sunny" }
);

// Get session statistics
const stats = langfuseService.getSessionStats(sessionToken);
console.log(`Session ${sessionToken}: ${stats.executionCount} executions`);
```

### Automatic Sequential Naming

Traces within a session are automatically numbered for easy tracking:

```typescript
// First execution: "agent-general-execution-1"
langfuseService.createExecutionTrace(sessionToken, "general", input1);

// Second execution: "agent-general-execution-2"
langfuseService.createExecutionTrace(sessionToken, "general", input2);

// Third execution: "agent-general-execution-3"
langfuseService.createExecutionTrace(sessionToken, "general", input3);
```

### Trace Hierarchy

Grid creates a hierarchical trace structure with session awareness:

```
Session: user-session-123
├── Trace: agent-general-execution-1
│   ├── Span: conversation_turn
│   │   ├── Generation: LLM Call
│   │   └── Span: tool_execution
│   └── Span: response_formatting
├── Trace: agent-general-execution-2
│   ├── Span: conversation_turn
│   │   └── Generation: LLM Call
│   └── Span: response_formatting
└── Session Stats: { executionCount: 2, startTime: ..., lastActivity: ... }
```

### Generation Tracking

Track LLM generations within sessions:

```typescript
// Create a generation linked to the current session
const generation = langfuseService.createGenerationForSession(
  sessionToken,
  {
    name: "weather_query",
    model: "gpt-4",
    modelParameters: { temperature: 0.7 },
    input: messages,
    output: response.content,
    usage: {
      promptTokens: 150,
      completionTokens: 50,
      totalTokens: 200,
    },
    metadata: {
      hasTools: true,
      toolCalls: 1,
    },
  }
);
```

## Metrics and Analytics

### Cost Tracking

Grid's Langfuse integration includes built-in cost calculation for various models:

```typescript
import { langfuseService } from "@mrck-labs/grid-core";

// Cost is automatically calculated for supported models
const generation = langfuseService.createGenerationForSession(
  sessionToken,
  {
    name: "chat_completion",
    model: "gpt-4o",  // Supported: gpt-4o, gpt-4-turbo, claude-3.5-sonnet, etc.
    usage: {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    },
  }
);

// Get cost information
const trace = langfuseService.getCurrentTrace(sessionToken);
console.log(`Estimated cost: $${trace.cost || 0}`);

// Supported models with pricing:
// - GPT-4o: $5/$15 per 1M tokens (input/output)
// - GPT-4-turbo: $10/$30 per 1M tokens
// - Claude-3.5-sonnet: $3/$15 per 1M tokens
// - Claude-3-opus: $15/$75 per 1M tokens
// - GPT-3.5-turbo: $0.5/$1.5 per 1M tokens
```

### Session Statistics

Track comprehensive metrics across sessions:

```typescript
// Get session statistics
const stats = langfuseService.getSessionStats(sessionToken);

console.log("Session Metrics:", {
  executionCount: stats.executionCount,
  startTime: stats.startTime,
  lastActivity: stats.lastActivity,
  duration: Date.now() - stats.startTime.getTime(),
});

// Clean up expired sessions
langfuseService.cleanupExpiredSessions(3600000); // Clean sessions older than 1 hour

// Get all active sessions
const activeSessions = langfuseService.getAllSessions();
console.log(`Active sessions: ${activeSessions.size}`);
```

### Performance Monitoring

Monitor latency and performance:

```typescript
interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  toolExecutionTime: number;
  llmLatency: number;
}

// Grid automatically tracks these metrics
agent.on("performance", (metrics: PerformanceMetrics) => {
  if (metrics.p95ResponseTime > 5000) {
    console.warn("High latency detected!");
  }
});
```

### Success Rates

Track success and error rates:

```typescript
const observability = {
  onSuccess: (trace) => {
    metrics.increment("agent.success");
  },
  onError: (error, trace) => {
    metrics.increment("agent.error", { 
      tags: { error_type: error.name } 
    });
  },
};
```

## Debugging

### Error Tracking

Detailed error information in traces:

```typescript
const agent = createConfigurableAgent({
  customHandlers: {
    onError: async (error, attempt) => {
      // Error is automatically traced with:
      // - Full stack trace
      // - Input that caused the error
      // - Retry attempt number
      // - System state at error time
      
      console.error(`Error in attempt ${attempt}: ${error.message}`);
      
      // Add custom error context
      const langfuse = getLangfuseInstance();
      langfuse.score({
        name: "error_severity",
        value: error.critical ? 1 : 0.5,
        comment: error.message,
      });
    },
  },
});
```

### Debug Mode

Enable verbose debugging:

```typescript
const agent = createConfigurableAgent({
  observabilityConfig: {
    debug: true,  // Verbose logging
    logLevel: "DEBUG",  // LOG levels: ERROR, WARN, INFO, DEBUG
    captureStdout: true,  // Capture console output
  },
});
```

### Request Replay

Replay failed requests for debugging:

```typescript
// In Langfuse UI, you can:
// 1. Find the failed trace
// 2. Copy the exact input
// 3. Replay locally with:

const debugAgent = createConfigurableAgent({
  ...originalConfig,
  observabilityConfig: {
    traceId: "original-trace-id",  // Link to original
    metadata: { replay: true },
  },
});

await debugAgent.act(copiedInput);
```

## Practical Examples

### Complete Conversation Flow with Observability

Here's a real-world example from the terminal agent:

```typescript
import { 
  createConfigurableAgent, 
  createConversationLoop,
  baseLLMService,
  langfuseService 
} from "@mrck-labs/grid-core";

// Initialize Langfuse service
const langfuse = createLangfuseService({
  env: {
    LANGFUSE_ENABLED: true,
    // ... API keys from environment
  },
});

// Create agent with Langfuse
const agent = createConfigurableAgent({
  llmService: baseLLMService({
    langfuse: { enabled: true },
    toolExecutionMode: "custom",
  }),
  config: {
    id: "conversation-agent",
    type: "general",
    // ... rest of config
  },
});

// Create conversation with session tracking
const sessionToken = `session-${Date.now()}`;
const conversationId = `conv-${Date.now()}`;

// Start execution trace
langfuse.createExecutionTrace(
  sessionToken,
  "general",
  { initialMessage: "Starting conversation" },
  conversationId,
  { userId: "user-123", feature: "chat" }
);

// Create conversation loop
const conversation = createConversationLoop({
  agent,
  onProgress: (update) => {
    // Create spans for progress updates
    const span = langfuse.createSpanForSession(
      sessionToken,
      update.type,
      { message: update.content }
    );
    span.end();
  },
});

// Process messages
const response = await conversation.sendMessage("What's the weather?");

// End execution trace
langfuse.endExecutionTrace(
  sessionToken,
  { finalResponse: response.content }
);

// View session statistics
const stats = langfuse.getSessionStats(sessionToken);
console.log(`Session completed: ${stats.executionCount} executions`);
```

### Error Tracking and Recovery

```typescript
try {
  const response = await agent.act(input);
} catch (error) {
  // Errors are automatically tracked in Langfuse
  const errorTrace = langfuse.createExecutionTrace(
    sessionToken,
    "error",
    { input, error: error.message },
    conversationId,
    { errorType: error.name }
  );
  
  // Add error details
  const errorSpan = langfuse.createSpanForSession(
    sessionToken,
    "error_details",
    {
      stack: error.stack,
      retryable: error.retryable || false,
    }
  );
  errorSpan.end({ level: "ERROR" });
  
  // End trace with error
  langfuse.endExecutionTrace(
    sessionToken,
    null,
    error
  );
}
```

### Multi-Agent Collaboration Tracking

```typescript
// Track multiple agents in the same session
const mainSessionToken = "collab-session-123";

// Agent 1 execution
langfuse.createExecutionTrace(
  mainSessionToken,
  "researcher",
  { task: "Find information" },
  conversationId,
  { agentRole: "researcher" }
);

// Agent 2 execution
langfuse.createExecutionTrace(
  mainSessionToken,
  "writer",
  { task: "Summarize findings" },
  conversationId,
  { agentRole: "writer" }
);

// View complete collaboration flow in Langfuse dashboard
```

## Best Practices

### 1. Session Management

Always use session tokens to group related executions:

```typescript
// ✅ Good - Consistent session tracking
const sessionToken = `user-${userId}-${Date.now()}`;
langfuse.createExecutionTrace(sessionToken, "general", input);

// ❌ Bad - No session grouping
langfuse.trace({ name: "random-trace" });
```

### 2. Configure Environment Variables

Always configure Langfuse via environment variables for security:

```bash
# .env file
LANGFUSE_ENABLED=true
LANGFUSE_SECRET_KEY=sk-lf-...  # Never commit these!
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_FLUSH_AT=10           # Batch for performance
LANGFUSE_FLUSH_INTERVAL=5000   # 5 second intervals
```

### 3. Clean Up Sessions

Prevent memory leaks by cleaning up expired sessions:

```typescript
// Set up periodic cleanup
setInterval(() => {
  langfuseService.cleanupExpiredSessions(3600000); // 1 hour
}, 300000); // Run every 5 minutes

// Or clean up on session end
function endUserSession(sessionToken: string) {
  langfuseService.endExecutionTrace(sessionToken, { status: "completed" });
  // Remove from active sessions after a delay
  setTimeout(() => {
    langfuseService.cleanupSession(sessionToken);
  }, 60000); // 1 minute delay for final writes
}
```

### 4. Use Meaningful Metadata

Add context that helps with debugging and analysis:

```typescript
langfuse.createExecutionTrace(
  sessionToken,
  agentType,
  input,
  conversationId,
  {
    userId: user.id,
    userPlan: user.subscription,
    feature: "chat-support",
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
    // Add business-specific context
    department: "customer-service",
    priority: ticket.priority,
  }
);
```

### 5. Monitor Costs

Use the built-in cost tracking to stay within budget:

```typescript
// Track costs per session
const trace = langfuse.getCurrentTrace(sessionToken);
if (trace?.cost && trace.cost > 1.0) {
  console.warn(`High cost session: $${trace.cost}`);
  // Consider switching to a cheaper model
}

// Daily cost monitoring
async function getDailyCosts() {
  const sessions = langfuse.getAllSessions();
  let totalCost = 0;
  
  sessions.forEach((session, token) => {
    const trace = langfuse.getCurrentTrace(token);
    totalCost += trace?.cost || 0;
  });
  
  return totalCost;
}
```

### 6. Performance Optimization

Configure flush settings based on your volume:

```typescript
// High-volume production settings
const langfuse = createLangfuseService({
  env: {
    LANGFUSE_FLUSH_AT: 50,      // Larger batches
    LANGFUSE_FLUSH_INTERVAL: 10000, // 10 second intervals
  },
});

// Low-volume or debugging
const langfuse = createLangfuseService({
  env: {
    LANGFUSE_FLUSH_AT: 1,       // Immediate sending
    LANGFUSE_FLUSH_INTERVAL: 1000,  // 1 second intervals
  },
});
```

### 7. Error Handling

Always handle Langfuse errors gracefully:

```typescript
try {
  langfuse.createExecutionTrace(sessionToken, agentType, input);
} catch (error) {
  // Log but don't crash the application
  console.error("Langfuse error:", error);
  // Continue without observability rather than failing the request
}
```

### 8. Privacy and Security

Never log sensitive information:

```typescript
// Sanitize inputs before logging
function sanitizeInput(input: any) {
  const sanitized = { ...input };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.creditCard;
  delete sanitized.ssn;
  
  // Mask email addresses
  if (sanitized.email) {
    sanitized.email = sanitized.email.replace(/(.{2}).*(@.*)/, "$1***$2");
  }
  
  return sanitized;
}

langfuse.createExecutionTrace(
  sessionToken,
  agentType,
  sanitizeInput(input),
  conversationId
);
```

## Advanced Observability

### Custom Scoring

Add custom quality scores:

```typescript
agent.on("response", async (response, input) => {
  const langfuse = getLangfuseInstance();
  
  // Score response quality
  const qualityScore = await evaluateQuality(response);
  langfuse.score({
    name: "response_quality",
    value: qualityScore,
    traceId: langfuse.getTraceId(),
  });
  
  // Score relevance
  const relevanceScore = await evaluateRelevance(input, response);
  langfuse.score({
    name: "relevance",
    value: relevanceScore,
  });
});
```

### A/B Testing

Track experiments:

```typescript
const agent = createConfigurableAgent({
  observabilityConfig: {
    metadata: {
      experiment: "prompt_variant_b",
      variant: Math.random() > 0.5 ? "control" : "treatment",
    },
  },
});

// Analyze results in Langfuse by filtering on metadata
```

### Performance Profiling

Detailed performance analysis:

```typescript
class ProfiledAgent {
  async act(input: string) {
    const profile = new PerformanceProfile();
    
    profile.mark("input_processing_start");
    const processed = await this.processInput(input);
    profile.mark("input_processing_end");
    
    profile.mark("llm_call_start");
    const response = await this.llm.generate(processed);
    profile.mark("llm_call_end");
    
    // Send profile to Langfuse
    langfuse.event({
      name: "performance_profile",
      metadata: profile.getMetrics(),
    });
    
    return response;
  }
}
```

## Integration Examples

### With Logging

Combine with traditional logging:

```typescript
import winston from "winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new LangfuseTransport({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
    }),
  ],
});
```

### With Metrics Services

Export to Prometheus/Grafana:

```typescript
import { PrometheusExporter } from "@mrck-labs/grid-observability";

const exporter = new PrometheusExporter({
  port: 9090,
  metrics: ["tokens", "latency", "errors", "cost"],
});

agent.on("metrics", (metrics) => {
  exporter.update(metrics);
});
```

## Next Steps

- [Langfuse Integration Guide](/docs/guides/langfuse-integration) - Detailed setup instructions
- [Production Deployment](/docs/guides/production-deployment) - Observability in production
- [Monitoring Usage](/docs/monitoring-usage) - Track costs and usage