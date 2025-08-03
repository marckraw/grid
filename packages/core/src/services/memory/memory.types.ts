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