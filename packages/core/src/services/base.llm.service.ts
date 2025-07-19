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
import { getLangfuse, initLangfuse, getActiveTrace, type LangfuseConfig } from "./langfuse.service.js";

export interface BaseLLMServiceConfig {
  toolExecutionMode?: "vercel-native" | "custom" | "none";
  defaultModel?: string;
  langfuse?: LangfuseConfig;
}

export const baseLLMService = (config: BaseLLMServiceConfig = {}): LLMService => {
  const { 
    toolExecutionMode = "custom", // Default to custom execution
    defaultModel = "gpt-4.1",
    langfuse
  } = config;

  // Initialize Langfuse if config provided
  if (langfuse) {
    initLangfuse(langfuse);
  }

  const runLLM = async (options: LLMServiceOptions): Promise<ChatMessage> => {
    const {
      model = defaultModel,
      messages,
      tools = [],
      temperature = 0.1,
      maxTokens,
      responseFormat,
    } = options;

    console.log("[baseLLMService:runLLM] model used", model);

    // Convert messages to Vercel AI SDK format
    const formattedMessages = messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool" as const,
          content: [
            {
              type: "tool-result" as const,
              toolCallId: msg.tool_call_id!,
              toolName: msg.tool_name || "unknown",
              result:
                typeof msg.content === "string"
                  ? JSON.parse(msg.content)
                  : msg.content,
            },
          ],
        };
      }

      if (msg.toolCalls) {
        // Convert toolCalls to Vercel AI SDK format
        const toolCallContent = msg.toolCalls.map((toolCall: any) => ({
          type: "tool-call" as const,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          args: toolCall.args || {},
        }));

        return {
          role: msg.role as "assistant",
          content: toolCallContent,
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
    const formattedTools = tools.length > 0 ? formatTools(tools, toolExecutionMode) : undefined;

    const startTime = Date.now();
    
    try {
      // Determine the provider based on the model name
      const modelInstance = model.startsWith("claude")
        ? anthropic(model)
        : openai(model);

      const result = await generateText({
        model: modelInstance,
        messages: formattedMessages,
        tools: formattedTools,
        toolChoice: "auto", // Let model decide when to use tools
        temperature,
        maxTokens,
        maxSteps: toolExecutionMode === "vercel-native" ? 3 : 1, // Enable multi-step for vercel-native
        // Langfuse will track via OpenTelemetry or manual tracing
      });

      // Log what we got from Vercel
      if (toolExecutionMode === "vercel-native") {
        console.log("[baseLLMService] Vercel result:", {
          text: result.text,
          toolCalls: result.toolCalls,
          toolResults: result.toolResults,
          finishReason: result.finishReason,
        });
      }

      // Convert response back to our ChatMessage format
      const response: ChatMessage = {
        role: "assistant",
        content: result.text || null,
      };

      // Handle tool calls if present
      if (result.toolCalls && result.toolCalls.length > 0) {
        response.toolCalls = result.toolCalls;
      }

      // If vercel-native and we have tool results, add them to metadata
      if (toolExecutionMode === "vercel-native" && result.toolResults) {
        response.metadata = {
          toolResults: result.toolResults,
        };
      }

      // Record to Langfuse if enabled
      const langfuseClient = getLangfuse();
      const activeTrace = getActiveTrace();
      
      if (langfuseClient && result.usage) {
        const duration = Date.now() - startTime;
        
        try {
          // Create a generation linked to the active trace if available
          const generationParams = {
            name: "llm-generation",
            model,
            modelParameters: {
              temperature,
              ...(maxTokens && { maxTokens }),
              toolChoice: "auto",
              toolExecutionMode,
            },
            input: messages,
            output: result.text || "[Tool calls only]",
            usage: {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            },
            metadata: {
              hasTools: tools.length > 0,
              toolCalls: result.toolCalls?.length || 0,
              duration,
            },
          };

          // If we have an active trace, create generation as part of it
          const generation = activeTrace 
            ? activeTrace.trace.generation(generationParams)
            : langfuseClient.generation(generationParams);
          
          // End the generation
          generation.end();
        } catch (error) {
          console.error("[Langfuse] Failed to record generation:", error);
        }
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
    const { model = defaultModel, messages, temperature = 0.1, maxTokens } = options;

    // Convert messages to Vercel AI SDK format
    const formattedMessages = messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
    }));

    const startTime = Date.now();
    
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
        // Langfuse will track via OpenTelemetry or manual tracing
      });

      // Record to Langfuse if enabled
      const langfuseClient = getLangfuse();
      const activeTrace = getActiveTrace();
      
      if (langfuseClient && result.usage) {
        const duration = Date.now() - startTime;
        
        try {
          const generationParams = {
            name: "llm-json-generation",
            model,
            modelParameters: {
              temperature,
              ...(maxTokens && { maxTokens }),
              responseFormat: "json",
            },
            input: messages,
            output: result.text,
            usage: {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            },
            metadata: {
              duration,
              isJsonResponse: true,
            },
          };

          // If we have an active trace, create generation as part of it
          const generation = activeTrace 
            ? activeTrace.trace.generation(generationParams)
            : langfuseClient.generation(generationParams);
          
          generation.end();
        } catch (error) {
          console.error("[Langfuse] Failed to record JSON generation:", error);
        }
      }

      return {
        role: "assistant",
        content: result.text,
      };
    } catch (error) {
      console.error("Error calling Vercel AI SDK for JSON response:", error);
      throw error;
    }
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
          const { execute, ...toolWithoutExecute } = toolWithoutName;
          acc[name] = {
            description: toolWithoutExecute.description,
            parameters: toolWithoutExecute.parameters,
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
