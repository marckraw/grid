import type { Agent, AgentResponse } from "../types/agent.types.js";
import type { ProgressMessage } from "../types/progress.types.js";
import type { ChatMessage } from "../types/llm.types.js";
import { createProgressMessage } from "../types/progress.types.js";
import {
  createConversationManager,
  type ConversationManagerOptions,
  type ConversationManagerHandlers,
} from "./conversation-manager.service.js";
import type { ConversationHistoryHandlers } from "./conversation-history.service.js";
import type { ConversationContextHandlers } from "./conversation-context.service.js";

/**
 * Event handlers for conversation loop operations
 */
export interface ConversationLoopHandlers {
  onConversationStarted?: (context: {
    sessionId?: string;
    userId?: string;
    conversationId?: string;
  }) => Promise<{ initialMessages?: ChatMessage[] }>;
  onMessageSent?: (message: string, context: any) => Promise<void>;
  onResponseReceived?: (response: AgentResponse, context: any) => Promise<void>;
  onConversationEnded?: (summary: any, context: any) => Promise<void>;
}

/**
 * Grouped handlers for all conversation services
 */
export interface GroupedHandlers {
  loop?: ConversationLoopHandlers;
  manager?: ConversationManagerHandlers;
  history?: ConversationHistoryHandlers;
  context?: ConversationContextHandlers;
}

/**
 * History modes for conversation loop
 */
export type HistoryMode = "full" | "none" | "last-n";

/**
 * Options for creating a conversation loop
 */
export interface ConversationLoopOptions {
  agent: Agent;
  handlers?: GroupedHandlers; // Grouped handlers for all services
  onMessage?: (response: AgentResponse) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
  onComplete?: (summary: any) => Promise<void>;
  onProgress?: (message: ProgressMessage) => Promise<void>;
  maxTurns?: number; // Optional limit on conversation turns
  historyMode?: HistoryMode; // How to handle message history (default: 'full')
  historyLimit?: number; // For 'last-n' mode (default: 5)
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
  const {
    agent,
    onMessage,
    onError,
    onComplete,
    onProgress,
    handlers,
    historyMode = "full",
    historyLimit = 5,
  } = options;

  // Mutable history mode state
  let currentHistoryMode = historyMode;
  let currentHistoryLimit = historyLimit;

  // Extract handlers from grouped structure
  const loopHandlers = handlers?.loop;

  // Build manager options from grouped handlers using the new grouped format
  const managerOptions: ConversationManagerOptions | undefined = handlers
    ? {
        handlers: {
          manager: handlers.manager,
          history: handlers.history,
          context: handlers.context,
        },
      }
    : undefined;

  // Create conversation manager with extracted options
  const manager = createConversationManager(managerOptions);

  // Track conversation state
  let turnCount = 0;
  let isActive = true;
  let isInitialized = false;

  // Initialize conversation with handler if provided
  const initializeConversation = async () => {
    if (!isInitialized && loopHandlers?.onConversationStarted) {
      const context = {
        sessionId: manager.context.getSessionId(),
        userId: manager.context.getUserId(),
        conversationId: manager.context.getSessionId(), // Use session ID as conversation ID
      };

      const result = await loopHandlers.onConversationStarted(context);

      // Add initial messages if provided
      if (result?.initialMessages) {
        for (const message of result.initialMessages) {
          await manager.history.addMessage(message);
        }
      }

      isInitialized = true;
    }
  };

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
    // Initialize if needed
    await initializeConversation();

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
      await manager.addUserMessage(userMessage);

      // Call handler if provided
      if (loopHandlers?.onMessageSent) {
        const context = {
          turnCount,
          sessionId: manager.context.getSessionId(),
          userId: manager.context.getUserId(),
        };
        await loopHandlers.onMessageSent(userMessage, context);
      }

      // Send thinking progress
      await sendProgress("thinking", `Processing message (turn ${turnCount})`, {
        turnCount,
        userMessage,
      });

      // Get messages based on history mode
      const getMessagesForAgent = (): ChatMessage[] => {
        const allMessages = manager.getMessages();

        switch (currentHistoryMode) {
          case "none":
            // Only current user message - agent must use memory tools!
            return [{ role: "user" as const, content: userMessage }];

          case "last-n":
            // Last N messages (not including the current one that was just added)
            const lastN = allMessages.slice(-(currentHistoryLimit + 1));
            return lastN.length > 0
              ? lastN
              : [{ role: "user" as const, content: userMessage }];

          case "full":
          default:
            // Current behavior - all messages
            return allMessages;
        }
      };

      // Get agent response with configured message history
      const response = await agent.act({
        messages: getMessagesForAgent(),
        context: {
          userMessage,
          state: {
            ...manager.getState(),
            turnCount,
            historyMode: currentHistoryMode,
          },
        },
      });

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

      // Call handler if provided
      if (loopHandlers?.onResponseReceived) {
        const context = {
          turnCount,
          sessionId: manager.context.getSessionId(),
          userId: manager.context.getUserId(),
        };
        await loopHandlers.onResponseReceived(response, context);
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

    // Call handler if provided
    if (loopHandlers?.onConversationEnded) {
      const context = {
        turnCount,
        sessionId: manager.context.getSessionId(),
        userId: manager.context.getUserId(),
      };
      await loopHandlers.onConversationEnded(summary, context);
    }
  };

  /**
   * Reset the conversation
   */
  const resetConversation = () => {
    manager.reset();
    turnCount = 0;
    isActive = true;
    isInitialized = false; // Reset initialization flag
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

  /**
   * Set the history mode for the conversation
   */
  const setHistoryMode = (mode: HistoryMode, limit?: number) => {
    currentHistoryMode = mode;
    if (limit !== undefined) {
      currentHistoryLimit = limit;
    }
  };

  /**
   * Get the current history mode configuration
   */
  const getHistoryMode = () => ({
    mode: currentHistoryMode,
    limit: currentHistoryLimit,
  });

  return {
    // Core conversation methods
    sendMessage,
    endConversation,
    resetConversation,

    // Message management methods
    addUserMessage: manager.addUserMessage,
    addMessage: manager.history.addMessage,
    addMessages: manager.history.addMessages,
    addToolResponse: manager.history.addToolResponse,
    processAgentResponse: manager.processAgentResponse,

    // State access
    getMessages: manager.getMessages,
    updateState: manager.updateState,
    getConversationState: manager.getConversationState,

    // Analytics and export
    getAnalytics,
    getSummary: manager.getSummary,
    exportConversation,
    importConversation,

    // Status
    setIsActive: (isActive: boolean) => {
      isActive = isActive;
    },
    isActive: () => isActive,
    getTurnCount: () => turnCount,

    // History mode management
    setHistoryMode,
    getHistoryMode,

    // Direct access to primitives for advanced use cases
    manager,
  };
};

/**
 * Type for the conversation loop service
 */
export type ConversationLoop = ReturnType<typeof createConversationLoop>;
