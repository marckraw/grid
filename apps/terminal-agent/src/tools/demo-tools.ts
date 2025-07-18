import { z } from "zod";
import { createNamedTool } from "@mrck-labs/grid-core";

/**
 * Calculator tool for basic math operations
 */
export const calculatorTool = createNamedTool({
  name: "calculator",
  description: "Perform basic math calculations",
  parameters: z.object({
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("The math operation to perform"),
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
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
      calculation: `${a} ${operation} ${b} = ${result}` 
    };
  },
});

/**
 * Current time tool
 */
export const currentTimeTool = createNamedTool({
  name: "getCurrentTime",
  description: "Get the current date and time",
  parameters: z.object({
    timezone: z.string().optional().describe("Timezone (e.g., 'UTC', 'America/New_York')")
  }),
  execute: async ({ timezone }) => {
    const now = new Date();
    
    if (timezone) {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          dateStyle: 'full',
          timeStyle: 'long'
        });
        return {
          time: formatter.format(now),
          timezone,
          timestamp: now.toISOString()
        };
      } catch (error) {
        return {
          error: `Invalid timezone: ${timezone}`,
          fallback: now.toISOString()
        };
      }
    }
    
    return {
      time: now.toLocaleString(),
      timezone: "local",
      timestamp: now.toISOString()
    };
  },
});