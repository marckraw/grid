import { z } from "zod";
import { tool } from "ai";
import { GridTool } from "../types";

/**
 * Current time tool
 */
export const toolDefinition = {
  name: "getCurrentTime",
  description: "Get the current date and time",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe("Timezone (e.g., 'UTC', 'America/New_York')"),
  }),
};

// this is used, when we not using vercel ai sdk execution of tools, but when we use our custom ToolExecutor
export const currentTimeToolWithoutExecute = tool(toolDefinition);

export const currentTimeToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ timezone }) => {
    const now = new Date();

    if (timezone) {
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          dateStyle: "full",
          timeStyle: "long",
        });
        return {
          time: formatter.format(now),
          timezone,
          timestamp: now.toISOString(),
        };
      } catch (error) {
        return {
          error: `Invalid timezone: ${timezone}`,
          fallback: now.toISOString(),
        };
      }
    }

    return {
      time: now.toLocaleString(),
      timezone: "local",
      timestamp: now.toISOString(),
    };
  },
});

export const currentTimeTool: GridTool = {
  withExecute: currentTimeToolWithExecute,
  withoutExecute: currentTimeToolWithoutExecute,
  definition: toolDefinition,
};
