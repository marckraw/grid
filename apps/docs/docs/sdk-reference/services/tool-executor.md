---
sidebar_position: 2
---

# createToolExecutor

Creates a service for registering and executing tools in response to LLM tool calls.

## Overview

`createToolExecutor` provides a centralized service for managing tool execution. It maintains a registry of available tools and handles the execution of tool calls returned by LLMs, including error handling and result formatting.

## Import

```typescript
import { createToolExecutor } from "@mrck-labs/grid-core";
```

## Function Signature

```typescript
function createToolExecutor(): ToolExecutor
```

## Return Type: ToolExecutor

### Methods

#### registerTool
```typescript
registerTool(tool: Tool): void
```
Register a tool to make it available for execution.

**Parameters**:
- `tool`: A Tool object created with `createNamedTool`

**Example**:
```typescript
const executor = createToolExecutor();
executor.registerTool(calculatorTool);
executor.registerTool(weatherTool);
```

#### registerTools
```typescript
registerTools(tools: Tool[]): void
```
Register multiple tools at once.

**Parameters**:
- `tools`: Array of Tool objects

**Example**:
```typescript
const executor = createToolExecutor();
executor.registerTools([calculatorTool, weatherTool, databaseTool]);
```

#### executeToolCall
```typescript
executeToolCall(toolCall: ToolCall): Promise<ToolResult>
```
Execute a single tool call from an LLM response.

**Parameters**:
- `toolCall`: ToolCall object containing:
  - `id`: Unique identifier for the call
  - `type`: Always "function"
  - `function`: Object with:
    - `name`: Name of the tool to execute
    - `arguments`: JSON string of arguments

**Returns**: `ToolResult` containing:
- `toolCallId`: The ID from the tool call
- `toolName`: Name of the executed tool
- `result`: The tool's return value

**Example**:
```typescript
const result = await executor.executeToolCall({
  id: "call_123",
  type: "function",
  function: {
    name: "calculator",
    arguments: '{"expression": "25 * 4"}'
  }
});
// { toolCallId: "call_123", toolName: "calculator", result: "100" }
```

#### executeToolCalls
```typescript
executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]>
```
Execute multiple tool calls in parallel.

**Parameters**:
- `toolCalls`: Array of ToolCall objects

**Returns**: Array of ToolResult objects

**Example**:
```typescript
const results = await executor.executeToolCalls([
  {
    id: "call_1",
    type: "function",
    function: { name: "weather", arguments: '{"city": "Paris"}' }
  },
  {
    id: "call_2",
    type: "function",
    function: { name: "weather", arguments: '{"city": "London"}' }
  }
]);
```

#### getRegisteredTools
```typescript
getRegisteredTools(): string[]
```
Get names of all registered tools.

**Returns**: Array of tool names

**Example**:
```typescript
const toolNames = executor.getRegisteredTools();
console.log(toolNames); // ["calculator", "weather", "database"]
```

#### hasT
```typescript
hasT(toolName: string): boolean
```
Check if a tool is registered.

**Parameters**:
- `toolName`: Name of the tool to check

**Returns**: true if tool is registered, false otherwise

**Example**:
```typescript
if (executor.hasT("calculator")) {
  console.log("Calculator tool is available");
}
```

#### clearTools
```typescript
clearTools(): void
```
Remove all registered tools.

**Example**:
```typescript
executor.clearTools();
console.log(executor.getRegisteredTools()); // []
```

## Examples

### Basic Tool Registration and Execution

```typescript
import { createToolExecutor, createNamedTool } from "@mrck-labs/grid-core";
import { z } from "zod";

// Create executor
const executor = createToolExecutor();

// Create and register tools
const mathTool = createNamedTool({
  name: "math",
  description: "Perform math operations",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number()
  }),
  execute: async ({ operation, a, b }) => {
    switch (operation) {
      case "add": return a + b;
      case "subtract": return a - b;
      case "multiply": return a * b;
      case "divide": return b !== 0 ? a / b : "Error: Division by zero";
    }
  }
});

executor.registerTool(mathTool);

// Execute a tool call
const result = await executor.executeToolCall({
  id: "call_456",
  type: "function",
  function: {
    name: "math",
    arguments: JSON.stringify({ operation: "multiply", a: 7, b: 8 })
  }
});

console.log(result);
// { toolCallId: "call_456", toolName: "math", result: 56 }
```

### Integration with LLM Response

```typescript
import { baseLLMService, createToolExecutor } from "@mrck-labs/grid-core";

// Setup
const llmService = baseLLMService();
const executor = createToolExecutor();

// Register tools
executor.registerTools([weatherTool, calculatorTool, searchTool]);

// Get LLM response with tool calls
const response = await llmService.runLLM({
  messages: [{ role: "user", content: "What's the weather in NYC and 15% of 80?" }],
  tools: [weatherTool, calculatorTool, searchTool]
});

// Execute all tool calls from the response
if (response.toolCalls && response.toolCalls.length > 0) {
  const results = await executor.executeToolCalls(response.toolCalls);
  
  // Process results
  results.forEach(result => {
    console.log(`${result.toolName}: ${result.result}`);
  });
}
```

