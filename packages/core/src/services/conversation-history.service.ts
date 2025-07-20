import type { ChatMessage } from "../types/llm.types.js";

/**
 * Options for creating a conversation history
 */
export interface ConversationHistoryOptions {
  maxMessages?: number; // Optional limit on history size
  systemPrompt?: string; // Optional initial system prompt
}

/**
 * Creates a conversation history manager - atomic primitive for managing message history
 * 
 * This is the most basic building block for conversation management.
 * It handles the storage and retrieval of messages in a conversation.
 */
export const createConversationHistory = (options?: ConversationHistoryOptions) => {
  const config = {
    maxMessages: options?.maxMessages ?? Infinity,
    systemPrompt: options?.systemPrompt,
  };
  
  // Internal message storage using closure
  const messages: ChatMessage[] = [];
  
  // Add system prompt if provided
  if (config.systemPrompt) {
    messages.push({
      role: "system",
      content: config.systemPrompt,
    });
  }
  
  /**
   * Add a message to the conversation history
   */
  const addMessage = (message: ChatMessage) => {
    messages.push(message);
    
    // Trim history if needed (keep system prompt + recent messages)
    if (messages.length > config.maxMessages) {
      const systemMessages = messages.filter(m => m.role === "system");
      const nonSystemMessages = messages.filter(m => m.role !== "system");
      const trimmedMessages = nonSystemMessages.slice(-config.maxMessages + systemMessages.length);
      messages.length = 0;
      messages.push(...systemMessages, ...trimmedMessages);
    }
  };
  
  /**
   * Get all messages in the conversation
   */
  const getMessages = (): ChatMessage[] => {
    // Return a copy to prevent external modifications
    return [...messages];
  };
  
  /**
   * Get messages without system prompts (useful for display)
   */
  const getNonSystemMessages = (): ChatMessage[] => {
    return messages.filter(m => m.role !== "system");
  };
  
  /**
   * Add a tool response message
   * This is a convenience method that formats tool responses correctly
   */
  const addToolResponse = (toolCallId: string, toolName: string, result: any) => {
    messages.push({
      role: "tool",
      content: typeof result === "string" ? result : JSON.stringify(result),
      tool_call_id: toolCallId,
      tool_name: toolName,
    });
  };
  
  /**
   * Clear all messages except system prompt
   */
  const clear = () => {
    const systemMessages = messages.filter(m => m.role === "system");
    messages.length = 0;
    messages.push(...systemMessages);
  };
  
  /**
   * Get the last message of a specific role
   */
  const getLastMessageByRole = (role: ChatMessage["role"]): ChatMessage | undefined => {
    return messages.filter(m => m.role === role).pop();
  };
  
  /**
   * Get message count by role
   */
  const getMessageCountByRole = (role: ChatMessage["role"]): number => {
    return messages.filter(m => m.role === role).length;
  };
  
  /**
   * Check if the conversation has any messages (excluding system)
   */
  const hasMessages = (): boolean => {
    return messages.some(m => m.role !== "system");
  };
  
  return {
    // Core methods
    addMessage,
    getMessages,
    getNonSystemMessages,
    addToolResponse,
    clear,
    
    // Utility methods
    getLastMessageByRole,
    getMessageCountByRole,
    hasMessages,
    
    // Config access
    getConfig: () => ({ ...config }),
  };
};

/**
 * Type for the conversation history service
 */
export type ConversationHistory = ReturnType<typeof createConversationHistory>;