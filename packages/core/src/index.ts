/**
 * @grid/core - Core primitives for LLM orchestration and agentic workflows
 */

// Export agent-flow service and types
export { agentFlowService } from "./services/agent-flow.service.js";
export { createConfigurableAgent } from "./factories/configurable-agent.factory.js";
export { transformMessagesForAI } from "./transformAIMessages.js";
export type {
  AgentFlowContext,
  ChatMessage,
  ProgressMessage,
  ProgressMessageType,
  LLMService,
  LLMServiceOptions,
} from "./types/index.js";

// Export tool types
export type { Tool, ToolResult } from "./types/tool.types.js";
export type { ToolCall } from "./types/llm.types.js";
export { createNamedTool } from "./types/tool.types.js";
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

// Export Langfuse utilities for simple tracing
export {
  shutdownLangfuse,
  startTrace,
  endTrace,
} from "./services/langfuse.service.js";
export type { LangfuseTraceContext } from "./services/langfuse.service.js";
