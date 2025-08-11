import type { ModelMessage, ToolSet } from "ai";
import z from "zod";

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

// LLM Service Interface for injectable LLM providers
export interface LLMServiceOptions {
  messages: ChatMessage[];
  tools?: ToolSet;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseFormat?: any;
  traceContext?: LLMTraceContext;
  [key: string]: any; // Allow additional provider-specific options
}

export interface LLMService {
  // Main method to run LLM with messages and optional tools
  runLLM(options: LLMServiceOptions): Promise<ChatMessage>;

  // Optional method to format tools for the specific provider
  formatTools?(tools: any[]): any[];

  // Optional method to check if service is available
  isAvailable?(): Promise<boolean>;
}
