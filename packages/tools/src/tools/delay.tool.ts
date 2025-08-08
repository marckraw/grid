import { z } from "zod";
import { createNamedTool } from "@mrck-labs/grid-core";

/**
 * Delay/timer tool for async operations
 */
export const delayTool = createNamedTool({
  name: "delay",
  description: "Wait for a specified amount of time (useful for timing operations or rate limiting)",
  inputSchema: z.object({
    milliseconds: z
      .number()
      .min(0)
      .max(5000)
      .describe("Time to wait in milliseconds (max 5000ms/5 seconds)")
  }),
  execute: async ({ milliseconds }) => {
    const start = Date.now();
    const startTime = new Date(start).toISOString();
    
    await new Promise(resolve => setTimeout(resolve, milliseconds));
    
    const end = Date.now();
    const endTime = new Date(end).toISOString();
    const elapsed = end - start;
    
    return {
      requested: milliseconds,
      actual: elapsed,
      drift: Math.abs(elapsed - milliseconds),
      startTime,
      endTime,
      message: `Waited for ${elapsed}ms (requested: ${milliseconds}ms)`
    };
  }
});