import type {
  ChatMessage,
  LLMService,
  LLMServiceOptions,
  ToolCall,
} from "../types/index.js";
import {
  generateText,
  generateObject,
  streamText,
  stepCountIs,
  type ModelMessage,
  type ToolSet,
} from "ai";
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

  const formatTools = (tools: any[], executionMode: string = "custom") => {
    // Convert array of tools to object keyed by tool name
    // This is what Vercel AI SDK expects
    return tools.reduce((acc, tool) => {
      if (tool.name) {
        const { name, ...toolWithoutName } = tool;

        if (executionMode === "vercel-native") {
          // Keep execute function for Vercel to auto-execute
          acc[name] = toolWithoutName;
        } else {
          // Remove execute function for custom execution
          const { execute, ...toolWithoutExecute } = toolWithoutName as any;
          acc[name] = {
            description: toolWithoutExecute.description,
            inputSchema: toolWithoutExecute.inputSchema,
          };
        }
      }
      return acc;
    }, {} as Record<string, any>);
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
    formatTools,
    isAvailable,
  };
};
