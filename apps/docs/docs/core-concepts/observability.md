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

Configure Langfuse in your environment:

```bash
# .env file
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or your self-hosted URL
```

### Initialization

Grid automatically initializes Langfuse when configured:

```typescript
import { createConfigurableAgent } from "@mrck-labs/grid-core";

const agent = createConfigurableAgent({
  llmConfig: { model: "gpt-4", provider: "openai" },
  observabilityConfig: {
    enabled: true,  // Enables Langfuse
    sessionId: "user-session-123",  // Optional session grouping
    userId: "user-456",  // Optional user tracking
    tags: ["production", "customer-service"],  // Optional tags
  },
});
```

## Tracing

### Automatic Tracing

Grid automatically traces:
- LLM calls
- Tool executions
- Agent workflows
- Error occurrences

```typescript
// Every agent action is automatically traced
const response = await agent.act("What's the weather?");

// In Langfuse, you'll see:
// - The complete request/response
// - Tool calls made
// - Token usage
// - Execution time
```

### Custom Spans

Add custom spans for specific operations:

```typescript
import { getLangfuseInstance } from "@mrck-labs/grid-core";

async function processData(data: any) {
  const langfuse = getLangfuseInstance();
  const span = langfuse.span({
    name: "data_processing",
    metadata: { dataSize: data.length },
  });
  
  try {
    const result = await heavyProcessing(data);
    span.end({ output: { resultSize: result.length } });
    return result;
  } catch (error) {
    span.end({ 
      level: "ERROR", 
      statusMessage: error.message 
    });
    throw error;
  }
}
```

### Trace Hierarchy

Grid creates a hierarchical trace structure:

```
Trace: Agent Conversation
├── Span: Agent.act()
│   ├── Span: LLM Generation
│   │   └── Generation: OpenAI API Call
│   ├── Span: Tool Execution - get_weather
│   │   └── Span: API Request
│   └── Span: Response Formatting
└── Span: Observability Upload
```

## Metrics and Analytics

### Token Usage

Track token consumption across providers:

```typescript
const agent = createConfigurableAgent({
  observabilityConfig: {
    trackTokens: true,
    tokenAlerts: {
      warningThreshold: 10000,  // Warn at 10k tokens
      errorThreshold: 50000,    // Error at 50k tokens
    },
  },
});

// Access token metrics
agent.on("metrics", (metrics) => {
  console.log(`Tokens used: ${metrics.totalTokens}`);
  console.log(`Estimated cost: $${metrics.estimatedCost}`);
});
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

## Production Monitoring

### Dashboards

Create monitoring dashboards:

```typescript
// Langfuse provides built-in dashboards for:
// - Token usage over time
// - Cost breakdown by model
// - Error rates and types
// - Latency percentiles
// - User activity patterns
```

### Alerts

Set up alerts for critical metrics:

```typescript
const monitoring = {
  alerts: [
    {
      metric: "error_rate",
      threshold: 0.05,  // 5% error rate
      action: "email",
    },
    {
      metric: "avg_latency",
      threshold: 3000,  // 3 seconds
      action: "slack",
    },
    {
      metric: "daily_cost",
      threshold: 100,  // $100
      action: "webhook",
    },
  ],
};
```

### Session Analysis

Group traces by session:

```typescript
// Track user sessions
const agent = createConfigurableAgent({
  observabilityConfig: {
    sessionId: getUserSessionId(),
    userId: getUserId(),
    metadata: {
      plan: getUserPlan(),
      feature: "chat",
    },
  },
});

// Analyze in Langfuse:
// - Session duration
// - Messages per session
// - Tool usage patterns
// - User satisfaction scores
```

## Best Practices

### 1. Meaningful Names

Use descriptive names for traces and spans:

```typescript
// ❌ Bad
langfuse.trace({ name: "process" });

// ✅ Good
langfuse.trace({ name: "customer_support_ticket_creation" });
```

### 2. Structured Metadata

Add structured metadata for better filtering:

```typescript
const trace = langfuse.trace({
  name: "api_request",
  metadata: {
    endpoint: "/api/chat",
    method: "POST",
    environment: "production",
    version: "1.2.3",
  },
});
```

### 3. Sampling

Use sampling for high-volume production:

```typescript
const agent = createConfigurableAgent({
  observabilityConfig: {
    samplingRate: 0.1,  // Sample 10% of requests
    alwaysSample: {
      onError: true,  // Always sample errors
      userId: ["vip-user-1", "vip-user-2"],  // Always sample VIPs
    },
  },
});
```

### 4. Cost Management

Monitor and control costs:

```typescript
const costControls = {
  maxDailySpend: 100,
  maxTokensPerRequest: 4000,
  enableCostAlerts: true,
  costBreakdown: {
    byModel: true,
    byUser: true,
    byFeature: true,
  },
};
```

### 5. Privacy

Protect sensitive information:

```typescript
const agent = createConfigurableAgent({
  observabilityConfig: {
    redactPatterns: [
      /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,  // Email
    ],
    excludeFields: ["password", "apiKey", "secretToken"],
  },
});
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