import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type {
  TraceContext,
  SpanContext,
  TraceEvent,
  GenerationTrace,
  ToolTrace,
  SessionInfo,
  ObservabilityProvider,
  ObservabilityConfig,
} from "../types/observability.types.js";

/**
 * Context storage for trace propagation
 */
const traceContextStorage = new AsyncLocalStorage<TraceContext>();
const spanContextStorage = new AsyncLocalStorage<SpanContext>();

/**
 * Create an observability service
 */
export const createObservabilityService = (config: ObservabilityConfig) => {
  let provider: ObservabilityProvider | null = config.provider || null;
  let currentSession: SessionInfo | null = null;
  const pendingEvents: TraceEvent[] = [];
  const activeSpans = new Map<string, SpanContext>();

  /**
   * Check if tracing is enabled
   */
  const isEnabled = () => {
    return config.enabled && provider !== null;
  };

  /**
   * Should trace based on sampling rate
   */
  const shouldSample = () => {
    return Math.random() < config.sampling;
  };

  /**
   * Filter sensitive data from attributes
   */
  const filterAttributes = (attributes: Record<string, any>): Record<string, any> => {
    const filtered = { ...attributes };
    
    config.filters.sensitiveFields.forEach(field => {
      if (field in filtered) {
        filtered[field] = "[REDACTED]";
      }
    });

    // Add global attributes
    Object.assign(filtered, config.attributes);

    return filtered;
  };

  /**
   * Start a new trace
   */
  const startTrace = async (name: string, attributes?: Record<string, any>): Promise<TraceContext | null> => {
    if (!isEnabled() || !shouldSample()) return null;

    const context: TraceContext = {
      traceId: randomUUID(),
      startTime: Date.now(),
      attributes: filterAttributes({
        ...attributes,
        name,
        sessionId: currentSession?.sessionId,
        userId: currentSession?.userId,
      }),
    };

    if (config.debug) {
      console.log(`[Observability] Starting trace: ${name} (${context.traceId})`);
    }

    try {
      const updatedContext = await provider!.startTrace(name, context);
      return updatedContext;
    } catch (error) {
      if (config.debug) {
        console.error("[Observability] Error starting trace:", error);
      }
      return context;
    }
  };

  /**
   * End a trace
   */
  const endTrace = async (context: TraceContext | null): Promise<void> => {
    if (!isEnabled() || !context) return;

    if (config.debug) {
      console.log(`[Observability] Ending trace: ${context.traceId}`);
    }

    try {
      await provider!.endTrace(context);
    } catch (error) {
      if (config.debug) {
        console.error("[Observability] Error ending trace:", error);
      }
    }
  };

  /**
   * Start a new span
   */
  const startSpan = async (
    name: string,
    attributes?: Record<string, any>,
    parentContext?: SpanContext | TraceContext
  ): Promise<SpanContext | null> => {
    if (!isEnabled()) return null;

    // Get parent context from async storage if not provided
    const parent = parentContext || spanContextStorage.getStore() || traceContextStorage.getStore();
    if (!parent) {
      if (config.debug) {
        console.warn(`[Observability] No parent context for span: ${name}`);
      }
      return null;
    }

    const context: SpanContext = {
      spanId: randomUUID(),
      traceId: parent.traceId,
      parentSpanId: 'spanId' in parent ? parent.spanId : parent.spanId,
      name,
      startTime: Date.now(),
      attributes: filterAttributes(attributes || {}),
    };

    activeSpans.set(context.spanId, context);

    if (config.debug) {
      console.log(`[Observability] Starting span: ${name} (${context.spanId})`);
    }

    try {
      const updatedContext = await provider!.startSpan(name, parent);
      return updatedContext;
    } catch (error) {
      if (config.debug) {
        console.error("[Observability] Error starting span:", error);
      }
      return context;
    }
  };

  /**
   * End a span
   */
  const endSpan = async (context: SpanContext | null, result?: any): Promise<void> => {
    if (!isEnabled() || !context) return;

    activeSpans.delete(context.spanId);

    if (config.debug) {
      console.log(`[Observability] Ending span: ${context.name} (${context.spanId})`);
    }

    try {
      await provider!.endSpan(context, result);
    } catch (error) {
      if (config.debug) {
        console.error("[Observability] Error ending span:", error);
      }
    }
  };

  /**
   * Record an event
   */
  const recordEvent = async (name: string, attributes?: Record<string, any>): Promise<void> => {
    if (!isEnabled()) return;

    // Check if event should be filtered
    if (config.filters.excludeEvents.includes(name)) return;

    const spanContext = spanContextStorage.getStore();
    const event: TraceEvent = {
      name,
      timestamp: Date.now(),
      attributes: filterAttributes(attributes || {}),
      spanId: spanContext?.spanId,
    };

    if (config.debug) {
      console.log(`[Observability] Recording event: ${name}`);
    }

    try {
      await provider!.recordEvent(event);
    } catch (error) {
      if (config.debug) {
        console.error("[Observability] Error recording event:", error);
      }
    }
  };

  /**
   * Record a generation (LLM call)
   */
  const recordGeneration = async (generation: GenerationTrace): Promise<void> => {
    if (!isEnabled()) return;

    const spanContext = spanContextStorage.getStore();

    if (config.debug) {
      console.log(`[Observability] Recording generation: ${generation.model}`);
    }

    try {
      await provider!.recordGeneration(generation, spanContext || undefined);
    } catch (error) {
      if (config.debug) {
        console.error("[Observability] Error recording generation:", error);
      }
    }
  };

  /**
   * Record a tool execution
   */
  const recordToolExecution = async (tool: ToolTrace): Promise<void> => {
    if (!isEnabled()) return;

    // Check if tool should be filtered
    if (config.filters.excludeTools.includes(tool.toolName)) return;

    const spanContext = spanContextStorage.getStore();

    if (config.debug) {
      console.log(`[Observability] Recording tool execution: ${tool.toolName}`);
    }

    try {
      await provider!.recordToolExecution(tool, spanContext || undefined);
    } catch (error) {
      if (config.debug) {
        console.error("[Observability] Error recording tool:", error);
      }
    }
  };

  /**
   * Set the current session
   */
  const setSession = (session: SessionInfo): void => {
    currentSession = session;
    if (provider && provider.setSession) {
      provider.setSession(session);
    }
  };

  /**
   * Run a function with a trace context
   */
  const withTrace = async <T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> => {
    const context = await startTrace(name, attributes);
    
    if (!context) {
      return fn();
    }

    try {
      const result = await traceContextStorage.run(context, fn);
      await endTrace(context);
      return result;
    } catch (error) {
      await endTrace(context);
      throw error;
    }
  };

  /**
   * Run a function with a span context
   */
  const withSpan = async <T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> => {
    const context = await startSpan(name, attributes);
    
    if (!context) {
      return fn();
    }

    try {
      const result = await spanContextStorage.run(context, fn);
      await endSpan(context, result);
      return result;
    } catch (error) {
      await endSpan(context, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  };

  /**
   * Get current trace context
   */
  const getCurrentTrace = (): TraceContext | undefined => {
    return traceContextStorage.getStore();
  };

  /**
   * Get current span context
   */
  const getCurrentSpan = (): SpanContext | undefined => {
    return spanContextStorage.getStore();
  };

  /**
   * Flush any pending data
   */
  const flush = async (): Promise<void> => {
    if (provider && provider.flush) {
      await provider.flush();
    }
  };

  return {
    // Context management
    startTrace,
    endTrace,
    startSpan,
    endSpan,
    
    // Event recording
    recordEvent,
    recordGeneration,
    recordToolExecution,
    
    // Session management
    setSession,
    
    // Helper methods
    withTrace,
    withSpan,
    getCurrentTrace,
    getCurrentSpan,
    
    // Utilities
    flush,
    isEnabled,
    
    // Configuration
    getConfig: () => ({ ...config }),
  };
};

export type ObservabilityService = ReturnType<typeof createObservabilityService>;