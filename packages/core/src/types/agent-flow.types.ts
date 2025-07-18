import { z } from "zod";

// Legacy progress message types - kept for backward compatibility
// New code should use types from progress.types.ts instead
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
