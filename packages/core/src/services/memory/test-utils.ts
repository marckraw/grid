import { vi, expect } from 'vitest';
import type { STMService, MTMService, MemoryEvent, MTMSummary } from './memory.types.js';

/**
 * Creates a mock STM service with default implementations
 */
export const createMockSTM = (overrides?: Partial<STMService>): STMService => ({
  log: vi.fn().mockResolvedValue(undefined),
  getRecent: vi.fn().mockResolvedValue([]),
  getByType: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(undefined),
  getLogPath: vi.fn(() => './memory/stm.jsonl'),
  ...overrides
});

/**
 * Creates a mock MTM service with default implementations
 */
export const createMockMTM = (overrides?: Partial<MTMService>): MTMService => ({
  summarizeDay: vi.fn().mockResolvedValue({
    date: new Date().toISOString().split('T')[0],
    extractedFacts: {},
    conversations: { count: 0, totalMessages: 0, avgLength: 0, topics: [] },
    eventStatistics: {},
    highlights: [],
    createdAt: new Date().toISOString()
  }),
  getSummary: vi.fn().mockResolvedValue(null),
  getSummaryMarkdown: vi.fn().mockResolvedValue(null),
  listSummaries: vi.fn().mockResolvedValue([]),
  searchFacts: vi.fn().mockResolvedValue([]),
  getStoragePath: vi.fn(() => './memory/mtm'),
  ...overrides
});

/**
 * Creates sample memory events for testing
 */
export const createSampleEvents = (count: number = 5): MemoryEvent[] => {
  const events: MemoryEvent[] = [];
  const baseTime = new Date();
  
  for (let i = 0; i < count; i++) {
    const isUser = i % 2 === 0;
    events.push({
      timestamp: new Date(baseTime.getTime() - i * 60000).toISOString(), // 1 minute apart
      type: isUser ? 'conversation.user.message' : 'conversation.agent.response',
      data: {
        message: isUser ? `User message ${i}` : `Agent response ${i}`,
        conversationId: 'test-conversation'
      },
      metadata: {
        source: isUser ? 'user' : 'agent',
        tags: i % 3 === 0 ? ['important'] : [],
        conversationId: 'test-conversation'
      }
    });
  }
  
  return events;
};

/**
 * Creates a sample conversation with alternating user/agent messages
 */
export const createSampleConversation = (messages: string[]): MemoryEvent[] => {
  const events: MemoryEvent[] = [];
  const baseTime = new Date();
  
  messages.forEach((message, i) => {
    const isUser = i % 2 === 0;
    events.push({
      timestamp: new Date(baseTime.getTime() + i * 1000).toISOString(), // 1 second apart
      type: isUser ? 'conversation.user.message' : 'conversation.agent.response',
      data: { message },
      metadata: {
        source: isUser ? 'user' : 'agent',
        conversationId: 'test-conv-' + Math.floor(i / 10) // Group every 10 messages
      }
    });
  });
  
  return events;
};

/**
 * Creates a sample MTM summary for testing
 */
export const createSampleMTMSummary = (date?: Date): MTMSummary => {
  const dateStr = (date || new Date()).toISOString().split('T')[0];
  
  return {
    date: dateStr,
    extractedFacts: {
      userName: 'TestUser',
      userPreferences: ['favorite color: blue', 'likes TypeScript'],
      keyTopics: ['programming', 'AI', 'testing'],
      importantEvents: ['Started new project', 'Learned about memory systems'],
      relationships: {
        occupation: 'Software Developer',
        project: 'Grid Framework'
      }
    },
    conversations: {
      count: 3,
      totalMessages: 25,
      avgLength: 45,
      topics: ['memory implementation', 'testing strategies']
    },
    eventStatistics: {
      'conversation.started': 3,
      'conversation.user.message': 12,
      'conversation.agent.response': 13,
      'memory.recalled': 5
    },
    highlights: [
      'Implemented memory system',
      'Added comprehensive tests',
      'Discussed architecture patterns'
    ],
    createdAt: new Date().toISOString()
  };
};

