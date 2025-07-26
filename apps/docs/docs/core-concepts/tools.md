---
sidebar_position: 2
---

# Tools

Tools are functions that agents can call to perform specific actions, retrieve information, or interact with external systems. They extend an agent's capabilities beyond pure language processing.

## What are Tools?

Tools in Grid are:
- **Functions** that agents can invoke based on user requests
- **Described** with names, descriptions, and parameter schemas
- **Type-safe** using Zod for parameter validation
- **Integrated** seamlessly with the Vercel AI SDK format

## Creating Tools

Grid provides the `createNamedTool` function for creating tools:

```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";

const weatherTool = createNamedTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("The city and country"),
    units: z.enum(["celsius", "fahrenheit"]).default("celsius"),
  }),
  execute: async ({ location, units }) => {
    // Implementation here
    const weather = await fetchWeatherAPI(location, units);
    return `The weather in ${location} is ${weather.temp}°${units[0].toUpperCase()}`;
  },
});
```

## Tool Anatomy

Every tool consists of four key parts:

### 1. Name
A unique identifier for the tool:
```typescript
name: "calculate_compound_interest"
```

### 2. Description
Helps the LLM understand when to use the tool:
```typescript
description: "Calculate compound interest for investments"
```

### 3. Parameters
Zod schema defining expected inputs:
```typescript
parameters: z.object({
  principal: z.number().describe("Initial investment amount"),
  rate: z.number().describe("Annual interest rate as decimal"),
  time: z.number().describe("Investment period in years"),
  compound: z.number().default(12).describe("Compounding frequency per year"),
})
```

### 4. Execute Function
The actual implementation:
```typescript
execute: async ({ principal, rate, time, compound }) => {
  const amount = principal * Math.pow(1 + rate/compound, compound * time);
  return `Final amount: $${amount.toFixed(2)}`;
}
```

## Tool Types

### Information Retrieval Tools

Tools that fetch data from external sources:

```typescript
const databaseTool = createNamedTool({
  name: "query_database",
  description: "Query customer database for information",
  parameters: z.object({
    query: z.string().describe("SQL query to execute"),
    table: z.enum(["customers", "orders", "products"]),
  }),
  execute: async ({ query, table }) => {
    const results = await db.query(query, { table });
    return JSON.stringify(results, null, 2);
  },
});
```

### Action Tools

Tools that perform actions or side effects:

```typescript
const emailTool = createNamedTool({
  name: "send_email",
  description: "Send an email to a recipient",
  parameters: z.object({
    to: z.string().email().describe("Recipient email"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body"),
    cc: z.array(z.string().email()).optional(),
  }),
  execute: async ({ to, subject, body, cc }) => {
    const result = await emailService.send({ to, subject, body, cc });
    return `Email sent successfully. Message ID: ${result.messageId}`;
  },
});
```

### Computation Tools

Tools for calculations and data processing:

```typescript
const analyticsTool = createNamedTool({
  name: "analyze_metrics",
  description: "Analyze performance metrics",
  parameters: z.object({
    metrics: z.array(z.number()).describe("Array of metric values"),
    operation: z.enum(["mean", "median", "std_dev", "percentile"]),
    percentile: z.number().min(0).max(100).optional(),
  }),
  execute: async ({ metrics, operation, percentile }) => {
    let result;
    switch (operation) {
      case "mean":
        result = metrics.reduce((a, b) => a + b) / metrics.length;
        break;
      case "median":
        const sorted = [...metrics].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        result = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        break;
      // ... other operations
    }
    return `${operation} of metrics: ${result}`;
  },
});
```

## Tool Best Practices

### 1. Clear Descriptions

Help the LLM understand when to use your tool:

```typescript
// ❌ Poor description
description: "Get data"

// ✅ Good description
description: "Retrieve real-time stock prices for a given ticker symbol"
```

### 2. Parameter Documentation

Use Zod's `.describe()` method:

```typescript
parameters: z.object({
  // ❌ No description
  symbol: z.string(),
  
  // ✅ With description
  symbol: z.string().describe("Stock ticker symbol (e.g., AAPL, GOOGL)"),
})
```

### 3. Error Handling

Always handle errors gracefully:

```typescript
execute: async ({ url }) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return `Error: HTTP ${response.status} - ${response.statusText}`;
    }
    const data = await response.json();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return `Error fetching data: ${error.message}`;
  }
}
```

### 4. Return Useful Results

Provide structured, informative responses:

```typescript
// ❌ Minimal response
return "Done";

// ✅ Informative response
return {
  success: true,
  recordsUpdated: 5,
  timestamp: new Date().toISOString(),
  message: "Successfully updated 5 customer records"
};
```

## Advanced Tool Patterns

### Conditional Tools

Tools that behave differently based on context:

```typescript
const smartSearchTool = createNamedTool({
  name: "smart_search",
  description: "Search across multiple data sources",
  parameters: z.object({
    query: z.string(),
    sources: z.array(z.enum(["web", "database", "files"])).default(["web"]),
    limit: z.number().default(10),
  }),
  execute: async ({ query, sources, limit }) => {
    const results = [];
    
    for (const source of sources) {
      switch (source) {
        case "web":
          results.push(...await searchWeb(query, limit));
          break;
        case "database":
          results.push(...await searchDatabase(query, limit));
          break;
        case "files":
          results.push(...await searchFiles(query, limit));
          break;
      }
    }
    
    return JSON.stringify(results.slice(0, limit), null, 2);
  },
});
```

