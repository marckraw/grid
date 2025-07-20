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
  logs?: {
    onInfo: (message: string, data?: unknown) => void;
    onDebug: (message: string, data?: unknown) => void;
    onWarn: (message: string, data?: unknown) => void;
    onError: (message: string, data?: unknown) => void;
  };
}

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
