import type {
  ObservabilityProvider,
  TraceContext,
  SpanContext,
  TraceEvent,
  GenerationTrace,
  ToolTrace,
  SessionInfo,
} from "../types/observability.types.js";

export interface LangfuseProviderConfig {
  secretKey?: string;
  publicKey?: string;
  baseUrl?: string;
  debug?: boolean;
  flushInterval?: number;
  flushAt?: number;
  // Custom trace ingestion endpoint if needed
  ingestUrl?: string;
}

interface LangfuseTrace {
  id: string;
  timestamp: Date;
  name: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  userId?: string;
}

interface LangfuseGeneration {
  id: string;
  traceId: string;
  startTime: Date;
  endTime?: Date;
  name: string;
  model: string;
  prompt: any;
  completion?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  metadata?: Record<string, any>;
}

interface LangfuseEvent {
  id: string;
  traceId: string;
  name: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
}

/**
 * Create a Langfuse observability provider
 * 
 * This is a simplified implementation that collects traces and can be
 * extended to send them to Langfuse API or integrate with their SDK.
 */
export const createLangfuseProvider = (
  config: LangfuseProviderConfig = {}
): ObservabilityProvider => {
  const secretKey = config.secretKey || process.env.LANGFUSE_SECRET_KEY;
  const publicKey = config.publicKey || process.env.LANGFUSE_PUBLIC_KEY;
  const baseUrl = config.baseUrl || process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com";
  const debug = config.debug || false;

  // Track active traces, spans, and Langfuse-specific data
  const activeTraces = new Map<string, LangfuseTrace>();
  const activeSpans = new Map<string, SpanContext>();
  const pendingGenerations = new Map<string, LangfuseGeneration>();
  const eventBuffer: LangfuseEvent[] = [];
  let currentSession: SessionInfo | null = null;
  
  // Batch settings
  const batchSize = config.flushAt || 100;
  const flushInterval = config.flushInterval || 10000; // 10 seconds
  let flushTimer: NodeJS.Timeout | null = null;
  
  /**
   * Flush any pending data
   */
  const flush = async (): Promise<void> => {
    if (!secretKey || !publicKey) {
      if (debug) {
        console.log("[Langfuse] Skipping flush - no API keys configured");
      }
      return;
    }

    // In a real implementation, this would batch send to Langfuse API
    // For now, we just log and clear buffers
    if (debug) {
      console.log(`[Langfuse] Flushing ${eventBuffer.length} events, ${pendingGenerations.size} generations`);
    }

    // Clear buffers
    eventBuffer.length = 0;
    pendingGenerations.clear();
    
    // TODO: Implement actual API calls to Langfuse
    // This would involve:
    // 1. Batching traces, events, and generations
    // 2. Sending to Langfuse ingestion API
    // 3. Handling retries and errors
  };
  
  /**
   * Start flush timer
   */
  const startFlushTimer = () => {
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = setInterval(() => {
      flush().catch((err: any) => {
        if (debug) console.error("[Langfuse] Auto-flush error:", err);
      });
    }, flushInterval);
  };
  
  startFlushTimer();

  return {
    async startTrace(name: string, context?: TraceContext): Promise<TraceContext> {
      const traceContext = context || {
        traceId: crypto.randomUUID(),
        startTime: Date.now(),
        attributes: {},
      };

      // Create Langfuse trace
      const langfuseTrace: LangfuseTrace = {
        id: traceContext.traceId,
        timestamp: new Date(traceContext.startTime),
        name,
        metadata: traceContext.attributes,
        sessionId: currentSession?.sessionId,
        userId: currentSession?.userId,
      };

      // Store trace
      activeTraces.set(traceContext.traceId, langfuseTrace);

      if (debug) {
        console.log(`[Langfuse] Started trace: ${name} (${traceContext.traceId})`);
      }

      return traceContext;
    },

    async endTrace(context: TraceContext): Promise<void> {
      const trace = activeTraces.get(context.traceId);
      if (trace && debug) {
        console.log(`[Langfuse] Ended trace: ${trace.name} (${context.traceId})`);
      }
      
      // In a real implementation, this would send the trace to Langfuse
      // For now, we keep it in memory and flush periodically
      if (eventBuffer.length >= batchSize) {
        await flush();
      }
    },

    async startSpan(
      name: string,
      parentContext?: SpanContext | TraceContext
    ): Promise<SpanContext> {
      const spanContext: SpanContext = {
        spanId: crypto.randomUUID(),
        traceId: parentContext?.traceId || crypto.randomUUID(),
        parentSpanId: parentContext && 'spanId' in parentContext ? parentContext.spanId : undefined,
        name,
        startTime: Date.now(),
        attributes: {},
      };

      activeSpans.set(spanContext.spanId, spanContext);
      return spanContext;
    },

    async endSpan(context: SpanContext, result?: any): Promise<void> {
      activeSpans.delete(context.spanId);
      // Langfuse will handle span completion through OpenTelemetry
    },

    async recordEvent(event: TraceEvent): Promise<void> {
      const traceId = spanContextStorage.getStore()?.traceId || 
                     traceContextStorage.getStore()?.traceId;
      
      if (!traceId) {
        if (debug) console.warn("[Langfuse] No trace context for event:", event.name);
        return;
      }

      const langfuseEvent: LangfuseEvent = {
        id: crypto.randomUUID(),
        traceId,
        name: event.name,
        timestamp: new Date(event.timestamp),
        metadata: event.attributes,
        level: event.attributes?.level || "DEFAULT",
      };

      eventBuffer.push(langfuseEvent);
      
      if (debug) {
        console.log(`[Langfuse] Recorded event: ${event.name}`);
      }

      if (eventBuffer.length >= batchSize) {
        await flush();
      }
    },

    async recordGeneration(
      generation: GenerationTrace,
      spanContext?: SpanContext
    ): Promise<void> {
      const traceId = spanContext?.traceId || 
                     spanContextStorage.getStore()?.traceId || 
                     traceContextStorage.getStore()?.traceId;
      
      if (!traceId) {
        if (debug) console.warn("[Langfuse] No trace context for generation");
        return;
      }

      const langfuseGeneration: LangfuseGeneration = {
        id: crypto.randomUUID(),
        traceId,
        startTime: new Date(Date.now() - generation.duration),
        endTime: new Date(),
        name: `${generation.model} generation`,
        model: generation.model,
        prompt: generation.prompt,
        completion: generation.completion,
        promptTokens: generation.tokens?.prompt,
        completionTokens: generation.tokens?.completion,
        totalTokens: generation.tokens?.total,
        metadata: {
          ...generation.parameters,
          cost: generation.cost,
          duration: generation.duration,
        },
      };

      pendingGenerations.set(langfuseGeneration.id, langfuseGeneration);
      
      if (debug) {
        console.log(`[Langfuse] Recorded generation: ${generation.model}`);
      }

      if (pendingGenerations.size >= batchSize) {
        await flush();
      }
    },

    async recordToolExecution(
      tool: ToolTrace,
      spanContext?: SpanContext
    ): Promise<void> {
      const traceId = spanContext?.traceId || 
                     spanContextStorage.getStore()?.traceId || 
                     traceContextStorage.getStore()?.traceId;
      
      if (!traceId) {
        if (debug) console.warn("[Langfuse] No trace context for tool execution");
        return;
      }

      // Record tool execution as an event with detailed metadata
      const toolEvent: LangfuseEvent = {
        id: crypto.randomUUID(),
        traceId,
        name: `tool:${tool.toolName}`,
        timestamp: new Date(),
        metadata: {
          toolName: tool.toolName,
          parameters: tool.parameters,
          result: tool.result,
          duration: tool.duration,
          error: tool.error,
          ...tool.metadata,
        },
        level: tool.error ? "ERROR" : "DEFAULT",
      };

      eventBuffer.push(toolEvent);
      
      if (debug) {
        console.log(`[Langfuse] Recorded tool execution: ${tool.toolName}`);
      }

      if (eventBuffer.length >= batchSize) {
        await flush();
      }
    },

    setSession(session: SessionInfo): void {
      currentSession = session;
    },

    flush,
  };
};

// Import these for proper context access
import { AsyncLocalStorage } from "node:async_hooks";
const traceContextStorage = new AsyncLocalStorage<TraceContext>();
const spanContextStorage = new AsyncLocalStorage<SpanContext>();