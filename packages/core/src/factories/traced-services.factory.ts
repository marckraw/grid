import { baseLLMService, type BaseLLMServiceConfig } from "../services/base.llm.service.js";
import { createToolExecutor } from "../services/tool-executor.service.js";
import { createConversationHistoryService } from "../services/conversation-history.service.js";
import { createConversationContextService } from "../services/conversation-context.service.js";
import { createConversationFlow } from "../services/conversation-flow.service.js";
import { createObservabilityService } from "../services/observability.service.js";
import { createTracedService } from "./observability-decorator.factory.js";
import type { ObservabilityConfig } from "../types/observability.types.js";
import type { Tool } from "ai";

/**
 * Configuration for creating traced services
 */
export interface TracedServicesConfig {
  observability: ObservabilityConfig;
  llm?: BaseLLMServiceConfig;
  tools?: Tool<any, any>[];
}

/**
 * Create all Grid services with observability enabled
 * 
 * This factory creates traced versions of all core Grid services,
 * automatically adding spans and events for monitoring.
 */
export const createTracedServices = (config: TracedServicesConfig) => {
  // Create observability service first
  const observabilityService = createObservabilityService(config.observability);

  // Create base services
  const llmService = baseLLMService({
    ...config.llm,
    observability: observabilityService,
  });
  const toolExecutor = createToolExecutor({ observability: observabilityService });
  const conversationHistory = createConversationHistoryService();
  const conversationContext = createConversationContextService();
  
  // Create traced versions with proper span attributes
  const tracedLLMService = createTracedService(
    llmService,
    observabilityService,
    {
      serviceName: "LLMService",
      defaultSpanAttributes: {
        component: "llm",
        serviceType: "core",
      },
      methodsToTrace: ["runLLM", "runLLMWithJSONResponse"],
    }
  );

  const tracedToolExecutor = createTracedService(
    toolExecutor,
    observabilityService,
    {
      serviceName: "ToolExecutor",
      defaultSpanAttributes: {
        component: "tools",
        serviceType: "core",
      },
      methodsToTrace: ["executeTool", "executeTools"],
    }
  );

  const tracedConversationHistory = createTracedService(
    conversationHistory,
    observabilityService,
    {
      serviceName: "ConversationHistory",
      defaultSpanAttributes: {
        component: "conversation",
        serviceType: "storage",
      },
      methodsToExclude: ["getMessages", "getLastMessage"], // Don't trace getters
    }
  );

  const tracedConversationContext = createTracedService(
    conversationContext,
    observabilityService,
    {
      serviceName: "ConversationContext",
      defaultSpanAttributes: {
        component: "conversation",
        serviceType: "context",
      },
      methodsToExclude: ["getContext", "getCurrentTool"], // Don't trace getters
    }
  );

  // Create conversation flow with traced dependencies
  const conversationFlow = createConversationFlow({
    agent: {
      id: "traced-agent",
      name: "Traced Agent",
      model: config.llm?.defaultModel || "gpt-4",
      systemPrompt: "You are a helpful assistant.",
      tools: config.tools || [],
      toolChoice: "auto",
    },
    llmService: tracedLLMService,
    toolExecutor: tracedToolExecutor,
    conversationHistory: tracedConversationHistory,
    conversationContext: tracedConversationContext,
    onProgress: config.observability.debug 
      ? async (msg) => console.log(`[Progress] ${msg.type}: ${msg.content}`)
      : undefined,
  });

  const tracedConversationFlow = createTracedService(
    conversationFlow,
    observabilityService,
    {
      serviceName: "ConversationFlow",
      defaultSpanAttributes: {
        component: "conversation",
        serviceType: "orchestration",
      },
      methodsToTrace: ["processMessage", "processStreamingMessage"],
    }
  );

  return {
    // Core services
    observabilityService,
    llmService: tracedLLMService,
    toolExecutor: tracedToolExecutor,
    conversationHistory: tracedConversationHistory,
    conversationContext: tracedConversationContext,
    conversationFlow: tracedConversationFlow,

    // Helper to create root traces for conversations
    async startConversation(sessionId?: string, userId?: string) {
      if (sessionId || userId) {
        observabilityService.setSession({
          sessionId: sessionId || crypto.randomUUID(),
          userId,
          metadata: {
            startTime: new Date().toISOString(),
          },
        });
      }

      return observabilityService.startTrace("conversation", {
        sessionId,
        userId,
      });
    },

    // Helper to end conversation trace
    async endConversation(traceContext: any) {
      return observabilityService.endTrace(traceContext);
    },

    // Expose flush for graceful shutdown
    async flush() {
      return observabilityService.flush();
    },
  };
};

/**
 * Type for the traced services bundle
 */
export type TracedServices = ReturnType<typeof createTracedServices>;