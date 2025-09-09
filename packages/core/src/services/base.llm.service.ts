import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { type ModelMessage, generateText, stepCountIs } from "ai";
import type {
  ChatMessage,
  LLMService,
  LLMServiceOptions,
} from "../types/index.js";
import {
  type LangfuseService,
  langfuseService,
} from "./LangfuseService/langfuse.service.js";

export interface BaseLLMServiceConfig {
  toolExecutionMode?: "vercel-native" | "custom" | "none";
  defaultModel?: string;
  langfuse?: LangfuseService;
}

export const baseLLMService = (
  config: BaseLLMServiceConfig = {},
): LLMService => {
  const {
    toolExecutionMode = "vercel-native", // Default to vercel-native execution
    defaultModel = "gpt-4.1-mini",
    langfuse = langfuseService,
  } = config;

  console.log("[baseLLMService] - config");
  console.log(config);
  console.log("whatever manite");

  const runLLM = async (options: LLMServiceOptions): Promise<ChatMessage> => {
    console.log("[baseLLMService:runLLM] - options");
    console.log(options);

    const {
      model = defaultModel,
      messages,
      tools = undefined,
      temperature = 0.1,
      maxOutputTokens,
      responseFormat,
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
      },
    );

    // Try to link AI SDK telemetry to our existing Langfuse trace
    const parentTrace = langfuse.getCurrentTrace(options.context.sessionToken);
    const parentTraceId =
      // common id locations across SDK versions
      (parentTrace as any)?.id ||
      (parentTrace as any)?.traceId ||
      (parentTrace as any)?.trace?.id;

    const result = await generateText({
      model: openai(model),
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
                args,
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
                result,
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
    };
  };

  const isAvailable = async (): Promise<boolean> => {
    try {
      // Simple test to check if the API is accessible
      // Use configured default model
      const testModel = defaultModel.startsWith("claude")
        ? anthropic(defaultModel)
        : openai(defaultModel);

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
