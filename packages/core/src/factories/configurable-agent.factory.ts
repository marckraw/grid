import { type AgentConfig } from "./agent-config.schemas.js";
import { langfuseService } from "../services/LangfuseService/langfuse.service.js";
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
import { createMCPClientService } from "../services/mcp-client.service.js";

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
 * Now async to support MCP client initialization
 */
export const createConfigurableAgent = async ({
  config,
  customHandlers = {},
  llmService,
  toolExecutor,
  voiceService,
}: CreateConfigurableAgentOptions): Promise<Agent> => {
  // Create base agent with optional LLM service
  const base = createBaseAgent({
    id: config.id,
    type: config.type,
    llmService,
  });

  // Initialize MCP clients if configured
  let mcpClientService: any = null;
  let mcpTools: Record<string, any> = {};

  if (config.tools?.mcpServers && config.tools.mcpServers.length > 0) {
    try {
      console.log(
        `[${config.id}] Initializing ${config.tools.mcpServers.length} MCP server(s)...`
      );
      mcpClientService = await createMCPClientService(config.tools.mcpServers);
      mcpTools = await mcpClientService.getAllTools();
      console.log(
        `[${config.id}] ✅ Loaded ${Object.keys(mcpTools).length} MCP tool(s)`
      );
    } catch (error) {
      console.error(
        `[${config.id}] ❌ Failed to initialize MCP clients:`,
        error
      );
      // Continue without MCP tools - don't block agent creation
    }
  }

  // Prepare available tools from config
  const availableTools: Record<string, any> = {
    ...(config.tools?.custom || {}),
    ...(config.tools?.mcp || {}), // Pre-configured MCP tools (if any)
    ...mcpTools, // Tools from MCP servers
    // TODO: Adapt builtin and agent tools
  };

  let sendUpdate: (data: ProgressMessage) => Promise<void> = async (data) => {
    console.log(data);
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
      await sendUpdate({
        type: "unknown",
        content: "Agent starting to act.",
      });

      let processedInput = input;
      let attempt = 0;
      const maxRetries = config.behavior?.maxRetries || 3;

      // === Generic Langfuse tracing for all agents ===
      if (!processedInput.context) processedInput.context = {} as any;
      const ctx = processedInput.context as any;
      const sessionToken = ctx.sessionToken as string;

      // Create execution trace only if not already present for this session
      const existingTrace = langfuseService.getCurrentTrace(sessionToken);
      if (!existingTrace) {
        langfuseService.createExecutionTrace(
          sessionToken,
          config.type,
          processedInput,
          typeof ctx.conversationId === "number"
            ? (ctx.conversationId as number)
            : undefined,
          {
            agentId: config.id,
            agentVersion: config.version,
          }
        );
      }

      // Open a top-level span and emit start event
      langfuseService.createSpanForSession(sessionToken, "agent-act", {
        agentId: config.id,
        agentType: config.type,
      });
      langfuseService.addEventToSession(sessionToken, "agent-start", {
        agentId: config.id,
        agentType: config.type,
      });

      // Determine model from priority chain (outside try-catch for fallback access)
      const modelToUse =
        (processedInput.context as any)?.model || // 1. Runtime override (highest priority)
        config.behavior?.model || // 2. Behavior schema
        config.customConfig?.model || // 3. Custom config
        undefined; // 4. Let LLM service use its default

      const providerToUse =
        (processedInput.context as any)?.provider ||
        config.behavior?.provider ||
        config.customConfig?.provider ||
        undefined;

      // Log model selection for transparency
      if (modelToUse) {
        console.log(
          `🤖 [${config.id}] Using model: ${modelToUse}${
            providerToUse ? ` (provider: ${providerToUse})` : ""
          }`
        );
      }

      // Track validation results for error correction on retries
      let lastValidationResult: { isValid: boolean; errors?: string[] } | null =
        null;

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
          // Add cache control for Anthropic if systemCache is enabled in config
          const shouldCacheSystemPrompt =
            config.prompts.systemCache && providerToUse === "anthropic";

          let workingMessages = [
            {
              role: "system" as const,
              content: config.prompts.system,
              ...(shouldCacheSystemPrompt
                ? {
                    experimental_providerMetadata: {
                      anthropic: {
                        cacheControl: { type: "ephemeral" as const },
                      },
                    },
                  }
                : {}),
            },
            // Transform all input messages to preserve cache control
            ...processedInput.messages.map((msg: any) => {
              // If message has providerOptions.anthropic.cacheControl, transform to AI SDK v5 format
              if (msg.providerOptions?.anthropic?.cacheControl) {
                return {
                  ...msg,
                  experimental_providerMetadata: {
                    anthropic: {
                      cacheControl: msg.providerOptions.anthropic.cacheControl,
                    },
                  },
                };
              }
              return msg;
            }),
          ];

          // Debug: Log cache control settings for Anthropic
          if (providerToUse === "anthropic") {
            console.log(
              `🔧 [${config.id}] System cache: ${
                shouldCacheSystemPrompt ? "ENABLED" : "DISABLED"
              }`
            );
            const cachedMessages = workingMessages.filter(
              (m: any) =>
                m.experimental_providerMetadata?.anthropic?.cacheControl
            );
            console.log(
              `📦 [${config.id}] Messages with cache control: ${cachedMessages.length}`
            );
          }

          // Add error correction message if we have validation errors from previous attempt
          if (
            lastValidationResult &&
            !lastValidationResult.isValid &&
            config.prompts.errorCorrection
          ) {
            console.log(
              `🔄 [${config.id}] Adding error correction message (attempt ${attempt}/${maxRetries})`
            );
            workingMessages.push({
              role: "user" as const,
              content: config.prompts.errorCorrection.replace(
                "{errors}",
                JSON.stringify(
                  lastValidationResult.errors || lastValidationResult
                )
              ),
            });
          }

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
              // Merge static + per-call LLM options
              const mergedLlmOptions = {
                ...(config.customConfig?.llmOptions || {}),
                ...((processedInput.context as any)?.llmOptions || {}),
              } as any;

              // Execute LLM call with tools and optional structured output
              const llmResponse = await base.llmService.runLLM({
                messages: workingMessages,
                tools: availableTools,
                sendUpdate,
                context: processedInput.context,
                model: modelToUse, // Pass model from priority chain
                provider: providerToUse, // Pass provider to determine which AI SDK to use
                traceContext: {
                  sessionId: processedInput.context?.sessionId,
                  metadata: {
                    ...processedInput.context?.metadata,
                    modelUsed: modelToUse,
                    providerUsed: providerToUse,
                  },
                },
                // Add merged LLM options (responseFormat, schema, maxOutputTokens, etc.)
                ...mergedLlmOptions,
                // Ensure behavior.responseFormat is respected if not overridden at runtime
                responseFormat:
                  mergedLlmOptions.responseFormat ??
                  config.behavior?.responseFormat,
                // Allow schema to be supplied via runtime or config.customConfig
                schema:
                  mergedLlmOptions.schema ??
                  (config as any)?.customConfig?.schema,
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
              // Store validation result for error correction on next attempt
              lastValidationResult = validationResult;

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
                  console.log(
                    `🔄 [${config.id}] Retrying (attempt ${
                      attempt + 1
                    }/${maxRetries}) with error feedback...`
                  );
                  continue; // Retry with error correction message
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

          // Close trace on success
          try {
            langfuseService.addEventToSession(sessionToken, "agent-end", {
              toolCalls: response.toolCalls?.length || 0,
            });
            langfuseService.endSpanForSession(sessionToken, "agent-act");
            langfuseService.endExecutionTrace(sessionToken, {
              contentPreview:
                typeof response.content === "string"
                  ? response.content.slice(0, 500)
                  : undefined,
            });
          } catch {}

          // DON'T close MCP clients here - they need to stay open for subsequent calls
          // MCP clients will be closed when the agent is destroyed or process exits
          // Closing them here causes "closed client" errors on tool execution

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
                  sendUpdate,
                  messages: fallbackMessages,
                  context: processedInput.context,
                  model: modelToUse,
                  provider: providerToUse,
                  traceContext: {
                    sessionId: processedInput.context?.sessionId,
                    metadata: {
                      ...processedInput.context?.metadata,
                    },
                  },
                });

                // Close trace on fallback success
                try {
                  langfuseService.addEventToSession(sessionToken, "agent-end", {
                    fallback: true,
                  });
                  langfuseService.endSpanForSession(sessionToken, "agent-act");
                  langfuseService.endExecutionTrace(sessionToken, {
                    contentPreview:
                      typeof fallbackResponse.content === "string"
                        ? fallbackResponse.content.slice(0, 500)
                        : undefined,
                    fallback: true,
                  });
                } catch {}

                return fallbackResponse;
              } catch (fallbackError) {
                // Fallback also failed
                throw new Error(
                  `Agent execution failed after ${attempt} attempts. Original error: ${error}. Fallback error: ${fallbackError}`
                );
              }
            }

            // End trace on final error
            try {
              langfuseService.addEventToSession(sessionToken, "agent-error", {
                attempt,
                message: (error as Error)?.message,
              });
              langfuseService.endSpanForSession(
                sessionToken,
                "agent-act",
                undefined,
                error as Error
              );
              langfuseService.endExecutionTrace(
                sessionToken,
                undefined,
                error as Error
              );
            } catch {}

            // DON'T close MCP clients on error either - they might be needed for retry or next call
            // MCP clients will be closed when the agent is destroyed or process exits

            throw error;
          }
        }
      }

      // End trace if we somehow exit the loop
      try {
        langfuseService.addEventToSession(sessionToken, "agent-error", {
          message: "Exited loop unexpectedly",
        });
        langfuseService.endSpanForSession(sessionToken, "agent-act");
        langfuseService.endExecutionTrace(
          sessionToken,
          undefined,
          new Error("Unexpected end of retry loop")
        );
      } catch {}

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

    // Cleanup method to close MCP connections when agent is done
    cleanup: async () => {
      if (mcpClientService) {
        try {
          console.log(`[${config.id}] Closing MCP clients...`);
          await mcpClientService.closeAll();
          console.log(`[${config.id}] ✅ MCP clients closed`);
        } catch (error) {
          console.error(`[${config.id}] Error closing MCP clients:`, error);
        }
      }
    },
  };
};
