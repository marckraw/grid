import type {
  ChatMessage,
  LLMService,
  LLMServiceOptions,
} from "../types/index.js";
import {
  generateText,
  generateObject,
  stepCountIs,
  type ModelMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
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
      provider, // AI provider to use (openai, anthropic, etc.)
      messages,
      tools = undefined,
      temperature = 0.1,
      maxOutputTokens,
      responseFormat,
      schema,
      traceContext,
      sendUpdate,
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
    let aiModel;
    let sdkProvider: string;

    if (provider === "anthropic") {
      aiModel = anthropic(model);
      sdkProvider = "anthropic";
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
        messages: messages as ModelMessage[],
        schema: schema as any,
        temperature,
        maxOutputTokens,
      });

      // Log cache statistics for Anthropic
      const cacheStats = (response as any)?.providerMetadata?.anthropic;
      if (cacheStats && sdkProvider === "anthropic") {
        console.log("💰 [Cache] Input tokens:", cacheStats.inputTokens || 0);
        console.log(
          "📦 [Cache] Cache creation:",
          cacheStats.cacheCreationInputTokens || 0
        );
        console.log(
          "✨ [Cache] Cache read:",
          cacheStats.cacheReadInputTokens || 0
        );
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
                  inputTokens: cacheStats.inputTokens || 0,
                  cacheCreationInputTokens:
                    cacheStats.cacheCreationInputTokens || 0,
                  cacheReadInputTokens: cacheStats.cacheReadInputTokens || 0,
                },
              }
            : {}),
        },
      };
    }

    const result = await generateText({
      model: aiModel,
      messages: messages as ModelMessage[],
      temperature,
      maxOutputTokens,
      tools,
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
    const cacheStatsText = (result as any)?.providerMetadata?.anthropic;
    if (cacheStatsText && sdkProvider === "anthropic") {
      console.log("💰 [Cache] Input tokens:", cacheStatsText.inputTokens || 0);
      console.log(
        "📦 [Cache] Cache creation:",
        cacheStatsText.cacheCreationInputTokens || 0
      );
      console.log(
        "✨ [Cache] Cache read:",
        cacheStatsText.cacheReadInputTokens || 0
      );
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
                inputTokens: cacheStatsText.inputTokens || 0,
                cacheCreationInputTokens:
                  cacheStatsText.cacheCreationInputTokens || 0,
                cacheReadInputTokens: cacheStatsText.cacheReadInputTokens || 0,
              },
            }
          : {}),
      },
    };
  };

  const isAvailable = async (): Promise<boolean> => {
    try {
      // Simple test to check if the API is accessible
      // Use configured default model and provider
      let testModel;

      if (defaultProvider === "anthropic") {
        testModel = anthropic(defaultModel);
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
    isAvailable,
  };
};
