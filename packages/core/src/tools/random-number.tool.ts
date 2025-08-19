import { z } from "zod";
import { tool } from "ai";
import type { GridTool } from "./types.js";

/**
 * Random number generator tool
 */
export const toolDefinition = {
  name: "randomNumber",
  description: "Generate a random number within a specified range",
  inputSchema: z.object({
    min: z.number().describe("Minimum value (inclusive)"),
    max: z.number().describe("Maximum value (inclusive)"),
    integer: z
      .boolean()
      .optional()
      .describe("Whether to return an integer (default: false)"),
  }),
};

export const randomNumberToolWithoutExecute = tool(toolDefinition);

export const randomNumberToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ min, max, integer = false }) => {
    if (min > max) {
      return {
        error: "Minimum value must be less than or equal to maximum value",
        min,
        max,
      };
    }

    const random = Math.random() * (max - min) + min;
    const result = integer ? Math.floor(random) : random;

    return {
      value: result,
      range: `[${min}, ${max}]`,
      type: integer ? "integer" : "float",
    };
  },
});

export const randomNumberTool: GridTool = {
  withExecute: randomNumberToolWithExecute,
  withoutExecute: randomNumberToolWithoutExecute,
  definition: toolDefinition,
};
