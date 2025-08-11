import { tool as createTool } from "ai";
import type { Tool as AiTool } from "ai";
import { z } from "zod";

/**
 * Grid Tool type - Vercel AI SDK's Tool with a name property
 */
export type Tool = AiTool & {
  name: string; // We add name for easier identification
};

/**
 * Create a tool using Vercel AI SDK
 */
export { createTool };

/**
 * Helper to create a tool wrapped in an object with the tool name as key
 *
 * @example
 * const tools = {
 *   ...createNamedTool({ name: 'calculator', ... }),
 *   ...createNamedTool({ name: 'timer', ... }),
 * };
 * // Results in: { calculator: tool1, timer: tool2 }
 */
export const createNamedTool = <
  TName extends string,
  TParameters extends z.ZodTypeAny = z.ZodTypeAny,
  TResult = any
>(config: {
  name: TName;
  description: string;
  inputSchema: TParameters;
  execute: (params: z.infer<TParameters>) => Promise<TResult>;
}): Record<TName, AiTool<TParameters, TResult>> => {
  // Cast to bypass TypeScript's strict overload checking
  // The types are correct, but the AI SDK's overloads are complex
  const tool = createTool<z.infer<TParameters>, TResult>({
    description: config.description,
    inputSchema: config.inputSchema as any, // Cast needed due to AI SDK's type complexity
    execute: config.execute as any,
  });

  // Add name property to the tool for identification
  Object.assign(tool, { name: config.name });

  // Return an object with the tool name as key
  return { [config.name]: tool } as Record<TName, AiTool<TParameters, TResult>>;
};

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
): value is AiTool<T> => {
  return (
    typeof value === "object" &&
    value !== null &&
    "description" in value &&
    "inputSchema" in value && // AI SDK v5 uses inputSchema
    "execute" in value &&
    "name" in value
  );
};
