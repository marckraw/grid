import { type AgentConfig } from "./agent-config.schemas.js";
import { createBaseAgent } from "../agents/BaseAgent.js";
import {
  type Agent,
  type AgentResponse,
  type AgentActInput,
} from "../types/agent.types.js";
import { type LLMService } from "../types/llm.types.js";
import { type ToolExecutor } from "../services/tool-executor.service.js";
import type { ProgressMessage } from "../types/progress.types.js";
import type {
  VoiceService,
  AudioResult,
  TranscriptionResult,
  VoiceOptions,
  TranscribeOptions,
} from "../types/voice.types.js";

interface BaseHandlerOptions {
  sendUpdate: (data: ProgressMessage) => Promise<void>;
}

interface BeforeActOptions extends BaseHandlerOptions {
  input: AgentActInput;
  config: AgentConfig;
}

interface AfterResponseOptions extends BaseHandlerOptions {
  response: AgentResponse;
  input: AgentActInput;
}

interface OnErrorOptions extends BaseHandlerOptions {
  error: Error;
  attempt: number;
}

interface ValidateResponseOptions extends BaseHandlerOptions {
  response: AgentResponse;
}

interface TransformInputOptions extends BaseHandlerOptions {
  input: AgentActInput;
}

interface TransformOutputOptions extends BaseHandlerOptions {
  output: AgentResponse;
}

// Custom handler types for hooks
export interface CustomHandlers {
  beforeAct?: (options: BeforeActOptions) => Promise<AgentActInput>;
  afterResponse?: (options: AfterResponseOptions) => Promise<AgentResponse>;
  onError?: (
    options: OnErrorOptions
  ) => Promise<void | { retry: boolean; modifiedInput?: AgentActInput }>;
  validateResponse?: (
    options: ValidateResponseOptions
  ) => Promise<{ isValid: boolean; errors?: string[] }>;
  transformInput?: (options: TransformInputOptions) => Promise<AgentActInput>;
  transformOutput?: (options: TransformOutputOptions) => Promise<AgentResponse>;
}

export interface CreateConfigurableAgentOptions {
  config: AgentConfig;
  customHandlers?: CustomHandlers;
  llmService?: LLMService;
  toolExecutor?: ToolExecutor;
  voiceService?: VoiceService;
  // observability?: ObservabilityService; // Removed - using simple Langfuse integration
}

/**
 * Creates an agent based on configuration with optional custom handlers
 */