### Stateful Tools

Tools that maintain state across calls:

```typescript
class ConversationMemory {
  private history: string[] = [];
  
  createTool() {
    return createNamedTool({
      name: "remember",
      description: "Store important information for later recall",
      parameters: z.object({
        information: z.string().describe("Information to remember"),
        category: z.string().optional().describe("Category for organization"),
      }),
      execute: async ({ information, category }) => {
        const entry = category ? `[${category}] ${information}` : information;
        this.history.push(entry);
        return `Remembered: "${information}"`;
      },
    });
  }
  
  createRecallTool() {
    return createNamedTool({
      name: "recall",
      description: "Recall previously stored information",
      parameters: z.object({
        category: z.string().optional().describe("Filter by category"),
        keywords: z.array(z.string()).optional().describe("Search keywords"),
      }),
      execute: async ({ category, keywords }) => {
        let filtered = this.history;
        
        if (category) {
          filtered = filtered.filter(entry => entry.includes(`[${category}]`));
        }
        
        if (keywords?.length) {
          filtered = filtered.filter(entry =>
            keywords.some(keyword => entry.toLowerCase().includes(keyword.toLowerCase()))
          );
        }
        
        return filtered.length > 0 
          ? `Found memories:\n${filtered.join('\n')}`
          : "No matching memories found";
      },
    });
  }
}
```

### Composite Tools

Tools that orchestrate multiple operations:

```typescript
const dataProcessingTool = createNamedTool({
  name: "process_csv_data",
  description: "Load, process, and analyze CSV data",
  parameters: z.object({
    filepath: z.string().describe("Path to CSV file"),
    operations: z.array(z.enum(["clean", "transform", "analyze", "visualize"])),
    outputFormat: z.enum(["json", "summary", "chart"]).default("summary"),
  }),
  execute: async ({ filepath, operations, outputFormat }) => {
    // Load data
    const rawData = await loadCSV(filepath);
    let data = rawData;
    
    // Apply operations in sequence
    for (const op of operations) {
      switch (op) {
        case "clean":
          data = await cleanData(data);
          break;
        case "transform":
          data = await transformData(data);
          break;
        case "analyze":
          data = await analyzeData(data);
          break;
        case "visualize":
          data = await createVisualization(data);
          break;
      }
    }
    
    // Format output
    switch (outputFormat) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "summary":
        return generateSummary(data);
      case "chart":
        return generateChartURL(data);
    }
  },
});
```

## Tool Integration

### Adding Tools to Agents

```typescript
const llmService = baseLLMService({ langfuse: { enabled: false } });
const toolExecutor = createToolExecutor();

// Register tools with the executor
toolExecutor.registerTool(weatherTool);
toolExecutor.registerTool(calculatorTool);
toolExecutor.registerTool(databaseTool);

const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "tool-enabled-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are an AI assistant with access to various tools."
    },
    metadata: {
      id: "tool-enabled-agent",
      type: "general",
      name: "Tool-Enabled Agent",
      description: "Agent with tool capabilities",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [weatherTool, calculatorTool, databaseTool],
      mcp: []
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});
```

### Tool Choice Strategies

Control how agents use tools:

```typescript
// Always let the agent decide
toolChoice: "auto"

// Never use tools
toolChoice: "none"

// Force tool usage
toolChoice: "required"

// Force specific tool
toolChoice: { type: "tool", toolName: "calculator" }
```

### MCP Tools

Grid supports Model Context Protocol (MCP) tools:

```typescript
// MCP tools are registered separately and then added to the agent
import { registerMCPTools } from "@mrck-labs/grid-core";

// Register MCP server tools
const mcpTools = await registerMCPTools({
  servers: [
    {
      name: "figma",
      command: "npx",
      args: ["@figma/mcp-server-figma"],
      env: { FIGMA_ACCESS_TOKEN: process.env.FIGMA_TOKEN },
    },
  ],
});

// Add MCP tools to agent
const agent = createConfigurableAgent({
  llmService,
  toolExecutor,
  config: {
    id: "mcp-agent",
    type: "general",
    version: "1.0.0",
    prompts: {
      system: "You are an AI assistant with MCP tool access."
    },
    metadata: {
      id: "mcp-agent",
      type: "general",
      name: "MCP Agent",
      description: "Agent with MCP tools",
      capabilities: ["general"],
      version: "1.0.0"
    },
    tools: {
      builtin: [],
      custom: [],
      mcp: mcpTools
    },
    behavior: {
      maxRetries: 3,
      responseFormat: "text"
    }
  }
});
```

## Testing Tools

Always test your tools thoroughly:

```typescript
import { describe, it, expect } from "vitest";

describe("Weather Tool", () => {
  it("should return weather for valid location", async () => {
    const result = await weatherTool.execute({
      location: "London, UK",
      units: "celsius",
    });
    
    expect(result).toContain("London");
    expect(result).toMatch(/\d+°C/);
  });
  
  it("should handle invalid locations", async () => {
    const result = await weatherTool.execute({
      location: "InvalidCity123",
      units: "celsius",
    });
    
    expect(result).toContain("Error");
  });
});
```

## Next Steps

- [Services Architecture](/docs/core-concepts/services-architecture) - Understand how tools integrate with services
- [Building Custom Tools](/docs/guides/building-custom-tools) - Deep dive into tool creation
- [MCP Integration](/docs/guides/mcp-integration) - Use Model Context Protocol tools