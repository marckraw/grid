import z from "zod";

// Zod schema for LLM

// Tool function call schema
export const ToolFunctionSchema = z.object({
  name: z.string(),
  arguments: z.string(), // JSON string
});
// Tool call schema
export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: ToolFunctionSchema,
});

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.any(), // Can be string, null, or structured content
  tool_calls: z.array(ToolCallSchema).optional(),
  tool_call_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(), // Optional metadata
});

// Inferred types
export type ToolFunction = z.infer<typeof ToolFunctionSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// LLM Service Interface for injectable LLM providers
export interface LLMServiceOptions {
  messages: ChatMessage[];
  tools?: any[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: any;
  [key: string]: any; // Allow additional provider-specific options
}

export interface LLMService {
  // Main method to run LLM with messages and optional tools
  runLLM(options: LLMServiceOptions): Promise<ChatMessage>;
  
  // Optional method for JSON responses (some providers might have special handling)
  runLLMWithJSONResponse?(options: LLMServiceOptions): Promise<ChatMessage>;
  
  // Optional method to format tools for the specific provider
  formatTools?(tools: any[]): any[];
  
  // Optional method to check if service is available
  isAvailable?(): Promise<boolean>;
}
