import type { Agent, AgentResponse } from "../types/agent.types.js";
import type { ProgressMessage } from "../types/progress.types.js";
import { createProgressMessage } from "../types/progress.types.js";
import {
  createConversationManager,
  type ConversationManagerOptions,
} from "./conversation-manager.service.js";

/**
 * Options for creating a conversation loop
 */
export interface ConversationLoopOptions {
  agent: Agent;
  conversationOptions?: ConversationManagerOptions;
  onMessage?: (response: AgentResponse) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
  onComplete?: (summary: any) => Promise<void>;
  onProgress?: (message: ProgressMessage) => Promise<void>;
  maxTurns?: number; // Optional limit on conversation turns
}

/**
 * Result from sending a message
 */
export interface SendMessageResult {
  response: AgentResponse;
  error?: Error;
  conversationEnded?: boolean;
}

/**
 * Creates a conversation loop - organism-level service for managing full conversations
 *
 * This is the highest-level primitive that orchestrates the entire conversation flow,
 * including agent interactions, tool execution, and state management.
 */
export const createConversationLoop = (options: ConversationLoopOptions) => {
  const { agent, onMessage, onError, onComplete, onProgress } = options;

  // Create conversation manager
  const manager = createConversationManager(options.conversationOptions);

  // Track conversation state
  let turnCount = 0;
  let isActive = true;

  /**
   * Send a progress update if handler is provided
   */
  const sendProgress = async (
    type: ProgressMessage["type"],
    content: string,
    metadata?: Record<string, any>
  ) => {
    if (onProgress) {
      const message = createProgressMessage(type, content, metadata);
      await onProgress(message);
    }
  };

  /**
   * Send a message and get response
   */
  const sendMessage = async (
    userMessage: string
  ): Promise<SendMessageResult> => {
    console.log("[ConversationLoop] sendMessage", userMessage);
    if (!isActive) {
      return {
        response: { role: "assistant", content: null },
        error: new Error("Conversation has ended"),
        conversationEnded: true,
      };
    }

    try {
      // Increment turn count
      turnCount++;

      // Add user message
      manager.addUserMessage(userMessage);

      // Send thinking progress
      await sendProgress("thinking", `Processing message (turn ${turnCount})`, {
        turnCount,
        userMessage,
      });

      // Get agent response with full conversation history
      const response = await agent.act({
        messages: manager.getMessages(),
        context: {
          userMessage,
          state: {
            ...manager.getState(),
            turnCount,
          },
        },
      });

      console.log("[ConversationLoop] response", response);

      // Send LLM response progress
      await sendProgress("llm_response", "Received response from agent", {
        hasContent: !!response.content,
        hasToolCalls: !!(response.toolCalls && response.toolCalls.length > 0),
      });

      // Process response (updates history and context)
      await manager.processAgentResponse(response);

      // Send tool execution progress if tools were executed
      if (response.metadata?.toolResponses) {
        for (const toolResponse of response.metadata.toolResponses) {
          await sendProgress(
            "tool_execution",
            `Tool executed: ${toolResponse.toolName}`,
            {
              toolName: toolResponse.toolName,
              toolCallId: toolResponse.toolCallId,
            }
          );
        }
      }

      // Call message callback if provided
      if (onMessage) {
        await onMessage(response);
      }

      // Check if we've hit max turns
      if (options.maxTurns && turnCount >= options.maxTurns) {
        isActive = false;
        if (onComplete) {
          await onComplete(manager.getSummary());
        }
      }

      return {
        response,
        conversationEnded: !isActive,
      };
    } catch (error) {
      // Handle errors
      const err = error instanceof Error ? error : new Error(String(error));

      // Send error progress
      await sendProgress("error", `Error in conversation: ${err.message}`, {
        error: err.message,
        turnCount,
      });

      if (onError) {
        await onError(err);
      }

      return {
        response: { role: "assistant", content: null },
        error: err,
      };
    }
  };

  /**
   * Send a message and wait for a complete response
   * The agent handles all tool execution internally, so we just send and receive
   * This respects the agent's autonomy and encapsulation
   */
  const sendMessageWithToolResolution = async (
    userMessage: string,
    maxToolRounds: number = 3 // Kept for API compatibility, not used
  ): Promise<SendMessageResult> => {
    // Agent is responsible for all tool execution
    // We just send the message and trust the agent to handle everything
    return sendMessage(userMessage);
  };

  /**
   * End the conversation
   */
  const endConversation = async () => {
    if (!isActive) return;

    isActive = false;

    // Send finished progress
    const summary = manager.getSummary();
    await sendProgress("finished", "Conversation ended", {
      totalMessages: summary.messageCount,
      duration: summary.duration,
    });

    if (onComplete) {
      await onComplete(summary);
    }
  };

  /**
   * Reset the conversation
   */
  const resetConversation = () => {
    manager.reset();
    turnCount = 0;
    isActive = true;
  };

  /**
   * Get conversation analytics
   */
  const getAnalytics = () => {
    const summary = manager.getSummary();
    const messages = manager.getMessages();

    // Calculate average message length
    const userMessages = messages.filter((m) => m.role === "user");
    const avgUserMessageLength =
      userMessages.length > 0
        ? userMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0) /
          userMessages.length
        : 0;

    return {
      ...summary,
      turnCount,
      isActive,
      avgUserMessageLength,
      hasToolCalls: messages.some((m) => m.toolCalls && m.toolCalls.length > 0),
    };
  };

  /**
   * Export conversation as JSON
   */
  const exportConversation = () => {
    return {
      messages: manager.getMessages(),
      state: manager.getState(),
      metadata: manager.getMetadata(),
      analytics: getAnalytics(),
      timestamp: new Date().toISOString(),
    };
  };

  /**
   * Import conversation from JSON
   */
  const importConversation = (data: any) => {
    // Reset first
    resetConversation();

    // Import messages
    if (data.messages && Array.isArray(data.messages)) {
      for (const message of data.messages) {
        if (message.role === "user") {
          manager.addUserMessage(message.content);
        } else {
          // For other message types, add directly to history
          manager.history.addMessage(message);
        }
      }
    }

    // Import state
    if (data.state) {
      manager.updateStates(data.state);
    }

    // Import metadata
    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        manager.updateMetadata(key, value);
      });
    }
  };

  return {
    // Core conversation methods
    sendMessage,
    sendMessageWithToolResolution,
    endConversation,
    resetConversation,

    // State access
    getMessages: manager.getMessages,
    getState: manager.getState,
    updateState: manager.updateState,
    getConversationState: manager.getConversationState,

    // Analytics and export
    getAnalytics,
    getSummary: manager.getSummary,
    exportConversation,
    importConversation,

    // Status
    isActive: () => isActive,
    getTurnCount: () => turnCount,
  };
};

/**
 * Type for the conversation loop service
 */
export type ConversationLoop = ReturnType<typeof createConversationLoop>;