### Error Handling

```typescript
const executor = createToolExecutor();

// Register a tool that might fail
const riskyTool = createNamedTool({
  name: "risky_operation",
  description: "A tool that might fail",
  parameters: z.object({
    shouldFail: z.boolean()
  }),
  execute: async ({ shouldFail }) => {
    if (shouldFail) {
      throw new Error("Operation failed as requested");
    }
    return "Success!";
  }
});

executor.registerTool(riskyTool);

// Execute with error handling
try {
  const result = await executor.executeToolCall({
    id: "call_789",
    type: "function",
    function: {
      name: "risky_operation",
      arguments: '{"shouldFail": true}'
    }
  });
} catch (error) {
  console.error("Tool execution failed:", error.message);
  // The error includes details about which tool failed
}
```

### Dynamic Tool Management

```typescript
const executor = createToolExecutor();

// Start with some tools
executor.registerTools([basicCalculator, basicWeather]);

// Check available tools
console.log("Initial tools:", executor.getRegisteredTools());

// Add more tools based on user permissions
if (userHasPremium) {
  executor.registerTool(advancedAnalyticsTool);
  executor.registerTool(databaseQueryTool);
}

// Remove a tool if needed
if (!weatherApiAvailable) {
  // Note: No direct removal method, would need to clear and re-register
  const currentTools = [basicCalculator];
  if (userHasPremium) {
    currentTools.push(advancedAnalyticsTool, databaseQueryTool);
  }
  executor.clearTools();
  executor.registerTools(currentTools);
}
```

### Parallel Execution

```typescript
const executor = createToolExecutor();
executor.registerTools([weatherTool, stockTool, newsearchTool]);

// Multiple tool calls execute in parallel for better performance
const toolCalls = [
  {
    id: "call_1",
    type: "function" as const,
    function: { name: "weather", arguments: '{"city": "Tokyo"}' }
  },
  {
    id: "call_2",
    type: "function" as const,
    function: { name: "stock", arguments: '{"symbol": "AAPL"}' }
  },
  {
    id: "call_3",
    type: "function" as const,
    function: { name: "newsearch", arguments: '{"query": "AI news"}' }
  }
];

// All three execute simultaneously
const startTime = Date.now();
const results = await executor.executeToolCalls(toolCalls);
const duration = Date.now() - startTime;

console.log(`Executed ${results.length} tools in ${duration}ms`);
```

### Tool Validation

```typescript
const executor = createToolExecutor();

// Before executing, check if tools are available
const requiredTools = ["calculator", "weather", "translate"];
const missingTools = requiredTools.filter(tool => !executor.hasT(tool));

if (missingTools.length > 0) {
  console.error(`Missing required tools: ${missingTools.join(", ")}`);
  // Register missing tools or handle error
}

// Safe execution with validation
async function safeExecuteToolCall(toolCall: ToolCall) {
  const toolName = toolCall.function.name;
  
  if (!executor.hasT(toolName)) {
    return {
      toolCallId: toolCall.id,
      toolName: toolName,
      result: `Error: Tool '${toolName}' is not available`
    };
  }
  
  try {
    return await executor.executeToolCall(toolCall);
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      toolName: toolName,
      result: `Error: ${error.message}`
    };
  }
}
```

## Best Practices

1. **Register tools before LLM calls** - Ensure tools are registered before passing them to LLM
2. **Handle execution errors** - Tool execution can fail; always use try-catch
3. **Validate tool availability** - Use `hasT()` to check before execution
4. **Execute in parallel** - Use `executeToolCalls()` for multiple tools
5. **Clear tools when switching contexts** - Use `clearTools()` when changing tool sets

## Error Handling

The executor handles several error cases:

- **Tool not found**: Error thrown if tool name doesn't match any registered tool
- **Invalid arguments**: Error if tool arguments don't match expected schema
- **Execution errors**: Errors from tool execution are propagated with context
- **Malformed tool calls**: Invalid JSON in arguments results in parse error

## TypeScript Types

```typescript
interface ToolExecutor {
  registerTool(tool: Tool): void;
  registerTools(tools: Tool[]): void;
  executeToolCall(toolCall: ToolCall): Promise<ToolResult>;
  executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]>;
  getRegisteredTools(): string[];
  hasT(toolName: string): boolean;
  clearTools(): void;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: any;
}
```

## Related APIs

- [`createNamedTool`](../tools/create-named-tool) - Create tools to register
- [`baseLLMService`](./base-llm-service) - Returns tool calls to execute
- [`createConfigurableAgent`](../factories/configurable-agent) - Uses tool executor internally