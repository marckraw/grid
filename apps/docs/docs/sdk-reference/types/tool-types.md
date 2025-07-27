---
sidebar_position: 3
---

# Tool Types

Type definitions for tools and tool execution.

## Overview

This page documents the TypeScript types used for tool creation, registration, and execution in Grid.

## Core Types

### Tool

```typescript
type Tool<TParameters extends z.ZodTypeAny = z.ZodTypeAny, TResult = any> = 
  CoreTool<TParameters, TResult> & {
    name: string;
  };
```

Grid's tool type extends Vercel AI SDK's CoreTool with a name property.

### ToolResult

```typescript
interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: any;
}
```

Result from tool execution.

### ToolExecutor

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
```

Service for managing and executing tools.

## Tool Creation

### Basic Tool Structure

```typescript
const myTool: Tool = {
  name: "my_tool",
  description: "Description of what the tool does",
  parameters: z.object({
    param1: z.string(),
    param2: z.number()
  }),
  execute: async (params) => {
    // Implementation
    return result;
  }
};
```

### Generic Tool Types

```typescript
// Fully typed tool
type CalculatorParams = z.infer<typeof calculatorSchema>;
type CalculatorResult = { result: number; expression: string };

const calculatorSchema = z.object({
  expression: z.string()
});

const calculator: Tool<typeof calculatorSchema, CalculatorResult> = {
  name: "calculator",
  description: "Evaluate math expressions",
  parameters: calculatorSchema,
  execute: async (params) => {
    const result = eval(params.expression);
    return { result, expression: params.expression };
  }
};
```

## Tool Registration

### Type-Safe Registration

```typescript
function registerTypedTool<T extends Tool>(
  executor: ToolExecutor,
  tool: T
): void {
  executor.registerTool(tool);
}

function registerMultipleTools(
  executor: ToolExecutor,
  tools: Tool[]
): void {
  tools.forEach(tool => {
    if (!executor.hasT(tool.name)) {
      executor.registerTool(tool);
    }
  });
}
```

## Tool Categories

### Builtin Tools

```typescript
interface BuiltinTool extends Tool {
  category: "builtin";
  version: string;
}
```

### Custom Tools

```typescript
interface CustomTool extends Tool {
  category: "custom";
  author?: string;
  documentation?: string;
}
```

### MCP Tools

```typescript
interface MCPTool extends Tool {
  category: "mcp";
  server: string;
  protocol: string;
}
```

## Parameter Schemas

### Common Parameter Patterns

```typescript
// Optional parameters
const optionalParams = z.object({
  required: z.string(),
  optional: z.string().optional(),
  withDefault: z.number().default(10)
});

// Enum parameters
const enumParams = z.object({
  mode: z.enum(["fast", "accurate", "balanced"]),
  format: z.enum(["json", "xml", "text"])
});

// Array parameters
const arrayParams = z.object({
  items: z.array(z.string()),
  numbers: z.array(z.number()).min(1).max(100)
});

// Nested objects
const nestedParams = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email()
  }),
  settings: z.object({
    theme: z.enum(["light", "dark"]),
    notifications: z.boolean()
  })
});
```

## Validation and Type Guards

### Tool Validation

```typescript
function isValidTool(value: any): value is Tool {
  return (
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    value.parameters &&
    typeof value.execute === "function"
  );
}

function validateToolResult(result: any): result is ToolResult {
  return (
    result &&
    typeof result === "object" &&
    typeof result.toolCallId === "string" &&
    typeof result.toolName === "string" &&
    "result" in result
  );
}
```

### Parameter Validation

```typescript
function validateToolParams<T extends z.ZodTypeAny>(
  schema: T,
  params: unknown
): z.infer<T> | null {
  try {
    return schema.parse(params);
  } catch (error) {
    console.error("Invalid parameters:", error);
    return null;
  }
}
```

## Advanced Patterns

### Conditional Tools

```typescript
type ConditionalTool<TCondition = any> = Tool & {
  condition: (context: TCondition) => boolean;
};

function filterAvailableTools<T>(
  tools: ConditionalTool<T>[],
  context: T
): Tool[] {
  return tools.filter(tool => tool.condition(context));
}
```

### Tool Composition

```typescript
function composeTool(
  tools: Tool[],
  name: string,
  description: string
): Tool {
  return {
    name,
    description,
    parameters: z.object({
      toolName: z.enum(tools.map(t => t.name) as [string, ...string[]]),
      params: z.any()
    }),
    execute: async ({ toolName, params }) => {
      const tool = tools.find(t => t.name === toolName);
      if (!tool) throw new Error(`Unknown tool: ${toolName}`);
      return await tool.execute(params);
    }
  };
}
```

### Tool Wrappers

```typescript
function withLogging<T extends Tool>(tool: T): T {
  return {
    ...tool,
    execute: async (params) => {
      console.log(`Executing ${tool.name} with:`, params);
      const start = Date.now();
      try {
        const result = await tool.execute(params);
        console.log(`${tool.name} completed in ${Date.now() - start}ms`);
        return result;
      } catch (error) {
        console.error(`${tool.name} failed:`, error);
        throw error;
      }
    }
  };
}
```

## Best Practices

1. **Use descriptive names** - Tool names should clearly indicate function
2. **Validate parameters** - Always use Zod schemas for type safety
3. **Handle errors gracefully** - Tools should return error messages, not throw
4. **Document parameters** - Use `.describe()` on all schema fields
5. **Keep tools focused** - Each tool should do one thing well
6. **Version your tools** - Track tool versions for compatibility

## Related Types

- [`Agent Types`](./agent-types) - How agents use tools
- [`LLM Types`](./llm-types) - Tool calls in messages