import { z } from "zod";
import { createNamedTool } from "@mrck-labs/grid-core";
import FirecrawlApp from "@mendable/firecrawl-js";

/**
 * Create a read URL tool with Firecrawl configuration
 */
export const createReadUrlTool = (config?: { firecrawlApiKey?: string }) => {
  const apiKey = config?.firecrawlApiKey || process.env.FIRECRAWL_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "Missing Firecrawl API key. Please provide it via config or the FIRECRAWL_API_KEY environment variable."
    );
  }
  const firecrawl = new FirecrawlApp({ apiKey });

  return createNamedTool({
    name: "readUrl",
    description: "Read the content of a url",
    inputSchema: z.object({
      reasoningText: z.string().describe("why did you pick this tool?"),
      url: z
        .string()
        .describe(
          "The url to read. The LLM will return a response that will be used to answer the user's message."
        ),
    }),
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

/**
 * Default read URL tool instance
 * Requires FIRECRAWL_API_KEY environment variable
 */
export const readUrlTool = createReadUrlTool();
