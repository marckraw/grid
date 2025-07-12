/**
 * @grid/core - Core primitives for LLM orchestration and agentic workflows
 */

export const VERSION = "0.0.0";

export type GridConfig = {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
};

export const createGrid = (config: GridConfig = {}) => {
  return {
    config,
    version: VERSION,
  };
};

export const TEST_VERSION = "0.1.0";

// New feature: Helper function for API configuration
export const validateConfig = (config: GridConfig): boolean => {
  if (config.timeout && config.timeout < 0) {
    return false;
  }
  if (config.retries && config.retries < 0) {
    return false;
  }
  return true;
};

// New feature: Default configuration helper
export const getDefaultConfig = (): GridConfig => {
  return {
    timeout: 30000,
    retries: 3,
  };
};

// New utility: Merge configurations
export const mergeConfigs = (
  base: GridConfig,
  override: GridConfig
): GridConfig => {
  return {
    ...base,
    ...override,
  };
};

// Export agent-flow service and types
export { agentFlowService } from "./services/agent-flow.service.js";
export { createConfigurableAgent } from "./factories/configurable-agent.factory.js";
export { createToolExecutor } from "./services/tool-executor.service.js";
export type {
  AgentFlowContext,
  ChatMessage,
  ProgressMessage,
  LLMService,
  LLMServiceOptions,
} from "./types/index.js";

// Export tool types
export type {
  Tool,
  ToolCall,
  ToolResponse,
  ToolResult,
  ToolExecutorOptions,
} from "./types/tool.types.js";
export { createTool, formatToolForLLM } from "./types/tool.types.js";
export type { ToolExecutor } from "./services/tool-executor.service.js";

// Export hook types
export type { CustomHandlers } from "./factories/configurable-agent.factory.js";
