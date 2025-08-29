import type {
  ChatMessage,
  LLMService,
  LLMServiceOptions,
} from "../types/index.js";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  langfuseService,
  type LangfuseService,
} from "./LangfuseService/langfuse.service.js";

export interface BaseLLMServiceConfig {
  toolExecutionMode?: "vercel-native" | "custom" | "none";
  defaultModel?: string;
  langfuse?: LangfuseService;
}

export const baseLLMService = (
  config: BaseLLMServiceConfig = {}
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
            sendUpdate({
              type: "tool_execution",
              content: JSON.stringify(stepContent),
            });
          }

          if (stepContent.type === "tool-result") {
            sendUpdate({
              type: "tool_response",
              content: JSON.stringify(stepContent),
            });
          }
        });
      },
      experimental_telemetry: {
        isEnabled: true,
      },
    });

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
