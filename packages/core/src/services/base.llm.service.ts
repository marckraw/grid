import type {
  ChatMessage,
  LLMService,
  LLMServiceOptions,
  ToolCall,
} from "../types/index.js";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export const baseLLMService = (): LLMService => {
  const runLLM = async (options: LLMServiceOptions): Promise<ChatMessage> => {
    const {
      model = "gpt-4.1",
      messages,
      tools = [],
      temperature = 0.1,
      maxTokens,
      responseFormat,
    } = options;

    console.log("[baseLLMService:runLLM] passed options", options);
    console.log("[baseLLMService:runLLM] model", model);

    console.log("[baseLLMService:runLLM] get current time tool", tools[1]);

    // Convert messages to Vercel AI SDK format
    const formattedMessages = messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool" as const,
          content: [
            {
              type: "tool-result" as const,
              toolCallId: msg.tool_call_id!,
              toolName: "unknown", // Tool name is not available in our message format
              result:
                typeof msg.content === "string" ? msg.content : msg.content,
            },
          ],
        };
      }

      if (msg.toolCalls) {
        return {
          role: msg.role as "assistant",
          content: msg.content || "",
          toolCalls: msg.toolCalls,
        };
      }

      return {
        role: msg.role as "system" | "user" | "assistant",
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      };
    });

    // Format tools for Vercel AI SDK
    const formattedTools = tools.length > 0 ? formatTools(tools) : undefined;

    try {
      // Determine the provider based on the model name
      const modelInstance = model.startsWith("claude")
        ? anthropic(model)
        : openai(model);

      const result = await generateText({
        model: modelInstance,
        messages: formattedMessages,
        tools: formattedTools,
        temperature,
        maxTokens,
      });

      // Convert response back to our ChatMessage format
      const response: ChatMessage = {
        role: "assistant",
        content: result.text || null,
      };

      // Handle tool calls if present
      if (result.toolCalls && result.toolCalls.length > 0) {
        response.toolCalls = result.toolCalls;
      }

      return response;
    } catch (error) {
      console.error("Error calling Vercel AI SDK:", error);
      throw error;
    }
  };

  const runLLMWithJSONResponse = async (
    options: LLMServiceOptions
  ): Promise<ChatMessage> => {
    const { model = "gpt-4", messages, temperature = 0.1, maxTokens } = options;

    // Convert messages to Vercel AI SDK format
    const formattedMessages = messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
    }));

    try {
      // Add system message to ensure JSON response
      const messagesWithJsonInstruction = [
        ...formattedMessages,
        {
          role: "system" as const,
          content:
            "You must respond with valid JSON only. No markdown formatting, no explanation, just pure JSON.",
        },
      ];

      // Determine the provider based on the model name
      const modelInstance = model.startsWith("claude")
        ? anthropic(model)
        : openai(model);

      const result = await generateText({
        model: modelInstance,
        messages: messagesWithJsonInstruction,
        temperature,
        maxTokens,
      });

      return {
        role: "assistant",
        content: result.text,
      };
    } catch (error) {
      console.error("Error calling Vercel AI SDK for JSON response:", error);
      throw error;
    }
  };

  const formatTools = (tools: any[]) => {
    // Convert array of tools to object keyed by tool name
    // This is what Vercel AI SDK expects
    return tools.reduce((acc, tool) => {
      if (tool.name) {
        const { name, ...toolWithoutName } = tool;
        acc[name] = toolWithoutName;
      }
      return acc;
    }, {} as Record<string, any>);
  };

  const isAvailable = async (): Promise<boolean> => {
    try {
      // Simple test to check if the API is accessible
      // Try with the default model or OpenAI as fallback
      const testModel = process.env.DEFAULT_MODEL?.startsWith("claude")
        ? anthropic("claude-3-haiku-20240307")
        : openai("gpt-4.1");

      await generateText({
        model: testModel,
        messages: [{ role: "user", content: "test" }],
        maxTokens: 1,
      });
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