/**
 * Creates memory events with specific patterns for testing fact extraction
 */
export const createFactExtractionTestEvents = (): MemoryEvent[] => {
  const baseTime = new Date();
  
  return [
    {
      timestamp: new Date(baseTime.getTime()).toISOString(),
      type: 'conversation.user.message',
      data: { message: 'Hi, my name is Alice Johnson' }
    },
    {
      timestamp: new Date(baseTime.getTime() + 1000).toISOString(),
      type: 'conversation.agent.response',
      data: { message: 'Nice to meet you, Alice!' }
    },
    {
      timestamp: new Date(baseTime.getTime() + 2000).toISOString(),
      type: 'conversation.user.message',
      data: { message: 'My favorite programming language is TypeScript' }
    },
    {
      timestamp: new Date(baseTime.getTime() + 3000).toISOString(),
      type: 'conversation.user.message',
      data: { message: 'I am working on a machine learning project' }
    },
    {
      timestamp: new Date(baseTime.getTime() + 4000).toISOString(),
      type: 'conversation.user.message',
      data: { message: 'My favorite color is green and I love hiking' }
    }
  ];
};

/**
 * Helper to wait for async operations in tests
 */
export const waitForAsync = async (ms: number = 0): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Creates a mock file system for memory testing
 */
export const createMockFileSystem = () => {
  const files = new Map<string, string>();
  
  return {
    files,
    readFile: vi.fn((path: string) => {
      if (files.has(path)) {
        return Promise.resolve(files.get(path));
      }
      return Promise.reject({ code: 'ENOENT' });
    }),
    writeFile: vi.fn((path: string, content: string) => {
      files.set(path, content);
      return Promise.resolve();
    }),
    mkdir: vi.fn(() => Promise.resolve()),
    readdir: vi.fn((path: string) => {
      const dir = path.endsWith('/') ? path : path + '/';
      const filesInDir = Array.from(files.keys())
        .filter(f => f.startsWith(dir) && !f.slice(dir.length).includes('/'))
        .map(f => f.slice(dir.length));
      return Promise.resolve(filesInDir);
    }),
    unlink: vi.fn((path: string) => {
      if (files.has(path)) {
        files.delete(path);
        return Promise.resolve();
      }
      return Promise.reject({ code: 'ENOENT' });
    })
  };
};

/**
 * Asserts that a memory event has expected properties
 */
export const assertMemoryEvent = (
  event: MemoryEvent,
  expectedType: string,
  expectedDataFragment?: Record<string, any>
) => {
  expect(event).toBeDefined();
  expect(event.type).toBe(expectedType);
  expect(event.timestamp).toBeDefined();
  expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  
  if (expectedDataFragment) {
    Object.entries(expectedDataFragment).forEach(([key, value]) => {
      expect(event.data[key]).toBe(value);
    });
  }
};

/**
 * Creates a batch of events with different types for testing filtering
 */
export const createMixedEventTypes = (): MemoryEvent[] => {
  const types = [
    'conversation.started',
    'conversation.user.message',
    'conversation.agent.response',
    'conversation.ended',
    'memory.recalled',
    'tool.executed',
    'error.occurred'
  ];
  
  const events: MemoryEvent[] = [];
  const baseTime = new Date();
  
  types.forEach((type, i) => {
    // Create 2-3 events of each type
    const count = 2 + (i % 2);
    for (let j = 0; j < count; j++) {
      events.push({
        timestamp: new Date(baseTime.getTime() + (i * 1000) + (j * 100)).toISOString(),
        type,
        data: {
          index: i * 10 + j,
          type,
          iteration: j
        },
        metadata: {
          source: 'test',
          tags: type.split('.'),
          priority: i % 3
        }
      });
    }
  });
  
  // Shuffle to make it more realistic
  return events.sort(() => Math.random() - 0.5);
};