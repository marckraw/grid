import { type AgentConfig } from "./agent-config.schemas.js";
import { createBaseAgent } from "../agents/BaseAgent.js";
import {
  type Agent,
  type AgentResponse,
  type AgentActInput,
} from "../types/agent.types.js";
import { type LLMService } from "../types/llm.types.js";
import { type Tool, prepareToolsForSDK } from "../types/tool.types.js";
import { type ToolExecutor } from "../services/tool-executor.service.js";

// Custom handler types for hooks
export interface CustomHandlers {
  beforeAct?: (
    input: AgentActInput,
    config: AgentConfig
  ) => Promise<AgentActInput>;
  afterResponse?: (
    response: AgentResponse,
    input: AgentActInput
  ) => Promise<AgentResponse>;
  onError?: (
    error: Error,
    attempt: number
  ) => Promise<void | { retry: boolean; modifiedInput?: AgentActInput }>;
  validateResponse?: (
    response: AgentResponse
  ) => Promise<{ isValid: boolean; errors?: string[] }>;
  transformInput?: (input: AgentActInput) => Promise<AgentActInput>;
  transformOutput?: (output: AgentResponse) => Promise<AgentResponse>;
}

// Additional tools that can be passed
export interface AdditionalTools {
  local?: Tool<any, any>[];
  mcp?: any[]; // MCP tools will be adapted
  agents?: any[]; // Agent tools will be adapted
}

export interface CreateConfigurableAgentOptions {
  config: AgentConfig;
  customHandlers?: CustomHandlers;
  additionalTools?: AdditionalTools;
  llmService?: LLMService;
  toolExecutor?: ToolExecutor;
}

/**
 * Creates an agent based on configuration with optional custom handlers
 */
export const createConfigurableAgent = ({
  config,
  customHandlers = {},
  additionalTools = {},
  llmService,
  toolExecutor,
}: CreateConfigurableAgentOptions): Agent => {
  // Create base agent with optional LLM service
  const base = createBaseAgent({
    id: config.id,
    type: config.type,
    llmService,
  });

  // Prepare available tools
  const availableTools: Tool<any, any>[] = [
    ...(additionalTools.local || []),
    // TODO: Adapt MCP and agent tools
  ];

  return {
    ...base,
    id: config.id,
    type: config.type,
    availableTools: availableTools.map((t) => t.name),

    // Enhanced metadata with config info
    getMetadata: () => ({
      ...config.metadata,
      configVersion: config.version,
      orchestration: config.orchestration,
      hooks: Object.keys(customHandlers),
    }),

    // Main act method with all enhancements
    act: async (input) => {
      let processedInput = input;
      let attempt = 0;
      const maxRetries = config.behavior?.maxRetries || 3;

      // Execute with retry logic
      while (attempt < maxRetries) {
        attempt++;

        try {
          // Hook: transformInput
          if (customHandlers.transformInput) {
            processedInput = await customHandlers.transformInput(
              processedInput
            );
          }

          // Hook: beforeAct
          if (customHandlers.beforeAct) {
            processedInput = await customHandlers.beforeAct(
              processedInput,
              config
            );
          }

          // Prepare messages with system prompt
          const messages = [
            { role: "system" as const, content: config.prompts.system },
            ...processedInput.messages,
          ];

          // Tools are already in Vercel AI SDK format
          const formattedTools = availableTools;

          // Call LLM based on response format
          let response: AgentResponse;

          try {
            // Execute LLM call with tools
            const llmResponse = await base.llmService.runLLM({
              messages,
              tools: formattedTools.length > 0 ? formattedTools : undefined,
              // Add any additional LLM options from config
              ...(config.customConfig?.llmOptions || {}),
            });

            response = llmResponse;
          } catch (llmError) {
            // Hook: onError for LLM errors
            if (customHandlers.onError) {
              const errorResult = await customHandlers.onError(
                llmError as Error,
                attempt
              );
              if (errorResult && errorResult.retry && attempt < maxRetries) {
                if (errorResult.modifiedInput) {
                  processedInput = errorResult.modifiedInput;
                }
                continue; // Retry
              }
            }
            throw llmError;
          }

          // Hook: afterResponse
          if (customHandlers.afterResponse) {
            response = await customHandlers.afterResponse(
              response,
              processedInput
            );
          }

          // Hook: validateResponse
          if (
            customHandlers.validateResponse ||
            config.behavior?.validateResponse
          ) {
            let validationResult;

            if (customHandlers.validateResponse) {
              validationResult = await customHandlers.validateResponse(
                response
              );
            } else {
              // Default validation: ensure response has content
              validationResult = {
                isValid: !!response.content,
                errors: response.content ? [] : ["Response has no content"],
              };
            }

            if (!validationResult.isValid) {
              const validationError = new Error(
                `Response validation failed: ${validationResult.errors?.join(
                  ", "
                )}`
              );

              // Hook: onError for validation errors
              if (customHandlers.onError) {
                const errorResult = await customHandlers.onError(
                  validationError,
                  attempt
                );
                if (errorResult && errorResult.retry && attempt < maxRetries) {
                  if (errorResult.modifiedInput) {
                    processedInput = errorResult.modifiedInput;
                  }
                  continue; // Retry
                }
              }
              throw validationError;
            }
          }

          // Execute tool calls if present and tool executor is provided
          if (
            response.toolCalls &&
            response.toolCalls.length > 0 &&
            toolExecutor
          ) {
            console.log(
              "[createConfigurableAgent:act] tool calls",
              response.toolCalls
            );
            // Execute tools and get responses (ensure args is always present)
            const toolCallsWithArgs = response.toolCalls.map((tc) => ({
              ...tc,
              args: tc.args ?? {},
            }));
            const toolResponses = await toolExecutor.executeToolCalls(
              toolCallsWithArgs,
              {
                agentId: config.id,
              }
            );

            console.log(
              "[createConfigurableAgent:act] tool responses",
              toolResponses
            );

            // Add tool responses to the response metadata
            response = {
              ...response,
              metadata: {
                ...(response.metadata || {}),
                toolResponses,
              },
            };
          }

          // Hook: transformOutput
          if (customHandlers.transformOutput) {
            response = await customHandlers.transformOutput(response);
          }

          return response;
        } catch (error) {
          // Final error handling
          if (attempt >= maxRetries) {
            // Hook: onError for final failure
            if (customHandlers.onError) {
              await customHandlers.onError(error as Error, attempt);
            }

            // If we have a fallback prompt, try it
            if (config.prompts.fallback) {
              const fallbackMessages = [
                { role: "system" as const, content: config.prompts.fallback },
                ...input.messages,
              ];

              try {
                const fallbackResponse = await base.llmService.runLLM({
                  messages: fallbackMessages,
                });

                return fallbackResponse;
              } catch (fallbackError) {
                // Fallback also failed
                throw new Error(
                  `Agent execution failed after ${attempt} attempts. Original error: ${error}. Fallback error: ${fallbackError}`
                );
              }
            }

            throw error;
          }
        }
      }

      // Should never reach here
      throw new Error("Unexpected end of retry loop");
    },
  };
};
