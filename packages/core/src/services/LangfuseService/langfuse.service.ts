import { Langfuse } from "langfuse";

export interface LangfuseTraceOptions {
  name?: string;
  sessionId?: string;
  userId?: string;
  conversationId?: number;
  agentType?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface LangfuseGenerationOptions {
  name: string;
  model: string;
  input: any;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface LangfuseGenerationUpdate {
  output?: any;
  usage?: {
    input?: number;
    output?: number;
    total?: number;
  };
  cost?: {
    input?: number;
    output?: number;
    total?: number;
  };
  error?: Error | string;
}

export interface CreateLangfuseServiceConfig {
  env?: {
    LANGFUSE_ENABLED: boolean;
    LANGFUSE_SECRET_KEY: string;
    LANGFUSE_PUBLIC_KEY: string;
    LANGFUSE_BASE_URL: string;
    LANGFUSE_FLUSH_AT: number;
    LANGFUSE_FLUSH_INTERVAL: number;
  };
}

export const createLangfuseService = (
  config: CreateLangfuseServiceConfig = {}
) => {
  const defaultEnv = {
    LANGFUSE_ENABLED: process.env.LANGFUSE_ENABLED === "true",
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY || "",
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY || "",
    LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL || "",
    LANGFUSE_FLUSH_AT: Number(process.env.LANGFUSE_FLUSH_AT) || 1,
    LANGFUSE_FLUSH_INTERVAL:
      Number(process.env.LANGFUSE_FLUSH_INTERVAL) || 1000,
  };

  // Merge with provided config
  const mergedConfig = {
    env: { ...defaultEnv, ...config.env },
  };

  // === SESSION & TRACE MANAGEMENT ===
  // In-memory storage for session-based tracing
  const sessionTraces = new Map<string, any>(); // sessionToken -> current trace
  const traceCounters = new Map<string, number>(); // sessionToken -> execution counter
  const sessionCurrentGenerations = new Map<string, any>(); // sessionToken -> current generation
  const sessionOpenSpans = new Map<string, Map<string, any>>(); // sessionToken -> Map<spanName, span>
  const sessionToolSpans = new Map<string, Map<string, any>>(); // sessionToken -> Map<toolCallId, span>

  // Normalize labels (spans, events, generation names) to kebab-case
  const normalizeLabel = (label: string): string =>
    String(label)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // replace groups of non-alnum chars with '-'
      .replace(/^-+|-+$/g, ""); // trim leading/trailing '-'

  // Initialize Langfuse client with proper configuration
  const langfuse = (() => {
    if (!mergedConfig.env.LANGFUSE_ENABLED) {
      console.info("🔍 Langfuse tracing is disabled");
      return null;
    }

    if (
      !mergedConfig.env.LANGFUSE_SECRET_KEY ||
      !mergedConfig.env.LANGFUSE_PUBLIC_KEY
    ) {
      console.warn(
        "⚠️ Langfuse API keys not configured. Tracing will be disabled."
      );
      return null;
    }

    try {
      const client = new Langfuse({
        secretKey: mergedConfig.env.LANGFUSE_SECRET_KEY!,
        publicKey: mergedConfig.env.LANGFUSE_PUBLIC_KEY!,
        baseUrl: mergedConfig.env.LANGFUSE_BASE_URL,
        flushAt: mergedConfig.env.LANGFUSE_FLUSH_AT,
        flushInterval: mergedConfig.env.LANGFUSE_FLUSH_INTERVAL,
      });

      console.info("🔍 Langfuse tracing initialized successfully", {
        baseUrl: mergedConfig.env.LANGFUSE_BASE_URL,
        flushAt: mergedConfig.env.LANGFUSE_FLUSH_AT,
        flushInterval: mergedConfig.env.LANGFUSE_FLUSH_INTERVAL,
      });

      return client;
    } catch (error) {
      console.error("❌ Failed to initialize Langfuse:", error);
      return null;
    }
  })();

  /**
   * Check if Langfuse is available and enabled
   */
  const isEnabled = (): boolean => {
    return langfuse !== null && mergedConfig.env.LANGFUSE_ENABLED;
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
                  metadata: update.cost ? { cost: update.cost } : undefined,
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
                console.error("Failed to end Langfuse generation:", error);
              }
            },
            update: (update: Partial<LangfuseGenerationUpdate>) => {
              try {
                const updateParams: any = {
                  output: update.output,
                  usage: update.usage,
                };
                if (update.cost) {
                  updateParams.metadata = { cost: update.cost };
                }
                generation.update(updateParams);
              } catch (error) {
                console.error("Failed to update Langfuse generation:", error);
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
                console.error("Failed to end Langfuse span:", err);
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
            console.error("Failed to end Langfuse trace:", error);
          }
        },
      };
    } catch (error) {
      console.error("Failed to create Langfuse trace:", error);
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
      console.error("Failed to flush Langfuse events:", error);
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
      console.error("Failed to shutdown Langfuse:", error);
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
      console.error("Failed to create Langfuse score:", error);
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

      console.info(`🔍 Created execution trace: ${traceName}`, {
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
      console.error("Failed to create execution trace:", error);
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
      console.warn(`No active trace found for session: ${sessionToken}`);
      return null;
    }

    try {
      const normalizedName = normalizeLabel(spanName);

      // If a span with the same name is already open for this session, reuse it
      const existingSpans = sessionOpenSpans.get(sessionToken);
      if (existingSpans && existingSpans.has(normalizedName)) {
        return existingSpans.get(normalizedName);
      }

      const span = trace.span({
        name: normalizedName,
        metadata: {
          sessionToken,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
        input,
      });

      // Track open span for this session
      let spansForSession = sessionOpenSpans.get(sessionToken);
      if (!spansForSession) {
        spansForSession = new Map<string, any>();
        sessionOpenSpans.set(sessionToken, spansForSession);
      }
      spansForSession.set(normalizedName, span);

      console.debug(`🔍 Created span: ${normalizedName}`, {
        sessionToken,
      });

      return span;
    } catch (error) {
      console.error("Failed to create span:", error);
      return null;
    }
  };

  /**
   * End a span within the current trace for a session
   */
  const endSpanForSession = (
    sessionToken: string,
    spanName: string,
    output?: any,
    error?: Error | string
  ) => {
    const normalizedName = normalizeLabel(spanName);
    const spansForSession = sessionOpenSpans.get(sessionToken);
    if (!spansForSession) {
      console.warn(`No open spans found for session: ${sessionToken}`);
      return;
    }

    const span = spansForSession.get(normalizedName);
    if (!span) {
      console.warn(
        `No span named "${normalizedName}" found for session: ${sessionToken}`
      );
      return;
    }

    try {
      const endParams: any = { output };
      if (error) {
        endParams.level = "ERROR";
        endParams.statusMessage =
          typeof error === "string" ? error : error.message;
      }
      span.end(endParams);
    } catch (err) {
      console.error("Failed to end Langfuse span:", err);
    } finally {
      spansForSession.delete(normalizedName);
      if (spansForSession.size === 0) {
        sessionOpenSpans.delete(sessionToken);
      }
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
      console.warn(`No active trace found for session: ${sessionToken}`);
      return null;
    }

    try {
      const generation = trace.generation({
        name: normalizeLabel(options.name),
        model: options.model,
        input: options.input,
        metadata: {
          sessionToken,
          timestamp: new Date().toISOString(),
          ...options.metadata,
        },
      });

      console.debug(`🔍 Created generation: ${options.name}`, {
        sessionToken,
        model: options.model,
      });

      // Track current generation for this session
      sessionCurrentGenerations.set(sessionToken, generation);

      return generation;
    } catch (error) {
      console.error("Failed to create generation:", error);
      return null;
    }
  };

  /**
   * Start a tool span keyed by toolCallId for vercel-native tool telemetry
   */
  const startToolSpanForSession = (
    sessionToken: string,
    toolCallId: string,
    toolName: string,
    args?: unknown
  ) => {
    const trace = getCurrentTrace(sessionToken);
    if (!trace || !toolCallId) return null;

    try {
      const spanName = `tool-${normalizeLabel(toolName || "unknown")}`;
      const span = trace.span({
        name: spanName,
        input: args,
        metadata: {
          sessionToken,
          toolCallId,
          toolName,
          timestamp: new Date().toISOString(),
        },
      });

      let toolSpans = sessionToolSpans.get(sessionToken);
      if (!toolSpans) {
        toolSpans = new Map<string, any>();
        sessionToolSpans.set(sessionToken, toolSpans);
      }
      toolSpans.set(toolCallId, span);

      return span;
    } catch (error) {
      console.error("Failed to start tool span:", error);
      return null;
    }
  };

  /**
   * End a tool span previously started via startToolSpanForSession
   */
  const endToolSpanForSession = (
    sessionToken: string,
    toolCallId: string,
    output?: unknown,
    error?: Error | string
  ) => {
    const toolSpans = sessionToolSpans.get(sessionToken);
    if (!toolSpans) return;
    const span = toolSpans.get(toolCallId);
    if (!span) return;

    try {
      const endParams: any = { output };
      if (error) {
        endParams.level = "ERROR";
        endParams.statusMessage =
          typeof error === "string" ? error : error.message;
      }
      span.end(endParams);
    } catch (err) {
      console.error("Failed to end tool span:", err);
    } finally {
      toolSpans.delete(toolCallId);
      if (toolSpans.size === 0) sessionToolSpans.delete(sessionToken);
    }
  };

  /**
   * Get current generation for a session
   */
  const getCurrentGeneration = (sessionToken: string) => {
    return sessionCurrentGenerations.get(sessionToken) || null;
  };

  /**
   * Update current generation for a session
   */
  const updateCurrentGenerationForSession = (
    sessionToken: string,
    update: Partial<LangfuseGenerationUpdate>
  ) => {
    const generation = getCurrentGeneration(sessionToken);
    if (!generation) {
      console.warn(`No active generation found for session: ${sessionToken}`);
      return;
    }

    try {
      const updateParams: any = {
        output: update.output,
        usage: update.usage,
      };
      if (update.cost) {
        updateParams.metadata = { cost: update.cost };
      }
      generation.update(updateParams);
    } catch (error) {
      console.error("Failed to update Langfuse generation:", error);
    }
  };

  /**
   * End current generation for a session
   */
  const endCurrentGenerationForSession = (
    sessionToken: string,
    update: LangfuseGenerationUpdate
  ) => {
    const generation = getCurrentGeneration(sessionToken);
    if (!generation) {
      console.warn(`No active generation found for session: ${sessionToken}`);
      return;
    }

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

      if (update.cost) {
        endParams.metadata = { cost: update.cost };
      }

      generation.end(endParams);
    } catch (error) {
      console.error("Failed to end Langfuse generation:", error);
    } finally {
      sessionCurrentGenerations.delete(sessionToken);
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
      console.warn(`No active trace found for session: ${sessionToken}`);
      return;
    }

    try {
      trace.event({
        name: normalizeLabel(eventName),
        metadata: {
          sessionToken,
          timestamp: new Date().toISOString(),
          ...properties,
        },
      });

      console.debug(`🔍 Added event: ${normalizeLabel(eventName)}`, {
        sessionToken,
      });
    } catch (error) {
      console.error("Failed to add event:", error);
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
      console.warn(`No active trace found for session: ${sessionToken}`);
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

      console.info(`🔍 Ended execution trace for session: ${sessionToken}`, {
        hasError: !!error,
      });
    } catch (err) {
      console.error("Failed to end execution trace:", err);
    } finally {
      // Clean up current trace reference
      sessionTraces.delete(sessionToken);
      sessionCurrentGenerations.delete(sessionToken);
      sessionOpenSpans.delete(sessionToken);
      sessionToolSpans.delete(sessionToken);
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
    sessionCurrentGenerations.delete(sessionToken);
    sessionOpenSpans.delete(sessionToken);
    sessionToolSpans.delete(sessionToken);

    console.info(`🔍 Cleaned up session: ${sessionToken}`);
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
    endSpanForSession,
    createGenerationForSession,
    getCurrentGeneration,
    updateCurrentGenerationForSession,
    endCurrentGenerationForSession,
    addEventToSession,
    startToolSpanForSession,
    endToolSpanForSession,
    endExecutionTrace,
    cleanupSession,
    getSessionStats,
  };
};

export const langfuseService = createLangfuseService();
export type LangfuseService = typeof langfuseService;

// Additional interfaces for session-based tracing
export interface ExecutionTraceResult {
  trace: any;
  traceName: string;
  executionNumber: number;
}

export interface SessionStats {
  activeSessions: number;
  totalExecutions: number;
  sessionTokens: string[];
}
