import type {
  ChatMessage,
  LLMService,
  LLMServiceOptions,
  ProviderOptionsMap,
} from "../types/index.js";
import {
  generateText,
  generateObject,
  streamText,
  stepCountIs,
  type ModelMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  langfuseService,
  type LangfuseService,
} from "./LangfuseService/langfuse.service.js";

export interface BaseLLMServiceConfig {
  toolExecutionMode?: "vercel-native" | "custom" | "none";
  defaultModel?: string;
  defaultProvider?: string; // Default provider (openai, anthropic, etc.)
  langfuse?: LangfuseService;
}

export const baseLLMService = (
  config: BaseLLMServiceConfig = {}
): LLMService => {
  const {
    toolExecutionMode = "vercel-native", // Default to vercel-native execution
    // Default model - can be overridden per-call via options.model
    defaultModel = "gpt-5-mini",
    defaultProvider = "openai", // Default provider - can be overridden per-call via options.provider
    langfuse = langfuseService,
  } = config;

  const runLLM = async (options: LLMServiceOptions): Promise<ChatMessage> => {
    const {
      model = defaultModel,
      provider, // AI provider to use (openai, anthropic, bedrock, openrouter, etc.)
      messages,
      tools = undefined,
      temperature = 0.1,
      maxOutputTokens,
      responseFormat,
      schema,
      traceContext,
      sendUpdate,
      providerOptions, // Provider-specific options (bedrock guardrails, etc.)
    } = options;

    const generation = langfuse.createGenerationForSession(
      options.context.sessionToken,
      {
        input: options.messages,
        model,
        name: "llm-generation",
        metadata: {
          ...options.context.metadata,
        },
      }
    );

    // Try to link AI SDK telemetry to our existing Langfuse trace
    const parentTrace = langfuse.getCurrentTrace(options.context.sessionToken);
    const parentTraceId =
      // common id locations across SDK versions
      (parentTrace as any)?.id ||
      (parentTrace as any)?.traceId ||
      (parentTrace as any)?.trace?.id;

    // Determine which AI SDK provider to use based on provider parameter
    // Default to openai if not specified
    // Using 'any' type as providers may return different LanguageModel versions (V1/V2)
    // but all work with the AI SDK's generateText/streamText functions
    let aiModel: any;
    let sdkProvider: string;

    if (provider === "anthropic") {
      aiModel = anthropic(model);
      sdkProvider = "anthropic";
    } else if (provider === "bedrock") {
      // Amazon Bedrock - uses AWS credentials from environment/SDK
      // Supports Claude, Llama, Titan, and other models hosted on Bedrock
      aiModel = bedrock(model);
      sdkProvider = "bedrock";
    } else if (provider === "openrouter") {
      // Use official OpenRouter provider
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      aiModel = openrouter.chat(model);
      sdkProvider = "openrouter";
    } else {
      // Default to OpenAI
      aiModel = openai(model);
      sdkProvider = "openai";
    }

    console.log(
      `🤖 [base.llm.service] Using AI SDK: ${sdkProvider} for model: ${model}`
    );
    console.log(
      `🔧 [base.llm.service] Max output tokens: ${
        maxOutputTokens || "default (varies by model)"
      }`
    );
    console.log(`🌡️ [base.llm.service] Temperature: ${temperature}`);

    // If structured output requested and schema provided, use generateObject to enforce pure JSON
    if (responseFormat === "structured" && schema) {
      const { object, response } = await generateObject({
        model: aiModel,
        messages: messages as any, // Cast to any to preserve experimental_providerMetadata for cache control
        schema: schema as any,
        temperature,
        maxOutputTokens,
        // Forward provider-specific options (bedrock guardrails, anthropic cache, etc.)
        ...(providerOptions ? { providerOptions: providerOptions as any } : {}),
      });

      // Log cache statistics for Anthropic
      // Cache stats are in response.body.usage for Anthropic
      const cacheStats =
        sdkProvider === "anthropic" ? (response as any)?.body?.usage : null;

      if (cacheStats && sdkProvider === "anthropic") {
        console.log("💰 [Cache] Input tokens:", cacheStats.input_tokens || 0);
        console.log(
          "📦 [Cache] Cache creation:",
          cacheStats.cache_creation_input_tokens || 0
        );
        console.log(
          "✨ [Cache] Cache read:",
          cacheStats.cache_read_input_tokens || 0
        );

        if (cacheStats.cache_read_input_tokens > 0) {
          const savings = Math.round(
            (cacheStats.cache_read_input_tokens / cacheStats.input_tokens) * 100
          );
          console.log(
            `🎉 [Cache] CACHE HIT! ${cacheStats.cache_read_input_tokens} tokens from cache (${savings}% of input)`
          );
        }
        if (cacheStats.cache_creation_input_tokens > 0) {
          console.log(
            `📝 [Cache] Created cache for ${cacheStats.cache_creation_input_tokens} tokens (5 min TTL)`
          );
        }
      }

      // End generation with success if tracing
      if (generation) {
        const usage = (response as any)?.usage;
        const cost = langfuseService.calculateCost(model, {
          total: usage?.totalTokens,
          input: usage?.inputTokens,
          output: usage?.outputTokens,
        });

        generation.end({
          output: JSON.stringify(object),
          usage: {
            input: usage?.inputTokens,
            output: usage?.outputTokens,
            total: usage?.totalTokens,
          },
          cost,
        });
      }

      return {
        role: "assistant",
        content: JSON.stringify(object),
        metadata: {
          ...(cacheStats
            ? {
                anthropicCache: {
                  inputTokens: cacheStats.input_tokens || 0,
                  cacheCreationInputTokens:
                    cacheStats.cache_creation_input_tokens || 0,
                  cacheReadInputTokens: cacheStats.cache_read_input_tokens || 0,
                },
              }
            : {}),
        },
      };
    }

    const result = await generateText({
      model: aiModel,
      messages: messages as any, // Cast to any to preserve experimental_providerMetadata for cache control
      temperature,
      maxOutputTokens,
      tools,
      // Forward provider-specific options (bedrock guardrails, anthropic cache, etc.)
      ...(providerOptions ? { providerOptions: providerOptions as any } : {}),
      stopWhen:
        toolExecutionMode === "custom" ? stepCountIs(1) : stepCountIs(12),
      onStepFinish: (step) => {
        step.content.forEach((stepContent) => {
          if (stepContent.type === "tool-call") {
            try {
              const sc: any = stepContent as any;
              const toolCallId =
                sc.toolCallId ??
                sc.id ??
                sc.callId ??
                `${Date.now()}-${Math.random()}`;
              const toolName = sc.toolName ?? sc.name ?? "unknown";
              const args = sc.args ?? sc.input ?? sc.parameters;
              langfuse.startToolSpanForSession(
                options.context.sessionToken,
                toolCallId,
                toolName,
                args
              );
            } catch {}
            sendUpdate({
              type: "tool_execution",
              content: JSON.stringify(stepContent),
            });
          }

          if (stepContent.type === "tool-result") {
            try {
              const sc: any = stepContent as any;
              const toolCallId = sc.toolCallId ?? sc.id ?? sc.callId;
              const result = sc.result ?? sc.output ?? sc.data;
              langfuse.endToolSpanForSession(
                options.context.sessionToken,
                toolCallId,
                result
              );
            } catch {}
            sendUpdate({
              type: "tool_response",
              content: JSON.stringify(stepContent),
            });
          }
        });
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: "llm-generation",
        metadata: {
          langfuseTraceId: parentTraceId,
          langfuseUpdateParent: false,
          sessionId: options.context.sessionToken,
          ...(traceContext?.userId ? { userId: traceContext.userId } : {}),
          ...(traceContext?.tags ? { tags: traceContext.tags } : {}),
        },
      },
    });

    // Log cache statistics for Anthropic
    // Cache stats are in result.response.body.usage for Anthropic
    const cacheStatsText =
      sdkProvider === "anthropic"
        ? (result as any)?.response?.body?.usage
        : null;

    if (cacheStatsText && sdkProvider === "anthropic") {
      console.log("💰 [Cache] Input tokens:", cacheStatsText.input_tokens || 0);
      console.log(
        "📦 [Cache] Cache creation:",
        cacheStatsText.cache_creation_input_tokens || 0
      );
      console.log(
        "✨ [Cache] Cache read:",
        cacheStatsText.cache_read_input_tokens || 0
      );

      if (cacheStatsText.cache_read_input_tokens > 0) {
        const savings = Math.round(
          (cacheStatsText.cache_read_input_tokens /
            cacheStatsText.input_tokens) *
            100
        );
        console.log(
          `🎉 [Cache] CACHE HIT! ${cacheStatsText.cache_read_input_tokens} tokens from cache (${savings}% of input)`
        );
      }
      if (cacheStatsText.cache_creation_input_tokens > 0) {
        console.log(
          `📝 [Cache] Created cache for ${cacheStatsText.cache_creation_input_tokens} tokens (5 min TTL)`
        );
      }
    }

    // End generation with success if tracing
    if (generation) {
      const usage = result.usage;
      const cost = langfuseService.calculateCost(model, {
        total: usage?.totalTokens,
        input: usage?.inputTokens,
        output: usage?.outputTokens,
      });

      generation.end({
        output: result.text,
        usage: {
          input: usage?.inputTokens,
          output: usage?.outputTokens,
          total: usage?.totalTokens,
        },
        cost,
      });
    }

    return {
      role: "assistant",
      content: result.text,
      metadata: {
        ...(cacheStatsText
          ? {
              anthropicCache: {
                inputTokens: cacheStatsText.input_tokens || 0,
                cacheCreationInputTokens:
                  cacheStatsText.cache_creation_input_tokens || 0,
                cacheReadInputTokens:
                  cacheStatsText.cache_read_input_tokens || 0,
              },
            }
          : {}),
      },
    };
  };

  const runStreamedLLM = async (
    options: LLMServiceOptions
  ): Promise<{
    textStream: AsyncIterable<string>;
    generation: any;
  }> => {
    const {
      model = defaultModel,
      provider,
      messages,
      temperature = 0.7,
      maxOutputTokens,
      traceContext,
      providerOptions,
    } = options;

    const generation = langfuse.createGenerationForSession(
      options.context.sessionToken,
      {
        input: options.messages,
        model,
        name: "llm-streaming",
        metadata: {
          ...options.context.metadata,
          streaming: true,
        },
      }
    );

    // Select AI model based on provider
    let aiModel: any;
    if (provider === "anthropic") {
      aiModel = anthropic(model);
    } else if (provider === "bedrock") {
      aiModel = bedrock(model);
    } else if (provider === "openrouter") {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      aiModel = openrouter.chat(model);
    } else {
      aiModel = openai(model);
    }

    const result = await streamText({
      model: aiModel,
      messages: messages as any,
      temperature,
      maxOutputTokens,
      // Forward provider-specific options
      ...(providerOptions ? { providerOptions: providerOptions as any } : {}),
    });

    return { textStream: result.textStream, generation };
  };

  const runStreamedLLMWithTools = async (
    options: LLMServiceOptions & { tools?: any[] }
  ): Promise<{
    textStream: AsyncIterable<string>;
    generation: any;
  }> => {
    const {
      model = defaultModel,
      provider,
      messages,
      tools = [],
      temperature = 0.1,
      maxOutputTokens,
      traceContext,
      sendUpdate,
      providerOptions,
    } = options;

    const generation = langfuse.createGenerationForSession(
      options.context.sessionToken,
      {
        input: options.messages,
        model,
        name: "llm-streaming-tools",
        metadata: {
          ...options.context.metadata,
          streaming: true,
          toolCount: tools.length,
        },
      }
    );

    // Select AI model based on provider
    let aiModel: any;
    if (provider === "anthropic") {
      aiModel = anthropic(model);
    } else if (provider === "bedrock") {
      aiModel = bedrock(model);
    } else if (provider === "openrouter") {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      aiModel = openrouter.chat(model);
    } else {
      aiModel = openai(model);
    }

    const result = streamText({
      model: aiModel,
      messages: messages as any,
      temperature,
      maxOutputTokens,
      tools: tools && tools.length > 0 ? (tools as any) : undefined,
      // Enable multi-step tool execution (same as non-streaming)
      stopWhen: stepCountIs(12),
      // Forward provider-specific options
      ...(providerOptions ? { providerOptions: providerOptions as any } : {}),
      onStepFinish: (step) => {
        // Tool telemetry
        step.content.forEach((content) => {
          if (content.type === "tool-call") {
            const sc: any = content;
            const toolCallId =
              sc.toolCallId ??
              sc.id ??
              sc.callId ??
              `${Date.now()}-${Math.random()}`;
            const toolName = sc.toolName ?? sc.name ?? "unknown";
            const args = sc.args ?? sc.input ?? sc.parameters;
            langfuse.startToolSpanForSession(
              options.context.sessionToken,
              toolCallId,
              toolName,
              args
            );
            if (sendUpdate) {
              sendUpdate({
                type: "tool_execution",
                content: JSON.stringify(content),
              });
            }
          }

          if (content.type === "tool-result") {
            const sc: any = content;
            const toolCallId = sc.toolCallId ?? sc.id ?? sc.callId;
            const result = sc.result ?? sc.output ?? sc.data;
            langfuse.endToolSpanForSession(
              options.context.sessionToken,
              toolCallId,
              result
            );
            if (sendUpdate) {
              sendUpdate({
                type: "tool_response",
                content: JSON.stringify(content),
              });
            }
          }
        });
      },
    });

    return { textStream: result.textStream, generation };
  };

  const isAvailable = async (): Promise<boolean> => {
    try {
      // Simple test to check if the API is accessible
      // Use configured default model and provider
      let testModel: any;

      if (defaultProvider === "anthropic") {
        testModel = anthropic(defaultModel);
      } else if (defaultProvider === "bedrock") {
        testModel = bedrock(defaultModel);
      } else if (defaultProvider === "openrouter") {
        const openrouter = createOpenRouter({
          apiKey: process.env.OPENROUTER_API_KEY,
        });
        testModel = openrouter.chat(defaultModel);
      } else {
        testModel = openai(defaultModel);
      }

      await generateText({
        model: testModel,
        messages: [
          {
            role: "user",
            content: "test",
          },
        ],
        maxOutputTokens: 1,
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    runLLM,
    runStreamedLLM,
    runStreamedLLMWithTools,
    isAvailable,
  };
};
