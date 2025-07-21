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
  ConversationHistoryHandlers,
} from "./services/conversation-history.service.js";

export { createConversationContext } from "./services/conversation-context.service.js";
export type {
  ConversationContext,
  ConversationContextOptions,
  ConversationContextHandlers,
} from "./services/conversation-context.service.js";

// Export conversation primitives - composed level
export { createConversationManager } from "./services/conversation-manager.service.js";
export type {
  ConversationManager,
  ConversationManagerOptions,
  ConversationManagerHandlers,
} from "./services/conversation-manager.service.js";

// Export conversation primitives - organism level
export { createConversationLoop } from "./services/conversation-loop.service.js";
export type {
  ConversationLoop,
  ConversationLoopOptions,
  GroupedHandlers,
  SendMessageResult,
} from "./services/conversation-loop.service.js";


export { baseLLMService } from "./services/base.llm.service.js";
export type { BaseLLMServiceConfig } from "./services/base.llm.service.js";

export {
  createLangfuseService,
  langfuseService,
  type LangfuseService,
} from "./services/LangfuseService/langfuse.service.js";

