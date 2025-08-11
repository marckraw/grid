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
    toolExecutionMode = "custom", // Default to custom execution
    defaultModel = "gpt-4.1-mini",
    langfuse = langfuseService,
  } = config;

  const runLLM = async (options: LLMServiceOptions): Promise<ChatMessage> => {
    console.log("[baseLLMService:runLLM] options", options);
    console.log("Running this shit");
    console.log("Tools: ");
    console.log(options.tools);
    const {
      model = defaultModel,
      messages,
      tools = {},
      temperature = 0.1,
      maxOutputTokens,
      responseFormat,
      traceContext,
    } = options;

    const result = await generateText({
      model: openai(model),
      messages: messages as ModelMessage[],
      temperature,
      maxOutputTokens,
      tools: tools,
      stopWhen:
        toolExecutionMode === "custom" ? stepCountIs(1) : stepCountIs(12),
    });

    console.log(
      "This is result from the baseLLMService runLLM [ai vercel sdk v5]"
    );
    console.log(result);

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
