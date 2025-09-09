import { createHash } from "crypto";
import { tool } from "ai";
import { z } from "zod";
import type { GridTool } from "./types.js";

/**
 * Hash generator tool for various cryptographic hash functions
 */
export const toolDefinition = {
  name: "hash",
  description:
    "Generate various hash digests of text (MD5, SHA1, SHA256, SHA512)",
  inputSchema: z.object({
    text: z.string().describe("Text to hash"),
    algorithm: z
      .enum(["md5", "sha1", "sha256", "sha512"])
      .describe("Hash algorithm to use"),
    encoding: z
      .enum(["hex", "base64", "base64url"])
      .optional()
      .default("hex")
      .describe("Output encoding format"),
  }),
};

export const hashToolWithoutExecute = tool(toolDefinition);

export const hashToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ text, algorithm, encoding = "hex" }) => {
    try {
      const hash = createHash(algorithm)
        .update(text)
        .digest(encoding as any);

      return {
        algorithm,
        hash,
        encoding,
        length: hash.length,
        input: {
          text: text.length > 50 ? text.substring(0, 50) + "..." : text,
          length: text.length,
        },
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Failed to generate hash",
        algorithm,
        encoding,
      };
    }
  },
});

export const hashTool: GridTool = {
  withExecute: hashToolWithExecute,
  withoutExecute: hashToolWithoutExecute,
  definition: toolDefinition,
};
