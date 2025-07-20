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
 * Options for creating a conversation manager
 */
export interface ConversationManagerOptions {
  historyOptions?: ConversationHistoryOptions;
  contextOptions?: ConversationContextOptions;
  onToolExecution?: (toolName: string, args: any, result: any) => void;
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
    history.addMessage(assistantMessage);
    
    // Handle tool responses if present
    if (response.metadata?.toolResponses) {
      for (const toolResponse of response.metadata.toolResponses) {
        // Add tool response to history
        history.addToolResponse(
          toolResponse.toolCallId,
          toolResponse.toolName,
          toolResponse.result
        );
        
        // Call callback if provided
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
      }
    }
    
    // Update context metadata with response info
    context.updateMetadata('lastResponseTime', Date.now());
    if (response.metadata) {
      context.updateMetadata('lastResponseMetadata', response.metadata);
    }
  };
  
  /**
   * Add a user message to the conversation
   */
  const addUserMessage = (content: string) => {
    context.incrementMessageCount();
    history.addMessage({
      role: "user",
      content,
    });
    context.updateMetadata('lastUserMessageTime', Date.now());
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
  const reset = () => {
    history.clear();
    context.resetState();
    // Reset metrics
    const newContext = createConversationContext(options?.contextOptions);
    Object.assign(context, newContext);
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