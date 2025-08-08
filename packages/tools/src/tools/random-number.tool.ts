import { z } from "zod";
import { createNamedTool } from "@mrck-labs/grid-core";

/**
 * Random number generator tool
 */
export const randomNumberTool = createNamedTool({
  name: "randomNumber",
  description: "Generate a random number within a specified range",
  inputSchema: z.object({
    min: z.number().describe("Minimum value (inclusive)"),
    max: z.number().describe("Maximum value (inclusive)"),
    integer: z.boolean().optional().describe("Whether to return an integer (default: false)")
  }),
  execute: async ({ min, max, integer = false }) => {
    if (min > max) {
      return {
        error: "Minimum value must be less than or equal to maximum value",
        min,
        max
      };
    }

    const random = Math.random() * (max - min) + min;
    const result = integer ? Math.floor(random) : random;
    
    return {
      value: result,
      range: `[${min}, ${max}]`,
      type: integer ? "integer" : "float"
    };
  }
});