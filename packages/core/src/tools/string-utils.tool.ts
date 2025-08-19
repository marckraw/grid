import { z } from "zod";
import { tool } from "ai";
import type { GridTool } from "./types.js";

/**
 * String utilities tool for various text operations
 */
export const toolDefinition = {
  name: "stringUtils",
  description:
    "Perform various string operations like reverse, count words/chars, or base64 encoding",
  inputSchema: z.object({
    operation: z
      .enum([
        "reverse",
        "count_words",
        "count_chars",
        "to_base64",
        "from_base64",
        "to_uppercase",
        "to_lowercase",
        "trim",
      ])
      .describe("The string operation to perform"),
    text: z.string().describe("The text to process"),
  }),
};

export const stringUtilsToolWithoutExecute = tool(toolDefinition);

export const stringUtilsToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ operation, text }) => {
    switch (operation) {
      case "reverse":
        return {
          result: text.split("").reverse().join(""),
          original_length: text.length,
        };

      case "count_words":
        const words = text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0);
        return {
          result: words.length,
          words: words,
        };

      case "count_chars":
        return {
          result: text.length,
          without_spaces: text.replace(/\s/g, "").length,
        };

      case "to_base64":
        return {
          result: Buffer.from(text).toString("base64"),
          original_length: text.length,
        };

      case "from_base64":
        try {
          const decoded = Buffer.from(text, "base64").toString();
          return {
            result: decoded,
            decoded_length: decoded.length,
          };
        } catch (e) {
          return {
            error: "Invalid base64 string",
            input: text,
          };
        }

      case "to_uppercase":
        return { result: text.toUpperCase() };

      case "to_lowercase":
        return { result: text.toLowerCase() };

      case "trim":
        return {
          result: text.trim(),
          removed_chars: text.length - text.trim().length,
        };

      default:
        return { error: `Unknown operation: ${operation}` };
    }
  },
});

export const stringUtilsTool: GridTool = {
  withExecute: stringUtilsToolWithExecute,
  withoutExecute: stringUtilsToolWithoutExecute,
  definition: toolDefinition,
};
