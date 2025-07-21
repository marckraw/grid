/**
 * @mrck-labs/grid-tools - Ready-to-use tools for Grid LLM orchestration
 */

// Export individual tools
export { calculatorTool } from "./tools/calculator.tool";
export { currentTimeTool } from "./tools/current-time.tool";
export { readUrlTool, createReadUrlTool } from "./tools/read-url.tool";

// Export all tools as a collection for convenience
import { calculatorTool } from "./tools/calculator.tool";
import { currentTimeTool } from "./tools/current-time.tool";
import { readUrlTool } from "./tools/read-url.tool";

export const allTools = {
  calculator: calculatorTool,
  getCurrentTime: currentTimeTool,
  readUrl: readUrlTool,
};