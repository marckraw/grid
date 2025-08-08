import { tool as createTool, type CoreTool } from "ai";
import { z } from "zod";

/**
 * Grid Tool type - directly uses Vercel AI SDK's CoreTool
 */
export type Tool<
  TParameters extends z.ZodTypeAny = z.ZodTypeAny,
  TResult = any
> = CoreTool<TParameters, TResult> & {
  name: string; // We add name for easier identification
};

/**
 * Create a tool using Vercel AI SDK
 */
export { createTool };

/**
 * Helper to create a named tool
 */
export const createNamedTool = <
  TParameters extends z.ZodTypeAny,
  TResult = any
>(config: {
  name: string;
  description: string;
  parameters: TParameters;
  execute: (params: z.infer<TParameters>) => Promise<TResult>;
}): Tool<TParameters, TResult> => {
  const tool = createTool({
    description: config.description,
    inputSchema: config.parameters,
    execute: config.execute,
  });

  return Object.assign(tool, { name: config.name });
};

// Note: ToolCall type is imported from llm.types.ts which includes Zod schema

/**
 * Tool result for LLM (Vercel AI SDK format)
 */
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
}

/**
 * Type guard to check if something is a Tool
 */
export const isTool = <T extends z.ZodTypeAny = z.ZodTypeAny>(
  value: unknown
): value is Tool<T> => {
  return (
    typeof value === "object" &&
    value !== null &&
    "description" in value &&
    "parameters" in value &&
    "execute" in value &&
    "name" in value
  );
};

/**
 * Get tools ready for Vercel AI SDK
 * Converts array of tools to object keyed by tool name
 */
export const prepareToolsForSDK = <T extends Tool<any, any>>(
  tools: T[]
): Record<string, Omit<T, "name">> => {
  return tools.reduce((acc, tool) => {
    const { name, ...toolWithoutName } = tool;
    acc[name] = toolWithoutName;
    return acc;
  }, {} as Record<string, Omit<T, "name">>);
};
