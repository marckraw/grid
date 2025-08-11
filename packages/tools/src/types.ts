import { Tool } from "ai";

/**
 * Standard Grid tool format with definition and both execution modes
 */
export interface GridTool {
  withExecute: Tool;
  withoutExecute: Tool;
  definition: Tool & { name: string };
}
