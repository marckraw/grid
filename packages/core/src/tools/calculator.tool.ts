import { z } from "zod";
import { tool } from "ai";
import type { GridTool } from "./types.js";

/**
 * Calculator tool for basic math operations
 */
export const toolDefinition = {
  name: "calculator",
  description: "Perform basic math calculations",
  inputSchema: z.object({
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("The math operation to perform"),
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
};

export const calculatorToolWithoutExecute = tool(toolDefinition);

export const calculatorToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ operation, a, b }) => {
    let result: number;

    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        if (b === 0) {
          return { error: "Division by zero is not allowed", result: null };
        }
        result = a / b;
        break;
      default:
        return { error: "Invalid operation", result: null };
    }

    return {
      result,
      calculation: `${a} ${operation} ${b} = ${result}`,
    };
  },
});

export const calculatorTool: GridTool = {
  withExecute: calculatorToolWithExecute,
  withoutExecute: calculatorToolWithoutExecute,
  definition: toolDefinition,
};
