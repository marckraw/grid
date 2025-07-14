import { z } from "zod";

/**
 * JSON Schema for tool parameters (OpenAI-compatible format)
 */
export const ToolParameterSchema = z.object({
  type: z.literal("object"),
  properties: z.record(z.any()),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
});

/**
 * Tool definition interface
 */
export interface Tool {
  name: string;
  description: string;
  parameters: z.infer<typeof ToolParameterSchema>;
  
  /**
   * Execute the tool with validated parameters
   */
  execute: (params: any) => Promise<ToolResult>;
  
  /**
   * Validate parameters before execution
   */
  validate?: (params: any) => { isValid: boolean; errors?: string[] };
  
  /**
   * Optional metadata about the tool
   */
  metadata?: {
    category?: string;
    version?: string;
    timeout?: number; // milliseconds
    retryable?: boolean;
  };
}

/**
 * Result returned by tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  metadata?: {
    executionTime?: number;
    retryCount?: number;
  };
}

/**
 * Tool call from LLM (OpenAI format)
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Tool response to send back to LLM
 */
export interface ToolResponse {
  tool_call_id: string;
  role: "tool";
  content: string;
  name: string;
}

/**
 * Options for tool executor
 */
export interface ToolExecutorOptions {
  maxRetries?: number;
  defaultTimeout?: number;
  validateBeforeExecute?: boolean;
  formatErrors?: boolean;
}

/**
 * Tool registry entry
 */
export interface ToolRegistryEntry {
  tool: Tool;
  addedAt: Date;
  executionCount: number;
  lastExecutedAt?: Date;
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  toolCall: ToolCall;
  attempt: number;
  startTime: number;
  agentId?: string;
  userId?: string;
}

/**
 * Schema for validating tool definitions
 */
export const ToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: ToolParameterSchema,
  metadata: z.object({
    category: z.string().optional(),
    version: z.string().optional(),
    timeout: z.number().positive().optional(),
    retryable: z.boolean().optional(),
  }).optional(),
});

/**
 * Helper to create a tool with proper typing
 */
export const createTool = (
  name: string,
  description: string,
  parameters: z.infer<typeof ToolParameterSchema>,
  execute: (params: any) => Promise<ToolResult>,
  options?: {
    validate?: (params: any) => { isValid: boolean; errors?: string[] };
    metadata?: Tool["metadata"];
  }
): Tool => {
  return {
    name,
    description,
    parameters,
    execute,
    validate: options?.validate,
    metadata: options?.metadata,
  };
};

/**
 * Format tool for OpenAI API
 */
export const formatToolForLLM = (tool: Tool) => {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
};