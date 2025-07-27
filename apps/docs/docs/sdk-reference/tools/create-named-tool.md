---
sidebar_position: 1
---

# createNamedTool

Creates a named tool that agents can use to perform specific actions.

## Overview

`createNamedTool` is a helper function that creates tools compatible with the Vercel AI SDK format while adding a name property for easier identification. Tools are functions that agents can invoke to perform actions like calculations, data retrieval, or external API calls.

## Import

```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createNamedTool<TParameters extends z.ZodTypeAny, TResult = any>(config: {
  name: string;
  description: string;
  parameters: TParameters;
  execute: (params: z.infer<TParameters>) => Promise<TResult>;
}): Tool<TParameters, TResult>
```

## Parameters

### config
- **Type**: Object
- **Required Properties**:
  - `name`: Unique identifier for the tool
  - `description`: Clear description of what the tool does
  - `parameters`: Zod schema defining expected parameters
  - `execute`: Async function that implements the tool's logic

## Return Type: Tool

The created tool is compatible with Vercel AI SDK and includes:
- All properties from Vercel AI SDK's CoreTool
- Additional `name` property for identification

## Examples

### Simple Calculator Tool

```typescript
import { createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";

const calculatorTool = createNamedTool({
  name: "calculator",
  description: "Perform basic mathematical calculations",
  parameters: z.object({
    expression: z.string().describe("Mathematical expression to evaluate")
  }),
  execute: async ({ expression }) => {
    try {
      // In production, use a safe math parser
      const result = eval(expression);
      return `${expression} = ${result}`;
    } catch (error) {
      return `Error: Invalid expression "${expression}"`;
    }
  }
});
```

### Weather Information Tool

