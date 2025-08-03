export interface MemoryEvent {
  timestamp: string;
  type: string;
  data: any;
  metadata?: {
    agentId?: string;
    userId?: string;
    conversationId?: string;
    [key: string]: any;
  };
}

export interface STMService {
  log: (event: Omit<MemoryEvent, 'timestamp'>) => Promise<void>;
  getLogPath: () => string;
}

export interface STMConfig {
  logPath?: string;
}