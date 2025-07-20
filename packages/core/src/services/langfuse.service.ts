import { Langfuse } from "langfuse";
import type { LangfuseTraceClient } from "langfuse";

export interface LangfuseConfig {
  secretKey?: string;
  publicKey?: string;
  baseUrl?: string;
  enabled?: boolean;
}

export interface LangfuseTraceContext {
  trace: LangfuseTraceClient;
  sessionId: string;
}

let langfuseInstance: Langfuse | null = null;
let activeTraceContext: LangfuseTraceContext | null = null;

export const initLangfuse = (config?: LangfuseConfig): Langfuse | null => {
  if (!config?.enabled) {
    return null;
  }

  const secretKey = config.secretKey || process.env.LANGFUSE_SECRET_KEY;
  const publicKey = config.publicKey || process.env.LANGFUSE_PUBLIC_KEY;
  const baseUrl = config.baseUrl || process.env.LANGFUSE_BASEURL;

  if (!secretKey || !publicKey) {
    console.warn("[Langfuse] Missing API keys. Tracing disabled.");
    return null;
  }

  try {
    langfuseInstance = new Langfuse({
      secretKey,
      publicKey,
      baseUrl,
    });
    console.log("[Langfuse] Initialized successfully");
    return langfuseInstance;
  } catch (error) {
    console.error("[Langfuse] Failed to initialize:", error);
    return null;
  }
};

export const getLangfuse = (): Langfuse | null => {
  return langfuseInstance;
};

export const startTrace = (name: string, sessionId?: string): LangfuseTraceContext | null => {
  const langfuse = getLangfuse();
  if (!langfuse) {
    return null;
  }

  try {
    const traceSessionId = sessionId || `session-${Date.now()}`;
    const trace = langfuse.trace({
      name,
      sessionId: traceSessionId,
      metadata: {
        startTime: new Date().toISOString(),
      },
    });

    activeTraceContext = {
      trace,
      sessionId: traceSessionId,
    };

    console.log(`[Langfuse] Started trace: ${name} (session: ${traceSessionId})`);
    return activeTraceContext;
  } catch (error) {
    console.error("[Langfuse] Failed to start trace:", error);
    return null;
  }
};

export const getActiveTrace = (): LangfuseTraceContext | null => {
  return activeTraceContext;
};

export const endTrace = (): void => {
  if (activeTraceContext) {
    try {
      // Langfuse automatically records end time when trace ends
      console.log(`[Langfuse] Ended trace (session: ${activeTraceContext.sessionId})`);
    } catch (error) {
      console.error("[Langfuse] Failed to end trace:", error);
    }
    activeTraceContext = null;
  }
};

export const shutdownLangfuse = async (): Promise<void> => {
  // End any active trace
  endTrace();
  
  if (langfuseInstance) {
    await langfuseInstance.shutdownAsync();
    langfuseInstance = null;
  }
};