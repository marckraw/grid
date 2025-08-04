import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createSimpleSTMService } from './stm.service.js';
import type { MemoryEvent } from './memory.types.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    appendFile: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
  }
}));

// Mock path module
vi.mock('path', () => ({
  dirname: vi.fn((p: string) => {
    const parts = p.split('/');
    parts.pop();
    return parts.join('/');
  }),
  default: {
    dirname: vi.fn((p: string) => {
      const parts = p.split('/');
      parts.pop();
      return parts.join('/');
    })
  }
}));

describe('createSimpleSTMService', () => {
  const mockFs = fs as any;
  const defaultLogPath = './memory/stm.jsonl';
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockFs.readFile.mockResolvedValue('');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create service with default log path', () => {
      const stm = createSimpleSTMService();
      expect(stm.getLogPath()).toBe(defaultLogPath);
    });

    it('should create service with custom log path', () => {
      const customPath = './custom/memory.jsonl';
      const stm = createSimpleSTMService({ logPath: customPath });
      expect(stm.getLogPath()).toBe(customPath);
    });
  });

  describe('log', () => {
    it('should create directory if it does not exist', async () => {
      const stm = createSimpleSTMService();
      
      await stm.log({
        type: 'test.event',
        data: { message: 'test' }
      });

      expect(mockFs.mkdir).toHaveBeenCalledWith('./memory', { recursive: true });
    });

    it('should append event with timestamp to log file', async () => {
      const stm = createSimpleSTMService();
      const testEvent = {
        type: 'test.event',
        data: { message: 'test' },
        metadata: { source: 'test' }
      };

      await stm.log(testEvent);

      expect(mockFs.appendFile).toHaveBeenCalled();
      const [filePath, content] = mockFs.appendFile.mock.calls[0];
      expect(filePath).toBe(defaultLogPath);
      
      const writtenEvent = JSON.parse(content.trim());
      expect(writtenEvent.type).toBe(testEvent.type);
      expect(writtenEvent.data).toEqual(testEvent.data);
      expect(writtenEvent.metadata).toEqual(testEvent.metadata);
      expect(writtenEvent.timestamp).toBeDefined();
      expect(new Date(writtenEvent.timestamp).toISOString()).toBe(writtenEvent.timestamp);
    });

    it('should handle file system errors gracefully', async () => {
      const stm = createSimpleSTMService();
      mockFs.appendFile.mockRejectedValueOnce(new Error('File system error'));

      await expect(stm.log({
        type: 'test.event',
        data: { message: 'test' }
      })).rejects.toThrow('File system error');
    });
  });

  describe('getRecent', () => {
    it('should return empty array when log file is empty', async () => {
      const stm = createSimpleSTMService();
      mockFs.readFile.mockResolvedValueOnce('');

      const events = await stm.getRecent();
      expect(events).toEqual([]);
    });

    it('should return events from the last 24 hours by default', async () => {
      const stm = createSimpleSTMService();
      const now = new Date();
      const events: MemoryEvent[] = [
        { timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(), type: 'recent', data: {} },
        { timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 25).toISOString(), type: 'old', data: {} },
        { timestamp: now.toISOString(), type: 'current', data: {} }
      ];

      mockFs.readFile.mockResolvedValueOnce(
        events.map(e => JSON.stringify(e)).join('\n')
      );

      const recentEvents = await stm.getRecent();
      expect(recentEvents).toHaveLength(2);
      expect(recentEvents[0].type).toBe('recent');
      expect(recentEvents[1].type).toBe('current');
    });

    it('should filter events by custom hours parameter', async () => {
      const stm = createSimpleSTMService();
      const now = new Date();
      const events: MemoryEvent[] = [
        { timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(), type: 'recent', data: {} },
        { timestamp: new Date(now.getTime() - 1000 * 60 * 90).toISOString(), type: 'old', data: {} }
      ];

      mockFs.readFile.mockResolvedValueOnce(
        events.map(e => JSON.stringify(e)).join('\n')
      );

      const recentEvents = await stm.getRecent(1); // Last 1 hour
      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].type).toBe('recent');
    });

    it('should handle malformed JSON lines gracefully', async () => {
      const stm = createSimpleSTMService();
      const validEvent: MemoryEvent = { 
        timestamp: new Date().toISOString(), 
        type: 'valid', 
        data: {} 
      };

      mockFs.readFile.mockResolvedValueOnce(
        `invalid json line\n${JSON.stringify(validEvent)}\n{broken json`
      );

      const events = await stm.getRecent();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('valid');
    });

    it('should handle file not found error', async () => {
      const stm = createSimpleSTMService();
      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });

      const events = await stm.getRecent();
      expect(events).toEqual([]);
    });
  });

  describe('getByType', () => {
    it('should filter events by type', async () => {
      const stm = createSimpleSTMService();
      const events: MemoryEvent[] = [
        { timestamp: new Date().toISOString(), type: 'conversation.user.message', data: { message: '1' } },
        { timestamp: new Date().toISOString(), type: 'conversation.agent.response', data: { message: '2' } },
        { timestamp: new Date().toISOString(), type: 'conversation.user.message', data: { message: '3' } }
      ];

      mockFs.readFile.mockResolvedValueOnce(
        events.map(e => JSON.stringify(e)).join('\n')
      );

      const userMessages = await stm.getByType('conversation.user.message');
      expect(userMessages).toHaveLength(2);
      expect(userMessages[0].data.message).toBe('1');
      expect(userMessages[1].data.message).toBe('3');
    });

    it('should respect limit parameter', async () => {
      const stm = createSimpleSTMService();
      const events: MemoryEvent[] = Array(10).fill(null).map((_, i) => ({
        timestamp: new Date().toISOString(),
        type: 'test.event',
        data: { index: i }
      }));

      mockFs.readFile.mockResolvedValueOnce(
        events.map(e => JSON.stringify(e)).join('\n')
      );

      const limitedEvents = await stm.getByType('test.event', 3);
      expect(limitedEvents).toHaveLength(3);
      // Should return the last 3 events (most recent)
      expect(limitedEvents[0].data.index).toBe(7);
      expect(limitedEvents[1].data.index).toBe(8);
      expect(limitedEvents[2].data.index).toBe(9);
    });

    it('should use default limit of 100', async () => {
      const stm = createSimpleSTMService();
      const events: MemoryEvent[] = Array(150).fill(null).map((_, i) => ({
        timestamp: new Date().toISOString(),
        type: 'test.event',
        data: { index: i }
      }));

      mockFs.readFile.mockResolvedValueOnce(
        events.map(e => JSON.stringify(e)).join('\n')
      );

      const limitedEvents = await stm.getByType('test.event');
      expect(limitedEvents).toHaveLength(100);
    });
  });

  describe('clear', () => {
    it('should delete the log file', async () => {
      const stm = createSimpleSTMService();
      
      await stm.clear();
      
      expect(mockFs.unlink).toHaveBeenCalledWith(defaultLogPath);
    });

    it('should handle file not found error gracefully', async () => {
      const stm = createSimpleSTMService();
      mockFs.unlink.mockRejectedValueOnce({ code: 'ENOENT' });

      // Should not throw
      await expect(stm.clear()).resolves.toBeUndefined();
    });

    it('should propagate other errors', async () => {
      const stm = createSimpleSTMService();
      mockFs.unlink.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(stm.clear()).rejects.toThrow('Permission denied');
    });
  });

  describe('edge cases', () => {
    it('should handle events with complex metadata', async () => {
      const stm = createSimpleSTMService();
      const complexEvent = {
        type: 'complex.event',
        data: {
          nested: {
            deeply: {
              value: 'test'
            }
          },
          array: [1, 2, 3],
          date: new Date().toISOString()
        },
        metadata: {
          source: 'test',
          tags: ['tag1', 'tag2'],
          priority: 5,
          custom: {
            field: 'value'
          }
        }
      };

      await stm.log(complexEvent);

      const [, content] = mockFs.appendFile.mock.calls[0];
      const writtenEvent = JSON.parse(content.trim());
      expect(writtenEvent.data).toEqual(complexEvent.data);
      expect(writtenEvent.metadata).toEqual(complexEvent.metadata);
    });

    it('should handle concurrent log operations', async () => {
      const stm = createSimpleSTMService();
      
      // Simulate concurrent writes
      const promises = Array(5).fill(null).map((_, i) => 
        stm.log({
          type: 'concurrent.event',
          data: { index: i }
        })
      );

      await Promise.all(promises);

      expect(mockFs.appendFile).toHaveBeenCalledTimes(5);
    });
  });
});