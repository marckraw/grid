import { baseLLMService } from "../services/base.llm.service.js";
import type {
  Agent,
  AgentInput,
  AgentMetadata,
  BaseAgentConfig,
} from "../types/agent.types.js";
import type { LLMService } from "../types/llm.types.js";

export interface BaseAgent extends Omit<Agent, "act" | "sendUpdate"> {
  availableTools: Record<string, any>;
  llmService: LLMService;
}

// Extended BaseAgentConfig to include optional llmService
export interface BaseAgentConfigWithLLM extends BaseAgentConfig {
  llmService?: LLMService;
}

// --- Base Agent ---
export const createBaseAgent = ({
  id,
  type,
  availableTools = {},
  metadata,
  llmService,
}: BaseAgentConfigWithLLM): BaseAgent => {
  // Use provided LLM service or default to baseLLMService
  const llm = llmService || baseLLMService();

  // Default metadata for the agent
  const getMetadata = (): AgentMetadata => {
    return {
      // id:,
      // type: type || "",
      // name: metadata?.name || `${type} Agent`,
      // description: metadata?.description || `A ${type} agent`,
      // capabilities: metadata?.capabilities || [],
      // icon: metadata?.icon || "🤖",
      // version: metadata?.version || "1.0.0",
      // author: metadata?.author || "System",
      ...(metadata as AgentMetadata),
    };
  };

  // Input validation
  const validateInput = (input: AgentInput | string): boolean => {
    if (typeof input === "string") {
      return input.trim().length > 0;
    }

    if (typeof input === "object" && input.messages) {
      return Array.isArray(input.messages) && input.messages.length > 0;
    }

    return false;
  };

  return {
    llmService: llm,
    id,
    type,
    availableTools,
    getMetadata,
    validateInput,
  };
};
