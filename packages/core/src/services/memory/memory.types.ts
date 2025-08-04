/**
 * A signal/event that represents any memorable occurrence in the system.
 * This is agnostic to the source - could be from conversations, GitHub events,
 * calendar meetings, IoT sensors, or any other signal source.
 */
export interface MemoryEvent {
  timestamp: string;
  type: string; // e.g., 'github.pr.merged', 'meeting.transcript', 'sensor.motion', 'habit.completed'
  data: any; // The actual signal payload - completely flexible
  metadata?: {
    source?: string; // Where this signal came from (e.g., 'github', 'calendar', 'conversation')
    agentId?: string; // Which agent processed/created this
    userId?: string; // Associated user if applicable
    conversationId?: string; // Only if from a conversation
    priority?: number; // Signal importance (1-5)
    tags?: string[]; // For categorization (e.g., ['work', 'project-x', 'urgent'])
    [key: string]: any; // Any other metadata
  };
}

export interface STMService {
  log: (event: Omit<MemoryEvent, 'timestamp'>) => Promise<void>;
  getRecent: (hours?: number) => Promise<MemoryEvent[]>;
  getByType: (type: string, limit?: number) => Promise<MemoryEvent[]>;
  clear: () => Promise<void>;
  getLogPath: () => string;
}

export interface STMConfig {
  logPath?: string;
}

/**
 * Mid-Term Memory Summary - Daily condensed memory
 */
export interface MTMSummary {
  date: string; // YYYY-MM-DD
  extractedFacts: {
    userName?: string;
    userPreferences?: string[];
    keyTopics?: string[];
    importantEvents?: string[];
    relationships?: Record<string, string>; // e.g., { "project": "grid", "role": "developer" }
    [key: string]: any; // Extensible for domain-specific facts
  };
  conversations: {
    count: number;
    totalMessages: number;
    avgLength: number;
    topics: string[];
  };
  eventStatistics: Record<string, number>; // Event type counts
  highlights: string[]; // Key moments from the day
  createdAt: string;
}

export interface MTMService {
  summarizeDay: (date?: Date) => Promise<MTMSummary>;
  getSummary: (date: Date) => Promise<MTMSummary | null>;
  getSummaryMarkdown: (date: Date) => Promise<string | null>;
  listSummaries: () => Promise<string[]>; // List of dates
  searchFacts: (query: string) => Promise<MTMSummary[]>;
  getStoragePath: () => string;
}

export interface MTMConfig {
  storagePath?: string;
  llmService?: any; // For AI-powered summarization
}