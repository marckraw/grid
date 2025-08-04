/**
 * @grid/core - Core primitives for LLM orchestration and agentic workflows
 */

// Export agent-flow service and types
export { agentFlowService } from "./services/agent-flow.service.js";
export { createConfigurableAgent } from "./factories/configurable-agent.factory.js";
export { transformMessagesForAI, getLastUserMessage } from "./utils.js";
export type * from "./types/index.js";
export * from "./types/index.js";

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
  GroupedManagerHandlers,
} from "./services/conversation-manager.service.js";

// Export conversation primitives - organism level
export { createConversationLoop } from "./services/conversation-loop.service.js";
export type {
  ConversationLoop,
  ConversationLoopOptions,
  GroupedHandlers,
  SendMessageResult,
  HistoryMode,
} from "./services/conversation-loop.service.js";

export { baseLLMService } from "./services/base.llm.service.js";
export type { BaseLLMServiceConfig } from "./services/base.llm.service.js";

export { baseVoiceService } from "./services/base.voice.service.js";
export type {
  BaseVoiceServiceConfig,
  VoiceServiceUtils,
} from "./services/base.voice.service.js";

export { elevenlabsVoiceService } from "./services/ElevenLabsService/elevenlabs.voice.service.js";
export type { ElevenLabsVoiceServiceConfig } from "./services/ElevenLabsService/elevenlabs.voice.service.js";

export {
  createLangfuseService,
  langfuseService,
  type LangfuseService,
} from "./services/LangfuseService/langfuse.service.js";

// Prompts and prompts helpers
export { currentDatePrompt } from "./prompts/current-date.js";

// Export memory services
export { createSimpleSTMService } from "./services/memory/stm.service.js";
export { createMTMService } from "./services/memory/mtm.service.js";
export type {
  STMService,
  STMConfig,
  MemoryEvent,
  MTMService,
  MTMConfig,
  MTMSummary,
} from "./services/memory/memory.types.js";

// Export memory tools
export {
  createMemoryTools,
  getMemoryToolsArray,
} from "./tools/memory.tools.js";
