import { Langfuse } from "langfuse";
import type {
  CreateLangfuseServiceConfig,
  LangfuseGenerationOptions,
  LangfuseGenerationUpdate,
  LangfuseTraceOptions,
} from "./langfuse.types.js";

export const createLangfuseService = (
  config: CreateLangfuseServiceConfig = {}
) => {
  // Default configuration
  const defaultEnv = {
    LANGFUSE_ENABLED: process.env.LANGFUSE_ENABLED === "true",
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY || "",
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY || "",
    LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL || "",
    LANGFUSE_FLUSH_AT: Number(process.env.LANGFUSE_FLUSH_AT) || 1,
    LANGFUSE_FLUSH_INTERVAL:
      Number(process.env.LANGFUSE_FLUSH_INTERVAL) || 1000,
  };

  const defaultLogs = {
    onInfo: (message: string, data?: unknown) => console.info(message, data),
    onDebug: (message: string, data?: unknown) => console.debug(message, data),
    onWarn: (message: string, data?: unknown) => console.warn(message, data),
    onError: (message: string, data?: unknown) => console.error(message, data),
  };

  // Merge with provided config
  const mergedConfig = {
    env: { ...defaultEnv, ...config.env },
    logs: { ...defaultLogs, ...config.logs },
  };

  const { env, logs } = mergedConfig;
  // === SESSION & TRACE MANAGEMENT ===
  // In-memory storage for session-based tracing
  const sessionTraces = new Map<string, any>(); // sessionToken -> current trace
  const traceCounters = new Map<string, number>(); // sessionToken -> execution counter

  // Initialize Langfuse client with proper configuration
  const langfuse = (() => {
    if (!env.LANGFUSE_ENABLED) {
      logs.onInfo("🔍 Langfuse tracing is disabled");
      return null;
    }

    if (!env.LANGFUSE_SECRET_KEY || !env.LANGFUSE_PUBLIC_KEY) {
      logs.onWarn(
        "⚠️ Langfuse API keys not configured. Tracing will be disabled."
      );
      return null;
    }

    try {
      const client = new Langfuse({
        secretKey: env.LANGFUSE_SECRET_KEY!,
        publicKey: env.LANGFUSE_PUBLIC_KEY!,
        baseUrl: env.LANGFUSE_BASE_URL,
        flushAt: env.LANGFUSE_FLUSH_AT,
        flushInterval: env.LANGFUSE_FLUSH_INTERVAL,
      });

      logs.onInfo("🔍 Langfuse tracing initialized successfully", {
        baseUrl: env.LANGFUSE_BASE_URL,
        flushAt: env.LANGFUSE_FLUSH_AT,
        flushInterval: env.LANGFUSE_FLUSH_INTERVAL,
      });

      return client;
    } catch (error) {
      logs.onError("❌ Failed to initialize Langfuse:", error);
      return null;
    }
  })();

  /**
   * Check if Langfuse is available and enabled
   */
  const isEnabled = (): boolean => {
    return langfuse !== null && env.LANGFUSE_ENABLED;
  };

  /**
   * Create a new trace for tracking LLM operations
   */
  const createTrace = (options: LangfuseTraceOptions) => {
    if (!isEnabled()) {
      return createNoOpTrace();
    }

    try {
      const trace = langfuse!.trace({
        name: options.name || "llm-operation",
        sessionId: options.sessionId,
        userId: options.userId,
        metadata: {
          ...options.metadata,
          conversationId: options.conversationId,
          agentType: options.agentType,
        },
        tags: options.tags,
      });

      return {
        trace,
        createGeneration: (genOptions: LangfuseGenerationOptions) => {
          const generation = trace.generation({
            name: genOptions.name,
            model: genOptions.model,
            input: genOptions.input,
            metadata: genOptions.metadata,
          });

          return {
            generation,
            end: (update: LangfuseGenerationUpdate) => {
              try {
                const endParams: any = {
                  output: update.output,
                  usage: update.usage,
                };

                if (update.error) {
                  endParams.level = "ERROR";
                  endParams.statusMessage =
                    typeof update.error === "string"
                      ? update.error
                      : update.error.message;
                }

                generation.end(endParams);
              } catch (error) {
                logs.onError("Failed to end Langfuse generation:", error);
              }
            },
            update: (update: Partial<LangfuseGenerationUpdate>) => {
              try {
                generation.update({
                  output: update.output,
                  usage: update.usage,
                });
              } catch (error) {
                logs.onError("Failed to update Langfuse generation:", error);
              }
            },
          };
        },
        createSpan: (name: string, metadata?: Record<string, any>) => {
          const span = trace.span({
            name,
            metadata,
          });

          return {
            span,
            end: (output?: any, error?: Error | string) => {
              try {
                const endParams: any = {
                  output,
                };

                if (error) {
                  endParams.level = "ERROR";
                  endParams.statusMessage =
                    typeof error === "string" ? error : error.message;
                }

                span.end(endParams);
              } catch (err) {
                logs.onError("Failed to end Langfuse span:", err);
              }
            },
          };
        },
        end: (output?: any) => {
          try {
            trace.update({
              output,
            });
          } catch (error) {
            logs.onError("Failed to end Langfuse trace:", error);
          }
        },
      };
    } catch (error) {
      logs.onError("Failed to create Langfuse trace:", error);
      return createNoOpTrace();
    }
  };

  /**
   * Create a no-op trace that doesn't do anything
   * Used when Langfuse is disabled or fails to initialize
   */
  const createNoOpTrace = () => ({
    trace: null,
    traceName: null as string | null,
    executionNumber: 0,
    createGeneration: () => ({
      generation: null,
      end: () => {},
      update: () => {},
    }),
    createSpan: () => ({
      span: null,
      end: () => {},
    }),
    end: () => {},
  });

  /**
   * Calculate token usage cost based on model and usage
   */
  const calculateCost = (
    model: string,
    usage: { input?: number; output?: number; total?: number }
  ): { input: number; output: number; total: number } => {
    // Simplified cost calculation - you can expand this with actual pricing
    const costs: Record<string, { input: number; output: number }> = {
      "gpt-4o": { input: 0.0025, output: 0.01 }, // per 1K tokens
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "gpt-4-turbo": { input: 0.01, output: 0.03 },
      "claude-3-sonnet": { input: 0.003, output: 0.015 },
      "claude-3-haiku": { input: 0.00025, output: 0.00125 },
      "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
    };

    const modelCosts = costs[model] || { input: 0.001, output: 0.003 }; // fallback

    const inputCost = (usage.input || 0) * (modelCosts.input / 1000);
    const outputCost = (usage.output || 0) * (modelCosts.output / 1000);

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
    };
  };

  /**
   * Flush all pending events to Langfuse
   */
  const flush = async (): Promise<void> => {
    if (!isEnabled()) return;

    try {
      await langfuse!.flushAsync();
    } catch (error) {
      logs.onError("Failed to flush Langfuse events:", error);
    }
  };

  /**
   * Shutdown Langfuse client
   */
  const shutdown = async (): Promise<void> => {
    if (!isEnabled()) return;

    try {
      await langfuse!.shutdownAsync();
    } catch (error) {
      logs.onError("Failed to shutdown Langfuse:", error);
    }
  };

  /**
   * Create a score/feedback for a trace or generation
   */
  const createScore = async (options: {
    traceId?: string;
    generationId?: string;
    name: string;
    value: number;
    comment?: string;
    metadata?: Record<string, any>;
  }) => {
    if (!isEnabled()) return;

    try {
      await langfuse!.score({
        traceId: options.traceId || "",
        observationId: options.generationId,
        name: options.name,
        value: options.value,
        comment: options.comment,
      });
    } catch (error) {
      logs.onError("Failed to create Langfuse score:", error);
    }
  };

  // === SESSION & TRACE MANAGEMENT METHODS ===

  /**
   * Create a new execution trace for a session
   */
  const createExecutionTrace = (
    sessionToken: string,
    agentType: string,
    input: any,
    conversationId?: number,
    metadata?: Record<string, any>
  ) => {
    if (!isEnabled()) {
      return createNoOpTrace();
    }

    try {
      // Get or initialize counter for this session
      const currentCount = traceCounters.get(sessionToken) || 0;
      const newCount = currentCount + 1;
      traceCounters.set(sessionToken, newCount);

      // Create trace with sequential naming including agent type
      const traceName = `agent-${agentType}-execution-${newCount}`;

      const trace = langfuse!.trace({
        name: traceName,
        input,
        sessionId: sessionToken,
        metadata: {
          agentType,
          conversationId,
          executionNumber: newCount,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
        tags: ["agent-execution", agentType],
      });

      // Store current trace for this session
      sessionTraces.set(sessionToken, trace);

      logs.onInfo(`🔍 Created execution trace: ${traceName}`, {
        sessionToken,
        agentType,
        conversationId,
        executionNumber: newCount,
      });

      return {
        trace,
        traceName,
        executionNumber: newCount,
      };
    } catch (error) {
      logs.onError("Failed to create execution trace:", error);
      return createNoOpTrace();
    }
  };

  /**
   * Get current trace for a session
   */
  const getCurrentTrace = (sessionToken: string) => {
    return sessionTraces.get(sessionToken) || null;
  };

  /**
   * Create a span within the current trace for a session
   */
  const createSpanForSession = (
    sessionToken: string,
    spanName: string,
    metadata?: Record<string, any>,
    input?: any
  ) => {
    const trace = getCurrentTrace(sessionToken);
    if (!trace) {
      logs.onWarn(`No active trace found for session: ${sessionToken}`);
      return null;
    }

    try {
      const span = trace.span({
        name: spanName,
        metadata: {
          sessionToken,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
        input,
      });

      logs.onDebug(`🔍 Created span: ${spanName}`, {
        sessionToken,
      });

      return span;
    } catch (error) {
      logs.onError("Failed to create span:", error);
      return null;
    }
  };

  /**
   * Create a generation within the current trace for a session
   */
  const createGenerationForSession = (
    sessionToken: string,
    options: LangfuseGenerationOptions
  ) => {
    const trace = getCurrentTrace(sessionToken);
    if (!trace) {
      logs.onWarn(`No active trace found for session: ${sessionToken}`);
      return null;
    }

    try {
      const generation = trace.generation({
        name: options.name,
        model: options.model,
        input: options.input,
        metadata: {
          sessionToken,
          timestamp: new Date().toISOString(),
          ...options.metadata,
        },
      });

      logs.onDebug(`🔍 Created generation: ${options.name}`, {
        sessionToken,
        model: options.model,
      });

      return generation;
    } catch (error) {
      logs.onError("Failed to create generation:", error);
      return null;
    }
  };

  /**
   * Add an event to the current trace for a session
   */
  const addEventToSession = (
    sessionToken: string,
    eventName: string,
    properties?: Record<string, any>
  ) => {
    const trace = getCurrentTrace(sessionToken);
    if (!trace) {
      logs.onWarn(`No active trace found for session: ${sessionToken}`);
      return;
    }

    try {
      trace.event({
        name: eventName,
        metadata: {
          sessionToken,
          timestamp: new Date().toISOString(),
          ...properties,
        },
      });

      logs.onDebug(`🔍 Added event: ${eventName}`, {
        sessionToken,
      });
    } catch (error) {
      logs.onError("Failed to add event:", error);
    }
  };

  /**
   * End the current execution trace for a session
   */
  const endExecutionTrace = (
    sessionToken: string,
    output?: any,
    error?: Error | string
  ) => {
    const trace = getCurrentTrace(sessionToken);
    if (!trace) {
      logs.onWarn(`No active trace found for session: ${sessionToken}`);
      return;
    }

    try {
      const endParams: any = {
        output,
        metadata: {
          endTime: new Date().toISOString(),
        },
      };

      if (error) {
        endParams.level = "ERROR";
        endParams.statusMessage =
          typeof error === "string" ? error : error.message;
      }

      trace.update(endParams);

      logs.onInfo(`🔍 Ended execution trace for session: ${sessionToken}`, {
        hasError: !!error,
      });
    } catch (err) {
      logs.onError("Failed to end execution trace:", err);
    } finally {
      // Clean up current trace reference
      sessionTraces.delete(sessionToken);
    }
  };

  /**
   * Clean up session data (call when session expires)
   */
  const cleanupSession = (sessionToken: string) => {
    const trace = sessionTraces.get(sessionToken);
    if (trace) {
      // End trace if it's still active
      endExecutionTrace(sessionToken, null, "Session expired");
    }

    // Clean up counters
    traceCounters.delete(sessionToken);

    logs.onInfo(`🔍 Cleaned up session: ${sessionToken}`);
  };

  /**
   * Get session statistics (for debugging)
   */
  const getSessionStats = () => {
    return {
      activeSessions: sessionTraces.size,
      totalExecutions: Array.from(traceCounters.values()).reduce(
        (sum, count) => sum + count,
        0
      ),
      sessionTokens: Array.from(sessionTraces.keys()),
    };
  };

  return {
    isEnabled,
    createTrace,
    calculateCost,
    flush,
    shutdown,
    createScore,
    client: langfuse,
    // New session-based methods
    createExecutionTrace,
    getCurrentTrace,
    createSpanForSession,
    createGenerationForSession,
    addEventToSession,
    endExecutionTrace,
    cleanupSession,
    getSessionStats,
  };
};

export const langfuseService = createLangfuseService();
export type LangfuseService = typeof langfuseService;
