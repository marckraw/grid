/**
 * @mrck-labs/grid-tools - Ready-to-use tools for Grid LLM orchestration
 */

// Export the GridTool type
export { GridTool } from "./types";

// Export individual tools - now each tool contains all versions
export { calculatorTool } from "./tools/calculator.tool";
export { currentTimeTool } from "./tools/current-time.tool";
export { readUrlTool, createReadUrlTool } from "./tools/read-url.tool";
export { randomNumberTool } from "./tools/random-number.tool";
export { stringUtilsTool } from "./tools/string-utils.tool";
export { jsonFormatterTool } from "./tools/json-formatter.tool";
export { systemInfoTool } from "./tools/system-info.tool";
export { delayTool } from "./tools/delay.tool";
export { hashTool } from "./tools/hash.tool";
export { dataConverterTool } from "./tools/data-converter.tool";
export { createImageTool } from "./tools/create-image.tool";

// Export all tools as a collection for convenience
import { calculatorTool } from "./tools/calculator.tool";
import { currentTimeTool } from "./tools/current-time.tool";
import { readUrlTool } from "./tools/read-url.tool";
import { randomNumberTool } from "./tools/random-number.tool";
import { stringUtilsTool } from "./tools/string-utils.tool";
import { jsonFormatterTool } from "./tools/json-formatter.tool";
import { systemInfoTool } from "./tools/system-info.tool";
import { delayTool } from "./tools/delay.tool";
import { hashTool } from "./tools/hash.tool";
import { dataConverterTool } from "./tools/data-converter.tool";
import { createImageTool } from "./tools/create-image.tool";

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