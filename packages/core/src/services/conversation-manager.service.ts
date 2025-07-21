import type { AgentResponse } from "../types/agent.types.js";
import type { ChatMessage } from "../types/llm.types.js";
import { 
  createConversationHistory, 
  type ConversationHistoryOptions 
} from "./conversation-history.service.js";
import { 
  createConversationContext, 
  type ConversationContextOptions 
} from "./conversation-context.service.js";

/**
 * Event handlers for conversation manager operations
 */
export interface ConversationManagerHandlers {
  onUserMessageAdded?: (message: string) => Promise<void>;
  onAgentResponseProcessed?: (response: AgentResponse) => Promise<void>;
  onToolExecution?: (toolName: string, args: any, result: any) => Promise<void>;
  onReset?: () => Promise<void>;
}

/**
 * Options for creating a conversation manager
 */
export interface ConversationManagerOptions {
  historyOptions?: ConversationHistoryOptions;
  contextOptions?: ConversationContextOptions;
  onToolExecution?: (toolName: string, args: any, result: any) => void; // Legacy, kept for compatibility
  handlers?: ConversationManagerHandlers; // New event handlers
}

/**
 * Creates a conversation manager - composed primitive that combines history and context
 * 
 * This is a higher-level primitive that combines conversation history management
 * with context/state management, providing a unified interface for conversation handling.
 */
export const createConversationManager = (options?: ConversationManagerOptions) => {
  // Create atomic primitives
  const history = createConversationHistory(options?.historyOptions);
  const context = createConversationContext(options?.contextOptions);
  
  /**
   * Process an agent response and update conversation accordingly
   */
  const processAgentResponse = async (response: AgentResponse) => {
    // Increment message count
    context.incrementMessageCount();
    
    // Create the assistant message
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: response.content,
    };
    
    // Add tool calls if present
    if (response.toolCalls && response.toolCalls.length > 0) {
      assistantMessage.toolCalls = response.toolCalls;
      context.incrementToolCallCount(response.toolCalls.length);
    }
    
    // Add assistant message to history
    await history.addMessage(assistantMessage);
    
    // Handle tool responses if present
    if (response.metadata?.toolResponses) {
      for (const toolResponse of response.metadata.toolResponses) {
        // Add tool response to history
        await history.addToolResponse(
          toolResponse.toolCallId,
          toolResponse.toolName,
          toolResponse.result
        );
        
        // Call legacy callback if provided
        if (options?.onToolExecution) {
          // Find the original tool call to get args
          const toolCall = response.toolCalls?.find(
            tc => tc.toolCallId === toolResponse.toolCallId
          );
          options.onToolExecution(
            toolResponse.toolName,
            toolCall?.args || {},
            toolResponse.result
          );
        }
        
        // Call new handler if provided
        if (options?.handlers?.onToolExecution) {
          const toolCall = response.toolCalls?.find(
            tc => tc.toolCallId === toolResponse.toolCallId
          );
          await options.handlers.onToolExecution(
            toolResponse.toolName,
            toolCall?.args || {},
            toolResponse.result
          );
        }
      }
    }
    
    // Update context metadata with response info
    await context.updateMetadata('lastResponseTime', Date.now());
    if (response.metadata) {
      await context.updateMetadata('lastResponseMetadata', response.metadata);
    }
    
    // Call handler if provided
    if (options?.handlers?.onAgentResponseProcessed) {
      await options.handlers.onAgentResponseProcessed(response);
    }
  };
  
  /**
   * Add a user message to the conversation
   */
  const addUserMessage = async (content: string) => {
    context.incrementMessageCount();
    await history.addMessage({
      role: "user",
      content,
    });
    await context.updateMetadata('lastUserMessageTime', Date.now());
    
    // Call handler if provided
    if (options?.handlers?.onUserMessageAdded) {
      await options.handlers.onUserMessageAdded(content);
    }
  };
  
  /**
   * Get the full conversation state including history and context
   */
  const getConversationState = () => {
    return {
      messages: history.getMessages(),
      context: context.getSnapshot(),
      hasMessages: history.hasMessages(),
      messageCount: history.getMessages().length,
    };
  };
  
  /**
   * Reset the conversation (clears history and state)
   */
  const reset = async () => {
    await history.clear();
    await context.resetState();
    // Reset metrics
    const newContext = createConversationContext(options?.contextOptions);
    Object.assign(context, newContext);
    
    // Call handler if provided
    if (options?.handlers?.onReset) {
      await options.handlers.onReset();
    }
  };
  
  /**
   * Get a summary of the conversation
   */
  const getSummary = () => {
    const messages = history.getMessages();
    const metrics = context.getMetrics();
    
    return {
      sessionId: context.getSessionId(),
      userId: context.getUserId(),
      messageCount: messages.length,
      userMessageCount: history.getMessageCountByRole("user"),
      assistantMessageCount: history.getMessageCountByRole("assistant"),
      toolMessageCount: history.getMessageCountByRole("tool"),
      toolCallCount: metrics.toolCallCount,
      duration: metrics.duration,
      hasSystemPrompt: messages.some(m => m.role === "system"),
    };
  };
  
  return {
    // Message management
    addUserMessage,
    processAgentResponse,
    
    // History methods (delegated)
    getMessages: history.getMessages,
    getNonSystemMessages: history.getNonSystemMessages,
    getLastMessageByRole: history.getLastMessageByRole,
    hasMessages: history.hasMessages,
    
    // Context methods (delegated)
    updateState: context.updateState,
    updateStates: context.updateStates,
    getState: context.getState,
    getStateValue: context.getStateValue,
    updateMetadata: context.updateMetadata,
    getMetadata: context.getMetadata,
    
    // Combined methods
    getConversationState,
    getSummary,
    reset,
    
    // Direct access to primitives if needed
    history,
    context,
  };
};

/**
 * Type for the conversation manager service
 */
export type ConversationManager = ReturnType<typeof createConversationManager>;