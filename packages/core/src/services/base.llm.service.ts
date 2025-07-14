import type { ChatMessage, LLMService, LLMServiceOptions } from "../types/index.js";
import OpenAI from "openai";
import { zodFunction } from "openai/helpers/zod";

export const baseLLMService = (): LLMService => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const runLLM = async (options: LLMServiceOptions): Promise<ChatMessage> => {
    const {
      model = "gpt-4.1",
      messages,
      tools = [],
      temperature = 0.1,
      maxTokens,
      responseFormat,
    } = options;

    const formattedTools = formatTools(tools);

    const completionOptions: any = {
      model,
      temperature,
      messages: [...(messages as any)],
    };

    // Add tools if provided
    if (formattedTools.length > 0) {
      completionOptions.tools = formattedTools;
      completionOptions.tool_choice = "auto";
    }

    // Add other options if provided
    if (maxTokens) completionOptions.max_tokens = maxTokens;
    if (responseFormat) completionOptions.response_format = responseFormat;

    const llmResponse = await openai.chat.completions.create(completionOptions);

    return llmResponse.choices[0].message as ChatMessage;
  };

  const runLLMWithJSONResponse = async (options: LLMServiceOptions): Promise<ChatMessage> => {
    // For JSON responses, we enforce the response format
    return runLLM({
      ...options,
      responseFormat: { type: "json_object" },
    });
  };

  const formatTools = (tools: any[]): any[] => {
    return tools.map((tool) => {
      if (tool.parameters) {
        return zodFunction(tool);
      } else {
        return tool;
      }
    });
  };

  const isAvailable = async (): Promise<boolean> => {
    try {
      // Simple check to see if we can reach the API
      await openai.models.list();
      return true;
    } catch {
      return false;
    }
  };

  return {
    runLLM,
    runLLMWithJSONResponse,
    formatTools,
    isAvailable,
  };
};
