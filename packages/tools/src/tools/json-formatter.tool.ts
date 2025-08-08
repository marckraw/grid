import { z } from "zod";
import { createNamedTool } from "@mrck-labs/grid-core";

/**
 * JSON formatter and validator tool
 */
export const jsonFormatterTool = createNamedTool({
  name: "jsonFormatter",
  description: "Format, validate, or minify JSON strings",
  inputSchema: z.object({
    operation: z.enum(["format", "minify", "validate"]).describe("The operation to perform on the JSON"),
    json: z.string().describe("The JSON string to process"),
    indent: z.number().optional().default(2).describe("Number of spaces for indentation when formatting")
  }),
  execute: async ({ operation, json, indent = 2 }) => {
    try {
      const parsed = JSON.parse(json);
      
      switch (operation) {
        case "format":
          return { 
            result: JSON.stringify(parsed, null, indent),
            valid: true,
            size: {
              original: json.length,
              formatted: JSON.stringify(parsed, null, indent).length
            }
          };
        
        case "minify":
          const minified = JSON.stringify(parsed);
          return { 
            result: minified,
            valid: true,
            size: {
              original: json.length,
              minified: minified.length,
              saved: json.length - minified.length
            }
          };
        
        case "validate":
          return { 
            valid: true,
            message: "Valid JSON",
            type: Array.isArray(parsed) ? "array" : typeof parsed,
            keys: typeof parsed === 'object' && !Array.isArray(parsed) 
              ? Object.keys(parsed) 
              : undefined
          };
        
        default:
          return { error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid JSON";
      
      // Try to provide helpful error context
      let position: number | undefined;
      const match = errorMessage.match(/position (\d+)/);
      if (match) {
        position = parseInt(match[1]);
      }
      
      return {
        valid: false,
        error: errorMessage,
        operation,
        position
      };
    }
  }
});