/**
 * Event handlers for conversation context operations
 */
export interface ConversationContextHandlers {
  onStateChanged?: (key: string, newValue: any, oldValue: any) => Promise<void>;
  onStatesChanged?: (updates: Record<string, any>, oldState: Record<string, any>) => Promise<void>;
  onMetadataChanged?: (key: string, value: any) => Promise<void>;
  onReset?: () => Promise<void>;
}

/**
 * Options for creating a conversation context
 */
export interface ConversationContextOptions {
  initialState?: Record<string, any>;
  metadata?: Record<string, any>;
  sessionId?: string;
  userId?: string;
  handlers?: ConversationContextHandlers; // Event handlers
}

/**
 * Creates a conversation context manager - atomic primitive for managing conversation state
 * 
 * This primitive manages the contextual information for a conversation,
 * including state that persists across messages, metadata, and session info.
 */
export const createConversationContext = (options?: ConversationContextOptions) => {
  const config = {
    sessionId: options?.sessionId ?? `session-${Date.now()}`,
    userId: options?.userId,
  };
  
  // Internal state storage using closure
  const state: Record<string, any> = { ...(options?.initialState || {}) };
  const metadata: Record<string, any> = { ...(options?.metadata || {}) };
  
  // Track conversation metrics
  const metrics = {
    startTime: Date.now(),
    messageCount: 0,
    toolCallCount: 0,
  };
  
  /**
   * Update a state value
   */
  const updateState = async (key: string, value: any) => {
    const oldValue = state[key];
    state[key] = value;

    // Call handler if provided
    if (options?.handlers?.onStateChanged) {
      await options.handlers.onStateChanged(key, value, oldValue);
    }
  };
  
  /**
   * Update multiple state values at once
   */
  const updateStates = async (updates: Record<string, any>) => {
    const oldState = { ...state };
    Object.assign(state, updates);

    // Call handler if provided
    if (options?.handlers?.onStatesChanged) {
      await options.handlers.onStatesChanged(updates, oldState);
    }
  };
  
  /**
   * Get the current state
   */
  const getState = (): Record<string, any> => {
    // Return a copy to prevent external modifications
    return { ...state };
  };
  
  /**
   * Get a specific state value
   */
  const getStateValue = <T = any>(key: string): T | undefined => {
    return state[key] as T;
  };
  
  /**
   * Clear a state value
   */
  const clearStateValue = (key: string) => {
    delete state[key];
  };
  
  /**
   * Reset all state
   */
  const resetState = async () => {
    Object.keys(state).forEach(key => delete state[key]);

    // Call handler if provided
    if (options?.handlers?.onReset) {
      await options.handlers.onReset();
    }
  };
  
  /**
   * Update metadata
   */
  const updateMetadata = async (key: string, value: any) => {
    metadata[key] = value;

    // Call handler if provided
    if (options?.handlers?.onMetadataChanged) {
      await options.handlers.onMetadataChanged(key, value);
    }
  };
  
  /**
   * Get metadata
   */
  const getMetadata = (): Record<string, any> => {
    return { ...metadata };
  };
  
  /**
   * Increment message count
   */
  const incrementMessageCount = () => {
    metrics.messageCount++;
  };
  
  /**
   * Increment tool call count
   */
  const incrementToolCallCount = (count: number = 1) => {
    metrics.toolCallCount += count;
  };
  
  /**
   * Get conversation metrics
   */
  const getMetrics = () => {
    return {
      ...metrics,
      duration: Date.now() - metrics.startTime,
    };
  };
  
  /**
   * Get full context snapshot
   */
  const getSnapshot = () => {
    return {
      sessionId: config.sessionId,
      userId: config.userId,
      state: getState(),
      metadata: getMetadata(),
      metrics: getMetrics(),
    };
  };
  
  return {
    // State management
    updateState,
    updateStates,
    getState,
    getStateValue,
    clearStateValue,
    resetState,
    
    // Metadata management
    updateMetadata,
    getMetadata,
    
    // Metrics
    incrementMessageCount,
    incrementToolCallCount,
    getMetrics,
    
    // Utility
    getSnapshot,
    getSessionId: () => config.sessionId,
    getUserId: () => config.userId,
  };
};

/**
 * Type for the conversation context service
 */
export type ConversationContext = ReturnType<typeof createConversationContext>;