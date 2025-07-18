import { z } from "zod";

/**
 * Progress message types for conversation flow updates
 */
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
  "state_update",
  "iteration",
]);

/**
 * Progress message schema for type safety
 */
export const ProgressMessageSchema = z.object({
  type: ProgressMessageTypeEnum,
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.number().optional(),
});

/**
 * Progress message type for conversation updates
 */
export type ProgressMessage = z.infer<typeof ProgressMessageSchema>;
export type ProgressMessageType = z.infer<typeof ProgressMessageTypeEnum>;

/**
 * Helper to create progress messages
 */
export const createProgressMessage = (
  type: ProgressMessageType,
  content: string,
  metadata?: Record<string, any>
): ProgressMessage => {
  return {
    type,
    content,
    metadata,
    timestamp: Date.now(),
  };
};