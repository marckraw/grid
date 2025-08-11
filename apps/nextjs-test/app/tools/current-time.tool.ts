import { z } from "zod";
import { createNamedTool } from "@mrck-labs/grid-core";

/**
 * Current time tool
 */
export const currentTimeTool = createNamedTool({
  name: "getCurrentTime",
  description: "Get the current date and time",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe("Timezone (e.g., 'UTC', 'America/New_York')"),
  }),
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