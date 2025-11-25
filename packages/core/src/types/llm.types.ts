import type { ModelMessage, ToolSet } from "ai";
import z from "zod";
import type { ProgressMessage } from "./progress.types.js";

// Zod schema for LLM

// Tool call schema - using Vercel AI SDK format
export const ToolCallSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.unknown(), // Always required in Vercel AI SDK
});

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.any(), // Can be string, null, or structured content
  toolCalls: z.array(ToolCallSchema).optional(), // Vercel AI SDK uses camelCase
  tool_call_id: z.string().optional(), // For tool responses
  tool_name: z.string().optional(), // Tool name for tool responses
  metadata: z.record(z.string(), z.any()).optional(), // Optional metadata
  // Keep providerOptions for internal tracking (backward compatibility)
  providerOptions: z
    .object({
      anthropic: z
        .object({
          cacheControl: z.object({ type: z.literal("ephemeral") }).optional(),
        })
        .optional(),
    })
    .optional(),
  // Add experimental_providerMetadata for AI SDK v5 compatibility
  experimental_providerMetadata: z
    .object({
      anthropic: z
        .object({
          cacheControl: z.object({ type: z.literal("ephemeral") }).optional(),
        })
        .optional(),
    })
    .optional(),
});

// Inferred types
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export interface LLMTraceContext {
  sessionId?: string;
  userId?: string;
  conversationId?: number;
  agentType?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

// Provider-specific options for AI SDK providers
export interface BedrockProviderOptions {
  // Guardrails configuration
  guardrailConfig?: {
    guardrailIdentifier: string;
    guardrailVersion: string;
    trace?: "enabled" | "disabled";
  };
  // Additional model request fields
  additionalModelRequestFields?: Record<string, unknown>;
}

export interface AnthropicProviderOptions {
  cacheControl?: { type: "ephemeral" };
  // Extended thinking/reasoning
  thinking?: {
    type: "enabled";
    budgetTokens: number;
  };
}

export interface OpenAIProviderOptions {
  // OpenAI-specific options
  logprobs?: boolean;
  topLogprobs?: number;
}

// Combined provider options type
export interface ProviderOptionsMap {
  bedrock?: BedrockProviderOptions;
  anthropic?: AnthropicProviderOptions;
  openai?: OpenAIProviderOptions;
  openrouter?: Record<string, unknown>;
  [key: string]: unknown;
}

// LLM Service Interface for injectable LLM providers
export interface LLMServiceOptions {
  messages: ChatMessage[];
  tools?: ToolSet;
  model?: string;
  provider?: string; // AI provider (e.g., "openai", "anthropic", "openrouter", "bedrock")
  temperature?: number;
  maxOutputTokens?: number;
  // Desired response format; when set to "structured" and a schema is provided,
  // the LLM service should use schema-enforced generation (e.g., generateObject).
  responseFormat?: "text" | "json" | "structured";
  // Optional output schema for structured responses. Accept Zod schema or plain JSON schema.
  schema?: z.ZodTypeAny | Record<string, unknown>;
  traceContext?: LLMTraceContext;
  sendUpdate: (data: ProgressMessage) => Promise<void>;
  // Provider-specific options (bedrock guardrails, anthropic cache, etc.)
  providerOptions?: ProviderOptionsMap;
  [key: string]: any; // Allow additional provider-specific options
}

export interface LLMService {
  // Main method to run LLM with messages and optional tools
  runLLM(options: LLMServiceOptions): Promise<ChatMessage>;

  // Streaming methods (optional)
  runStreamedLLM?(options: LLMServiceOptions): Promise<{
    textStream: AsyncIterable<string>;
    generation: any;
  }>;

  runStreamedLLMWithTools?(
    options: LLMServiceOptions & { tools?: any[] }
  ): Promise<{
    textStream: AsyncIterable<string>;
    generation: any;
  }>;

  // Optional method to check if service is available
  isAvailable?(): Promise<boolean>;
}
