import { z } from "zod";

/**
 * Trace context that flows through the system
 */
export interface TraceContext {
  traceId: string;
  spanId?: string;
  attributes?: Record<string, any>;
  startTime: number;
}

/**
 * Span context for nested operations
 */
export interface SpanContext {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  attributes?: Record<string, any>;
}

/**
 * Event to be recorded in a trace
 */
export interface TraceEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, any>;
  spanId?: string;
}

/**
 * Generation tracking for LLM calls
 */
export interface GenerationTrace {
  model: string;
  prompt: string | any;
  completion: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  duration: number;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    [key: string]: any;
  };
}

/**
 * Tool execution trace
 */
export interface ToolTrace {
  toolName: string;
  parameters: Record<string, any>;
  result: any;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Session information for grouping traces
 */
export interface SessionInfo {
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Observability provider interface
 */
export interface ObservabilityProvider {
  startTrace(name: string, context?: TraceContext): Promise<TraceContext>;
  endTrace(context: TraceContext): Promise<void>;
  
  startSpan(name: string, parentContext?: SpanContext | TraceContext): Promise<SpanContext>;
  endSpan(context: SpanContext, result?: any): Promise<void>;
  
  recordEvent(event: TraceEvent): Promise<void>;
  recordGeneration(generation: GenerationTrace, spanContext?: SpanContext): Promise<void>;
  recordToolExecution(tool: ToolTrace, spanContext?: SpanContext): Promise<void>;
  
  setSession(session: SessionInfo): void;
  flush(): Promise<void>;
}

/**
 * Configuration for observability
 */
export const ObservabilityConfigSchema = z.object({
  enabled: z.boolean().default(true),
  provider: z.custom<ObservabilityProvider>().optional(),
  sampling: z.number().min(0).max(1).default(1.0),
  filters: z.object({
    excludeTools: z.array(z.string()).default([]),
    excludeEvents: z.array(z.string()).default([]),
    sensitiveFields: z.array(z.string()).default([]),
  }).default({}),
  attributes: z.record(z.any()).default({}),
  debug: z.boolean().default(false),
});

export type ObservabilityConfig = z.infer<typeof ObservabilityConfigSchema>;

/**
 * Traced service interface - services that support tracing
 */
export interface TracedService {
  _isTraced: boolean;
  _traceConfig?: ObservabilityConfig;
}

/**
 * Helper to check if a service is traced
 */
export function isTracedService(service: any): service is TracedService {
  return service && service._isTraced === true;
}