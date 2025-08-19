import { z } from "zod";
import { tool } from "ai";
import type { GridTool } from "./types.js";

/**
 * Data format converter tool
 */
export const toolDefinition = {
  name: "dataConverter",
  description: "Convert between different data formats (JSON, CSV, TSV)",
  inputSchema: z.object({
    from: z.enum(["json", "csv", "tsv"]).describe("Source format"),
    to: z.enum(["json", "csv", "tsv"]).describe("Target format"),
    data: z.string().describe("Data to convert"),
    options: z
      .object({
        headers: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include headers in CSV/TSV output"),
        delimiter: z
          .string()
          .optional()
          .describe("Custom delimiter for CSV (default: comma)"),
      })
      .optional(),
  }),
};

export const dataConverterToolWithoutExecute = tool(toolDefinition);

export const dataConverterToolWithExecute = tool({
  ...toolDefinition,
  execute: async ({ from, to, data, options = {} }) => {
    try {
      // Same format - just return the data
      if (from === to) {
        return {
          result: data,
          message: "Source and target formats are the same",
        };
      }

      let parsedData: any;

      // Parse input based on format
      switch (from) {
        case "json":
          parsedData = JSON.parse(data);
          if (!Array.isArray(parsedData)) {
            // Convert single object to array for CSV/TSV conversion
            parsedData = [parsedData];
          }
          break;

        case "csv":
          parsedData = parseDelimited(data, ",");
          break;

        case "tsv":
          parsedData = parseDelimited(data, "\t");
          break;
      }

      // Convert to target format
      let result: string;

      switch (to) {
        case "json":
          result = JSON.stringify(parsedData, null, 2);
          break;

        case "csv":
          result = toDelimited(
            parsedData,
            options.delimiter || ",",
            options.headers ?? true
          );
          break;

        case "tsv":
          result = toDelimited(parsedData, "\t", options.headers ?? true);
          break;

        default:
          return { error: `Unsupported target format: ${to}` };
      }

      return {
        result,
        from,
        to,
        records: Array.isArray(parsedData) ? parsedData.length : 1,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Conversion failed",
        from,
        to,
        hint: getErrorHint(from, error),
      };
    }
  },
});

// Helper function to parse CSV/TSV
function parseDelimited(data: string, delimiter: string): any[] {
  const lines = data.trim().split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim());
    const obj: any = {};

    headers.forEach((header, index) => {
      const value = values[index] || "";
      // Try to parse numbers
      const num = Number(value);
      obj[header] = isNaN(num) || value === "" ? value : num;
    });

    result.push(obj);
  }

  return result;
}

// Helper function to convert to CSV/TSV
function toDelimited(
  data: any[],
  delimiter: string,
  includeHeaders: boolean
): string {
  if (!Array.isArray(data) || data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const lines = [];

  if (includeHeaders) {
    lines.push(headers.join(delimiter));
  }

  for (const obj of data) {
    const values = headers.map((header) => {
      const value = obj[header];
      // Quote values containing delimiter, quotes, or newlines
      if (
        typeof value === "string" &&
        (value.includes(delimiter) ||
          value.includes('"') ||
          value.includes("\n"))
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value?.toString() || "";
    });
    lines.push(values.join(delimiter));
  }

  return lines.join("\n");
}

// Helper function to provide error hints
function getErrorHint(format: string, error: unknown): string {
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : "";

  if (format === "json" && errorMsg.includes("json")) {
    return "Make sure the JSON is valid. Common issues: missing quotes, trailing commas, or incorrect brackets.";
  }

  if ((format === "csv" || format === "tsv") && errorMsg.includes("split")) {
    return "Make sure the CSV/TSV data has consistent columns and proper line breaks.";
  }

  return "Check that the input data matches the specified format.";
}

export const dataConverterTool: GridTool = {
  withExecute: dataConverterToolWithExecute,
  withoutExecute: dataConverterToolWithoutExecute,
  definition: toolDefinition,
};
