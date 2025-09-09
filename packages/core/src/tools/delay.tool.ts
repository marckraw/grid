import { tool } from "ai";
import { z } from "zod";
import type { GridTool } from "./types.js";

/**
 * Delay/timer tool for async operations
 */
export const toolDefinition = {
  name: "delay",
  description:
    "Wait for a specified amount of time (useful for timing operations or rate limiting)",
  inputSchema: z.object({
    milliseconds: z
      .number()
      .min(0)
      .max(5000)
      .describe("Time to wait in milliseconds (max 5000ms/5 seconds)"),
  }),
};

export const delayToolWithoutExecute = tool(toolDefinition);

export const delayToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ milliseconds }) => {
    const start = Date.now();
    const startTime = new Date(start).toISOString();

    await new Promise((resolve) => setTimeout(resolve, milliseconds));

    const end = Date.now();
    const endTime = new Date(end).toISOString();
    const elapsed = end - start;

    return {
      requested: milliseconds,
      actual: elapsed,
      drift: Math.abs(elapsed - milliseconds),
      startTime,
      endTime,
      message: `Waited for ${elapsed}ms (requested: ${milliseconds}ms)`,
    };
  },
});

export const delayTool: GridTool = {
  withExecute: delayToolWithExecute,
  withoutExecute: delayToolWithoutExecute,
  definition: toolDefinition,
};
