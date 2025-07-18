/**
 * Options for creating a conversation context
 */
export interface ConversationContextOptions {
  initialState?: Record<string, any>;
  metadata?: Record<string, any>;
  sessionId?: string;
  userId?: string;
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
  const updateState = (key: string, value: any) => {
    state[key] = value;
  };
  
  /**
   * Update multiple state values at once
   */
  const updateStates = (updates: Record<string, any>) => {
    Object.assign(state, updates);
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
  const resetState = () => {
    Object.keys(state).forEach(key => delete state[key]);
  };
  
  /**
   * Update metadata
   */
  const updateMetadata = (key: string, value: any) => {
    metadata[key] = value;
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