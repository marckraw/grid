import type { ProgressMessage } from "../types/progress.types.js";
import {
  createConversationLoop,
  type ConversationLoopOptions,
  type SendMessageResult,
} from "./conversation-loop.service.js";

/**
 * Extended options for conversation flow with additional features
 */
export interface ConversationFlowOptions extends ConversationLoopOptions {
  maxIterations?: number; // Maximum iterations for safety (prevents infinite loops)
  enableProgressStreaming?: boolean; // Enable/disable progress streaming
  debugMode?: boolean; // Enable debug logging
}

/**
 * Flow state tracking
 */
interface FlowState {
  iterations: number;
  startTime: number;
  lastIterationTime: number;
}

/**
 * Creates an enhanced conversation flow service
 *
 * This service extends the conversation loop with:
 * - Iteration tracking for safety
 * - Enhanced progress streaming
 * - Flow state management
 * - Debug capabilities
 */
export const createConversationFlow = (options: ConversationFlowOptions) => {
  const {
    maxIterations = 50, // Default safety limit
    enableProgressStreaming = true,
    debugMode = false,
    ...loopOptions
  } = options;

  // Flow state
  const flowState: FlowState = {
    iterations: 0,
    startTime: Date.now(),
    lastIterationTime: Date.now(),
  };

  // Wrap onProgress to add flow-specific metadata
  const enhancedOnProgress = options.onProgress
    ? async (message: ProgressMessage) => {
        if (!enableProgressStreaming) return;

        // Add flow metadata to all progress messages
        const enhancedMessage: ProgressMessage = {
          ...message,
          metadata: {
            ...message.metadata,
            flowState: {
              iterations: flowState.iterations,
              elapsedTime: Date.now() - flowState.startTime,
            },
          },
        };

        if (debugMode) {
          console.log(`[ConversationFlow] ${message.type}: ${message.content}`);
        }

        console.log("[ConversationFlow] enhancedMessage", enhancedMessage);

        await options.onProgress!(enhancedMessage);
      }
    : undefined;

  // Create base conversation loop with enhanced progress
  const conversationLoop = createConversationLoop({
    ...loopOptions,
    onProgress: enhancedOnProgress,
  });

  /**
   * Send a message with iteration tracking
   */
  const sendMessage = async (
    userMessage: string
  ): Promise<SendMessageResult> => {
    // Check iteration limit
    if (flowState.iterations >= maxIterations) {
      const error = new Error(
        `Maximum iterations (${maxIterations}) reached - safety limit`
      );

      if (options.onError) {
        await options.onError(error);
      }

      if (enhancedOnProgress) {
        await enhancedOnProgress({
          type: "error",
          content: error.message,
          metadata: { maxIterations, currentIterations: flowState.iterations },
        });
      }

      return {
        response: { role: "assistant", content: null },
        error,
        conversationEnded: true,
      };
    }

    // Increment iteration count
    flowState.iterations++;
    flowState.lastIterationTime = Date.now();

    if (enhancedOnProgress) {
      await enhancedOnProgress({
        type: "iteration",
        content: `Starting iteration ${flowState.iterations}`,
        metadata: {
          iteration: flowState.iterations,
          maxIterations,
        },
      });
    }

    // Delegate to base conversation loop
    return conversationLoop.sendMessage(userMessage);
  };

  /**
   * Send a message with tool resolution and iteration tracking
   */
  const sendMessageWithToolResolution = async (
    userMessage: string,
    maxToolRounds: number = 3
  ): Promise<SendMessageResult> => {
    // Each tool round counts as an iteration
    const availableIterations = maxIterations - flowState.iterations;
    const actualMaxRounds = Math.min(maxToolRounds, availableIterations);

    if (actualMaxRounds <= 0) {
      return sendMessage(userMessage); // Will trigger iteration limit error
    }

    return conversationLoop.sendMessageWithToolResolution(
      userMessage,
      actualMaxRounds
    );
  };

  /**
   * Get flow statistics
   */
  const getFlowStats = () => {
    return {
      iterations: flowState.iterations,
      maxIterations,
      elapsedTime: Date.now() - flowState.startTime,
      averageIterationTime:
        flowState.iterations > 0
          ? (Date.now() - flowState.startTime) / flowState.iterations
          : 0,
      remainingIterations: maxIterations - flowState.iterations,
    };
  };

  /**
   * Reset flow state (keeps conversation history)
   */
  const resetFlowState = () => {
    flowState.iterations = 0;
    flowState.startTime = Date.now();
    flowState.lastIterationTime = Date.now();
  };

  /**
   * Check if we can continue (not at iteration limit)
   */
  const canContinue = (): boolean => {
    return flowState.iterations < maxIterations && conversationLoop.isActive();
  };

  return {
    // Overridden methods with flow enhancements
    sendMessage,
    sendMessageWithToolResolution,

    // Flow-specific methods
    getFlowStats,
    resetFlowState,
    canContinue,

    // Delegated methods from conversation loop
    endConversation: conversationLoop.endConversation,
    resetConversation: conversationLoop.resetConversation,
    getMessages: conversationLoop.getMessages,
    getState: conversationLoop.getState,
    updateState: conversationLoop.updateState,
    getConversationState: conversationLoop.getConversationState,
    getAnalytics: conversationLoop.getAnalytics,
    getSummary: conversationLoop.getSummary,
    exportConversation: conversationLoop.exportConversation,
    importConversation: conversationLoop.importConversation,
    isActive: conversationLoop.isActive,
    getTurnCount: conversationLoop.getTurnCount,
  };
};

/**
 * Type for the conversation flow service
 */
export type ConversationFlow = ReturnType<typeof createConversationFlow>;