```typescript
const weatherTool = createNamedTool({
  name: "get_weather",
  description: "Get current weather information for a location",
  parameters: z.object({
    location: z.string().describe("City name or coordinates"),
    units: z.enum(["celsius", "fahrenheit"]).default("celsius")
      .describe("Temperature units")
  }),
  execute: async ({ location, units }) => {
    // Integration with weather API
    const response = await fetch(
      `https://api.weather.com/v1/current?location=${location}&units=${units}`
    );
    const data = await response.json();
    
    return {
      location: data.location.name,
      temperature: data.current.temp,
      units: units,
      conditions: data.current.conditions,
      humidity: data.current.humidity
    };
  }
});
```

### Database Query Tool

```typescript
const databaseTool = createNamedTool({
  name: "query_database",
  description: "Query the application database",
  parameters: z.object({
    table: z.enum(["users", "products", "orders"])
      .describe("Table to query"),
    filters: z.object({
      field: z.string(),
      operator: z.enum(["=", ">", "<", ">=", "<=", "!=", "like"]),
      value: z.any()
    }).array().optional()
      .describe("Filter conditions"),
    limit: z.number().min(1).max(100).default(10)
      .describe("Maximum number of results")
  }),
  execute: async ({ table, filters, limit }) => {
    // Build and execute query
    let query = db.select().from(table);
    
    if (filters) {
      filters.forEach(filter => {
        query = query.where(
          filter.field, 
          filter.operator, 
          filter.value
        );
      });
    }
    
    const results = await query.limit(limit);
    
    return {
      table,
      count: results.length,
      data: results
    };
  }
});
```

### File System Tool

```typescript
const fileSystemTool = createNamedTool({
  name: "file_operations",
  description: "Perform file system operations",
  parameters: z.object({
    operation: z.enum(["read", "write", "list", "delete"])
      .describe("Operation to perform"),
    path: z.string().describe("File or directory path"),
    content: z.string().optional()
      .describe("Content for write operations"),
    encoding: z.enum(["utf8", "binary"]).default("utf8")
      .describe("File encoding")
  }),
  execute: async ({ operation, path, content, encoding }) => {
    const fs = require('fs').promises;
    
    switch (operation) {
      case "read":
        return await fs.readFile(path, encoding);
        
      case "write":
        if (!content) throw new Error("Content required for write");
        await fs.writeFile(path, content, encoding);
        return `File written successfully: ${path}`;
        
      case "list":
        const files = await fs.readdir(path);
        return files;
        
      case "delete":
        await fs.unlink(path);
        return `File deleted: ${path}`;
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
});
```

### API Integration Tool

```typescript
const apiTool = createNamedTool({
  name: "http_request",
  description: "Make HTTP requests to external APIs",
  parameters: z.object({
    url: z.string().url().describe("API endpoint URL"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
    headers: z.record(z.string()).optional()
      .describe("Request headers"),
    body: z.any().optional()
      .describe("Request body (for POST/PUT)"),
    timeout: z.number().default(30000)
      .describe("Request timeout in milliseconds")
  }),
  execute: async ({ url, method, headers, body, timeout }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }
});
```

### Complex Tool with Validation

```typescript
const dataProcessingTool = createNamedTool({
  name: "process_data",
  description: "Process and transform data with validation",
  parameters: z.object({
    input: z.array(z.object({
      id: z.string(),
      value: z.number(),
      timestamp: z.string().datetime()
    })).describe("Input data array"),
    
    operations: z.array(z.enum([
      "normalize", "aggregate", "filter", "sort"
    ])).describe("Processing operations to apply"),
    
    options: z.object({
      normalizationRange: z.tuple([z.number(), z.number()])
        .default([0, 1]),
      aggregationMethod: z.enum(["sum", "avg", "min", "max"])
        .default("avg"),
      filterThreshold: z.number().optional(),
      sortOrder: z.enum(["asc", "desc"]).default("asc")
    }).default({})
  }),
  execute: async ({ input, operations, options }) => {
    let data = [...input];
    const results = {
      original: data.length,
      processed: 0,
      operations: []
    };
    
    for (const op of operations) {
      switch (op) {
        case "normalize":
          const values = data.map(d => d.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const [newMin, newMax] = options.normalizationRange;
          
          data = data.map(d => ({
            ...d,
            value: (d.value - min) / (max - min) * 
                   (newMax - newMin) + newMin
          }));
          results.operations.push("normalize");
          break;
          
        case "aggregate":
          const aggregated = data.reduce((acc, d) => {
            switch (options.aggregationMethod) {
              case "sum": return acc + d.value;
              case "min": return Math.min(acc, d.value);
              case "max": return Math.max(acc, d.value);
              default: return acc + d.value;
            }
          }, 0);
          
          if (options.aggregationMethod === "avg") {
            data = [{
              id: "aggregated",
              value: aggregated / data.length,
              timestamp: new Date().toISOString()
            }];
          }
          results.operations.push("aggregate");
          break;
          
        case "filter":
          if (options.filterThreshold !== undefined) {
            data = data.filter(d => d.value >= options.filterThreshold);
          }
          results.operations.push("filter");
          break;
          
        case "sort":
          data.sort((a, b) => {
            const diff = a.value - b.value;
            return options.sortOrder === "asc" ? diff : -diff;
          });
          results.operations.push("sort");
          break;
      }
    }
    
    results.processed = data.length;
    
    return {
      results,
      data
    };
  }
});
```

### Tool with Error Handling

```typescript
const safeTool = createNamedTool({
  name: "safe_operation",
  description: "Tool with comprehensive error handling",
  parameters: z.object({
    action: z.string(),
    retryOnError: z.boolean().default(true),
    maxRetries: z.number().min(1).max(5).default(3)
  }),
  execute: async ({ action, retryOnError, maxRetries }) => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Simulate operation that might fail
        if (Math.random() < 0.3) {
          throw new Error(`Operation failed on attempt ${attempt}`);
        }
        
        // Successful operation
        return {
          success: true,
          result: `Completed ${action} on attempt ${attempt}`,
          attempts: attempt
        };
      } catch (error) {
        lastError = error as Error;
        
        if (!retryOnError || attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
    
    // All attempts failed
    return {
      success: false,
      error: lastError?.message || "Unknown error",
      attempts: maxRetries
    };
  }
});
```

## Best Practices

1. **Clear Descriptions** - Write descriptions that help the LLM understand when to use the tool
2. **Parameter Documentation** - Use `.describe()` on all parameters
3. **Error Handling** - Always handle potential errors gracefully
4. **Return Consistency** - Return consistent data structures
5. **Async Operations** - All execute functions must be async
6. **Validation** - Use Zod schemas to validate parameters
7. **Naming Convention** - Use descriptive, unique tool names

## Parameter Schema Tips

```typescript
// Use descriptive parameter names and descriptions
parameters: z.object({
  // Good: Clear name and description
  targetLanguage: z.string()
    .describe("Target language code (e.g., 'es' for Spanish)"),
  
  // Provide defaults where sensible
  maxLength: z.number().default(1000)
    .describe("Maximum output length in characters"),
  
  // Use enums for fixed options
  format: z.enum(["json", "xml", "csv"])
    .describe("Output format"),
  
  // Complex nested structures
  options: z.object({
    includeMetadata: z.boolean().default(false),
    prettify: z.boolean().default(true)
  }).optional()
})
```

## Integration with Agents

```typescript
// Register tool with executor
const executor = createToolExecutor();
executor.registerTool(myTool);

// Include in agent configuration
const agent = createConfigurableAgent({
  llmService,
  toolExecutor: executor,
  config: {
    // ... other config
    tools: {
      custom: [myTool]
    }
  }
});
```

## TypeScript Support

The tool is fully typed with TypeScript generics:

```typescript
// Type-safe parameters and return type
const typedTool = createNamedTool({
  name: "typed_tool",
  description: "Fully typed tool",
  parameters: z.object({
    input: z.string(),
    count: z.number()
  }),
  execute: async (params) => {
    // params is typed as { input: string; count: number }
    return {
      processed: params.input.toUpperCase(),
      total: params.count * 2
    };
  }
});

// Return type is inferred
const result = await typedTool.execute({ input: "test", count: 5 });
// result is typed as { processed: string; total: number }
```

## Related APIs

- [`createToolExecutor`](../services/tool-executor) - Execute tools
- [`createConfigurableAgent`](../factories/configurable-agent) - Use tools in agents
- [Zod Documentation](https://zod.dev) - Schema validation library