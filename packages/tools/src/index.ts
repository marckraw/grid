/**
 * @mrck-labs/grid-tools - Ready-to-use tools for Grid LLM orchestration
 */

// Export individual tools
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

export const allTools = {
  calculator: calculatorTool,
  getCurrentTime: currentTimeTool,
  readUrl: readUrlTool,
  randomNumber: randomNumberTool,
  stringUtils: stringUtilsTool,
  jsonFormatter: jsonFormatterTool,
  systemInfo: systemInfoTool,
  delay: delayTool,
  hash: hashTool,
  dataConverter: dataConverterTool,
};