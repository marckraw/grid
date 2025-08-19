/**
 * @mrck-labs/grid-tools - Ready-to-use tools for Grid LLM orchestration
 */

// Export the GridTool type
export type { GridTool } from "./types.js";

// Export individual tools - now each tool contains all versions
export { calculatorTool } from "./calculator.tool.js";
export { currentTimeTool } from "./current-time.tool.js";
export { readUrlTool, createReadUrlTool } from "./read-url.tool.js";
export { randomNumberTool } from "./random-number.tool.js";
export { stringUtilsTool } from "./string-utils.tool.js";
export { jsonFormatterTool } from "./json-formatter.tool.js";
export { systemInfoTool } from "./system-info.tool.js";
export { delayTool } from "./delay.tool.js";
export { hashTool } from "./hash.tool.js";
export { dataConverterTool } from "./data-converter.tool.js";
export { createImageTool } from "./create-image.tool.js";
export { getTools } from "./get-tool.js";

// Export all tools as a collection for convenience
import { calculatorTool } from "./calculator.tool.js";
import { currentTimeTool } from "./current-time.tool.js";
import { readUrlTool } from "./read-url.tool.js";
import { randomNumberTool } from "./random-number.tool.js";
import { stringUtilsTool } from "./string-utils.tool.js";
import { jsonFormatterTool } from "./json-formatter.tool.js";
import { systemInfoTool } from "./system-info.tool.js";
import { delayTool } from "./delay.tool.js";
import { hashTool } from "./hash.tool.js";
import { dataConverterTool } from "./data-converter.tool.js";
import { createImageTool } from "./create-image.tool.js";

export const allTools = {
  calculator: calculatorTool.withExecute,
  getCurrentTime: currentTimeTool.withExecute,
  readUrl: readUrlTool.withExecute,
  randomNumber: randomNumberTool.withExecute,
  stringUtils: stringUtilsTool.withExecute,
  jsonFormatter: jsonFormatterTool.withExecute,
  systemInfo: systemInfoTool.withExecute,
  delay: delayTool.withExecute,
  hash: hashTool.withExecute,
  dataConverter: dataConverterTool.withExecute,
  createImage: createImageTool.withExecute,
};

// Export all tools without execute for custom ToolExecutor usage
export const allToolsWithoutExecute = {
  calculator: calculatorTool.withoutExecute,
  getCurrentTime: currentTimeTool.withoutExecute,
  readUrl: readUrlTool.withoutExecute,
  randomNumber: randomNumberTool.withoutExecute,
  stringUtils: stringUtilsTool.withoutExecute,
  jsonFormatter: jsonFormatterTool.withoutExecute,
  systemInfo: systemInfoTool.withoutExecute,
  delay: delayTool.withoutExecute,
  hash: hashTool.withoutExecute,
  dataConverter: dataConverterTool.withoutExecute,
  createImage: createImageTool.withoutExecute,
};

// Export all tool definitions for reference
export const allToolDefinitions = {
  calculator: calculatorTool.definition,
  getCurrentTime: currentTimeTool.definition,
  readUrl: readUrlTool.definition,
  randomNumber: randomNumberTool.definition,
  stringUtils: stringUtilsTool.definition,
  jsonFormatter: jsonFormatterTool.definition,
  systemInfo: systemInfoTool.definition,
  delay: delayTool.definition,
  hash: hashTool.definition,
  dataConverter: dataConverterTool.definition,
  createImage: createImageTool.definition,
};
