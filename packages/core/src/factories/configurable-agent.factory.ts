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

export interface CreateConfigurableAgentOptions {
  config: AgentConfig;
  customHandlers?: CustomHandlers;
  llmService?: LLMService;
  toolExecutor?: ToolExecutor;
}

/**
 * Creates an agent based on configuration with optional custom handlers
 */
export const createConfigurableAgent = ({
  config,
  customHandlers = {},
  llmService,
  toolExecutor,
}: CreateConfigurableAgentOptions): Agent => {
  // Create base agent with optional LLM service
  const base = createBaseAgent({
    id: config.id,
    type: config.type,
    llmService,
  });

  // Prepare available tools from config
  const availableTools: Tool<any, any>[] = [
    ...(config.tools?.custom || []),
    ...(config.tools?.mcp || []),
    // TODO: Adapt builtin and agent tools
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

          // Prepare initial messages with system prompt
          let workingMessages = [
            { role: "system" as const, content: config.prompts.system },
            ...processedInput.messages,
          ];

          // Tools are already in Vercel AI SDK format
          const formattedTools = availableTools;

          // Internal loop for handling tool calls
          let response: AgentResponse = { role: "assistant", content: null };
          const maxToolRounds = 3; // Configurable limit for tool rounds
          let toolRound = 0;

          while (toolRound < maxToolRounds) {
            toolRound++;

            try {
              // Execute LLM call with tools
              const llmResponse = await base.llmService.runLLM({
                messages: workingMessages,
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
                  continue; // Retry outer loop
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

            // If no tool calls, we're done
            if (!response.toolCalls || response.toolCalls.length === 0) {
              break;
            }

            // If we have a tool executor, use it (custom mode)
            // Otherwise, assume the LLM service handled it (vercel-native mode)
            if (toolExecutor) {
              // Execute tool calls with our tool executor
              console.log("toolExecutor: tool calls stuff");
              console.log(response.toolCalls);
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

              console.log("toolResponses", toolResponses);

              // Add assistant message with tool calls to working messages
              workingMessages.push({
                role: "assistant" as const,
                content: response.content,
                toolCalls: response.toolCalls,
              });

              // Add tool responses to working messages
              for (const toolResponse of toolResponses) {
                workingMessages.push({
                  role: "tool" as const,
                  content: JSON.stringify(toolResponse.result),
                  tool_call_id: toolResponse.toolCallId,
                  tool_name: toolResponse.toolName,
                });
              }

              // Add tool responses to the response metadata
              response = {
                ...response,
                metadata: {
                  ...(response.metadata || {}),
                  toolResponses,
                },
              };

              // Continue loop to get final response from LLM
            } else {
              // No tool executor, assume LLM service handled it
              break;
            }
          }

          // Hook: validateResponse (only validate final response)
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