export const createConfigurableAgent = ({
  config,
  customHandlers = {},
  llmService,
  toolExecutor,
  voiceService,
}: CreateConfigurableAgentOptions): Agent => {
  // Create base agent with optional LLM service
  const base = createBaseAgent({
    id: config.id,
    type: config.type,
    llmService,
  });

  console.log("[createConfigurableAgent] - config");
  console.log(config);

  console.log("LLM service");
  console.log(llmService);

  console.log("Base llm service:  ");
  console.log(base.llmService);

  console.log("Zmieniamy kuuuurwa!");

  // Prepare available tools from config
  const availableTools: Record<string, any> = {
    ...(config.tools?.custom || {}),
    ...(config.tools?.mcp || {}),
    // TODO: Adapt builtin and agent tools
  };

  console.log("These are available tools");
  console.log(availableTools);

  let sendUpdate: (data: ProgressMessage) => Promise<void> = async (data) => {
    console.log("sendUpdate", data);
  };
  /**
   * Set the global send function for streaming updates
   */
  const setSendUpdate = (sendFn: (data: ProgressMessage) => Promise<void>) => {
    sendUpdate = sendFn;
  };

  return {
    ...base,
    id: config.id,
    type: config.type,
    setSendUpdate,
    availableTools: Object.keys(availableTools),
    // Enhanced metadata with config info
    getMetadata: () => ({
      ...config.metadata,
      configVersion: config.version,
      orchestration: config.orchestration,
      hooks: Object.keys(customHandlers),
    }),

    // Main act method with all enhancements
    act: async (input) => {
      // Tracing is now handled by Langfuse integration in baseLLMService
      let processedInput = input;
      let attempt = 0;
      const maxRetries = config.behavior?.maxRetries || 3;

      // Execute with retry logic
      while (attempt < maxRetries) {
        attempt++;

        try {
          // Hook: transformInput
          if (customHandlers.transformInput) {
            processedInput = await customHandlers.transformInput({
              input: processedInput,
              sendUpdate,
            });
          }

          // Hook: beforeAct
          if (customHandlers.beforeAct) {
            processedInput = await customHandlers.beforeAct({
              input: processedInput,
              config,
              sendUpdate,
            });
          }

          // Prepare initial messages with system prompt
          let workingMessages = [
            { role: "system" as const, content: config.prompts.system },
            ...processedInput.messages,
          ];

          // Internal loop for handling tool calls
          let response: AgentResponse = { role: "assistant", content: null };
          const maxToolRounds = 3; // Configurable limit for tool rounds
          let toolRound = 0;

          while (toolRound < maxToolRounds) {
            toolRound++;
            sendUpdate({
              type: "thinking",
              content: "Thinking",
            });

            try {
              console.log("Executing LLM call with tools");
              console.log(availableTools);
              console.log(workingMessages);

              // Execute LLM call with tools
              const llmResponse = await base.llmService.runLLM({
                messages: workingMessages,
                tools: availableTools,
                sendUpdate,
                traceContext: {
                  sessionId: input.context?.sessionId,
                  metadata: {
                    ...input.context?.metadata,
                  },
                },
                // Add any additional LLM options from config
                ...(config.customConfig?.llmOptions || {}),
              });

              response = llmResponse;
            } catch (llmError) {
              // Hook: onError for LLM errors
              if (customHandlers.onError) {
                const errorResult = await customHandlers.onError({
                  error: llmError as Error,
                  attempt,
                  sendUpdate,
                });
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
              response = await customHandlers.afterResponse({
                response,
                input: processedInput,
                sendUpdate,
              });
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
              validationResult = await customHandlers.validateResponse({
                response,
                sendUpdate,
              });
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
                const errorResult = await customHandlers.onError({
                  error: validationError,
                  attempt,
                  sendUpdate,
                });
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
            response = await customHandlers.transformOutput({
              output: response,
              sendUpdate,
            });
          }

          // Tracing handled by Langfuse integration

          return response;
        } catch (error) {
          // Error tracking can be added to Langfuse if needed

          // Final error handling
          if (attempt >= maxRetries) {
            // Hook: onError for final failure
            if (customHandlers.onError) {
              await customHandlers.onError({
                error: error as Error,
                attempt,
                sendUpdate,
              });
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
                  traceContext: {
                    sessionId: input.context?.sessionId,
                    metadata: {
                      ...input.context?.metadata,
                    },
                  },
                });

                return fallbackResponse;
              } catch (fallbackError) {
                // Fallback also failed
                throw new Error(
                  `Agent execution failed after ${attempt} attempts. Original error: ${error}. Fallback error: ${fallbackError}`
                );
              }
            }

            // End trace on final error
            // Tracing handled by Langfuse integration

            throw error;
          }
        }
      }

      // End trace if we somehow exit the loop
      // Tracing handled by Langfuse integration

      // Should never reach here
      throw new Error("Unexpected end of retry loop");
    },

    // Voice capabilities (if voice service is provided)
    voiceService,

    // Voice methods
    speak: voiceService
      ? async (text: string, options?: VoiceOptions): Promise<AudioResult> => {
          sendUpdate({ type: "speaking_start", content: text });

          try {
            const audio = await voiceService.synthesize(text, {
              ...config.voice?.defaultOptions,
              ...options,
              voiceId: options?.voiceId || config.voice?.voiceId,
            });

            sendUpdate({ type: "speaking_complete", content: text });
            return audio;
          } catch (error) {
            sendUpdate({
              type: "error",
              content: `Voice synthesis failed: ${error}`,
            });
            throw error;
          }
        }
      : undefined,

    listen: voiceService
      ? async (options?: TranscribeOptions): Promise<TranscriptionResult> => {
          sendUpdate({ type: "listening_start", content: "Listening..." });

          throw new Error(
            "Listen method requires audio input - implement in your application layer"
          );
        }
      : undefined,

    hasVoice: () => !!voiceService,
    canSpeak: () => !!voiceService?.synthesize,
    canListen: () => !!voiceService?.transcribe,
  };
};
