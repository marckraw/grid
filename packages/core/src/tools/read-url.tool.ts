import FirecrawlApp from "@mendable/firecrawl-js";
import { tool } from "ai";
import { z } from "zod";
import type { GridTool } from "./types.js";

/**
 * Read URL tool
 */
export const toolDefinition = {
  name: "readUrl",
  description: "Read the content of a url",
  inputSchema: z.object({
    reasoningText: z.string().describe("why did you pick this tool?"),
    url: z
      .string()
      .describe(
        "The url to read. The LLM will return a response that will be used to answer the user's message.",
      ),
  }),
};

// Default tool without execute - requires Firecrawl API key to be configured
export const readUrlToolWithoutExecute = tool(toolDefinition);

// Default tool with execute - requires FIRECRAWL_API_KEY environment variable
export const readUrlToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ reasoningText, url }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY || "";
    if (!apiKey) {
      return "Missing Firecrawl API key. Please set the FIRECRAWL_API_KEY environment variable.";
    }

    const firecrawl = new FirecrawlApp({ apiKey });

    try {
      const result = await firecrawl.scrapeUrl(url);

      if (result.success) {
        return result.markdown as string;
      } else {
        return `Error scraping URL: ${result.error}`;
      }
    } catch (error) {
      return `Failed to scrape URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  },
});

export const readUrlTool: GridTool = {
  withExecute: readUrlToolWithExecute,
  withoutExecute: readUrlToolWithoutExecute,
  definition: toolDefinition,
};

/**
 * Create a read URL tool with Firecrawl configuration
 * Factory function for custom configurations
 */
export const createReadUrlTool = (config?: { firecrawlApiKey?: string }) => {
  const apiKey = config?.firecrawlApiKey || process.env.FIRECRAWL_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "Missing Firecrawl API key. Please provide it via config or the FIRECRAWL_API_KEY environment variable.",
    );
  }
  const firecrawl = new FirecrawlApp({ apiKey });

  return tool({
    ...toolDefinition,
    execute: async ({ reasoningText, url }) => {
      try {
        const result = await firecrawl.scrapeUrl(url);

        if (result.success) {
          return result.markdown as string;
        } else {
          return `Error scraping URL: ${result.error}`;
        }
      } catch (error) {
        return `Failed to scrape URL: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  });
};
