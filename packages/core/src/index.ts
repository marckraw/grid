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
export type {
  AgentFlowContext,
  ChatMessage,
  ProgressMessage,
  ProgressMessageType,
  LLMService,
  LLMServiceOptions,
} from "./types/index.js";
export { createProgressMessage } from "./types/progress.types.js";

// Export tool types
export type { Tool, ToolResult } from "./types/tool.types.js";
export type { ToolCall } from "./types/llm.types.js";
export {
  createTool,
  createNamedTool,
  isTool,
  prepareToolsForSDK,
} from "./types/tool.types.js";
export { createToolExecutor } from "./services/tool-executor.service.js";
export type { ToolExecutor } from "./services/tool-executor.service.js";

// Export hook types
export type { CustomHandlers } from "./factories/configurable-agent.factory.js";

// Export conversation primitives - atomic level
export { createConversationHistory } from "./services/conversation-history.service.js";
export type {
  ConversationHistory,
  ConversationHistoryOptions,
} from "./services/conversation-history.service.js";

export { createConversationContext } from "./services/conversation-context.service.js";
export type {
  ConversationContext,
  ConversationContextOptions,
} from "./services/conversation-context.service.js";

// Export conversation primitives - composed level
export { createConversationManager } from "./services/conversation-manager.service.js";
export type {
  ConversationManager,
  ConversationManagerOptions,
} from "./services/conversation-manager.service.js";

// Export conversation primitives - organism level
export { createConversationLoop } from "./services/conversation-loop.service.js";
export type {
  ConversationLoop,
  ConversationLoopOptions,
  SendMessageResult,
} from "./services/conversation-loop.service.js";

// Export conversation flow - enhanced organism level with progress streaming
export { createConversationFlow } from "./services/conversation-flow.service.js";
export type {
  ConversationFlow,
  ConversationFlowOptions,
} from "./services/conversation-flow.service.js";

export { baseLLMService } from "./services/base.llm.service.js";
export type { BaseLLMServiceConfig } from "./services/base.llm.service.js";

// Export observability primitives
export { createObservabilityService } from "./services/observability.service.js";
export type { ObservabilityService } from "./services/observability.service.js";

export type {
  TraceContext,
  SpanContext,
  TraceEvent,
  GenerationTrace,
  ToolTrace,
  SessionInfo,
  ObservabilityProvider,
  ObservabilityConfig,
  TracedService,
} from "./types/observability.types.js";

export { 
  ObservabilityConfigSchema,
  isTracedService,
} from "./types/observability.types.js";

// Export observability providers
export { createLangfuseProvider } from "./providers/langfuse.provider.js";
export type { LangfuseProviderConfig } from "./providers/langfuse.provider.js";

// Export observability factories
export { 
  createTracedService,
  createTracedServices as createMultipleTracedServices,
  traced,
} from "./factories/observability-decorator.factory.js";
export type { TracedServiceOptions } from "./factories/observability-decorator.factory.js";

export { createTracedServices } from "./factories/traced-services.factory.js";
export type { 
  TracedServicesConfig,
  TracedServices,
} from "./factories/traced-services.factory.js";
