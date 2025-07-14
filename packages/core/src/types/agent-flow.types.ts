import { z } from "zod";

export const ProgressMessageTypeEnum = z.enum([
  "user_message",
  "agent_thought",
  "error",
  "finished",
  "connection",
  "tool_execution",
  "llm_response",
  "tool_response",
  "unknown",
  "thinking",
  "notification",
  "memory_saved",
  "evaluation",
]);

// Zod schema for ProgressMessage
export const ProgressMessageSchema = z.object({
  type: ProgressMessageTypeEnum,
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Agent flow context schema - comprehensive definition

// Chat message schema (more flexible than Message)

// Inferred TypeScript types
export type ProgressMessage = z.infer<typeof ProgressMessageSchema>;
export const AgentFlowContextSchema = z.object({
  userMessage: z.string(),
  state: z.record(z.string(), z.any()).optional(), // Mutable state across iterations
  maxIterations: z.number().optional(), // Override default max iterations
  continueOnToolCalls: z.boolean().optional(), // Whether to continue after tool calls
  sessionId: z.string().optional(), // Session identifier
  conversationId: z.string().optional(), // Conversation identifier
  metadata: z.record(z.string(), z.any()).optional(), // Additional metadata
});
export type AgentFlowContext = z.infer<typeof AgentFlowContextSchema>;
