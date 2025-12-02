import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConversationHistory } from '../conversation-history.service';
import type { ChatMessage } from '../../types';
import { ConversationBuilder } from '../../../../../test/utils/mocks';

describe('ConversationHistory Service', () => {
  let history: ReturnType<typeof createConversationHistory>;

  beforeEach(() => {
    history = createConversationHistory();
  });

  describe('Basic Message Operations', () => {
    it('should initialize with optional system prompt', () => {
      const historyWithPrompt = createConversationHistory({
        systemPrompt: 'You are a helpful assistant',
      });
      
      const messages = historyWithPrompt.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant',
      });
    });

    it('should add messages in correct order', async () => {
      await history.addMessage({ role: 'user', content: 'Hello' });
      await history.addMessage({ role: 'assistant', content: 'Hi there!' });
      
      const messages = history.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].content).toBe('Hi there!');
    });

    it('should handle different message types', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant response' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              toolCallId: 'call-123',
              toolName: 'calculator',
              args: { expression: '2+2' },
            },
          ],
        },
      ];

      for (const msg of messages) {
        await history.addMessage(msg);
      }

      const stored = history.getMessages();
      expect(stored).toHaveLength(4);
      expect(stored[3].toolCalls).toBeDefined();
    });
  });

  describe('Tool Response Handling', () => {
    it('should add tool responses with correct format', async () => {
      await history.addToolResponse(
        'call-123',
        'calculator',
        { result: 4 }
      );

      const messages = history.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        role: 'tool',
        content: JSON.stringify({ result: 4 }),
        tool_call_id: 'call-123',
        tool_name: 'calculator',
      });
    });

    it('should handle string and object tool results', async () => {
      await history.addToolResponse('call-1', 'tool1', 'string result');
      await history.addToolResponse('call-2', 'tool2', { complex: 'object' });

      const messages = history.getMessages();
      expect(messages[0].content).toBe('"string result"');
      expect(messages[1].content).toBe(JSON.stringify({ complex: 'object' }));
    });
  });

  describe('Message Retrieval', () => {
    beforeEach(async () => {
      const builder = new ConversationBuilder()
        .withSystemMessage('System')
        .withUserMessage('User 1')
        .withAssistantMessage('Assistant 1')
        .withUserMessage('User 2')
        .withAssistantMessage('Assistant 2');
      
      for (const msg of builder.build()) {
        await history.addMessage(msg);
      }
    });

    it('should get last N messages', () => {
      const last2 = history.getLastNMessages(2);
      expect(last2).toHaveLength(2);
      expect(last2[0].content).toBe('User 2');
      expect(last2[1].content).toBe('Assistant 2');
    });

    it('should handle N larger than message count', () => {
      const messages = history.getLastNMessages(10);
      expect(messages).toHaveLength(5);
    });

    it('should get messages as XML format', () => {
      const xml = history.getMessageHistoryAsXml();
      expect(xml).toContain('<system>System</system>');
      expect(xml).toContain('<user>User 1</user>');
      expect(xml).toContain('<assistant>Assistant 1</assistant>');
      expect(xml.split('\n')).toHaveLength(5);
    });
  });

  describe('setMessages', () => {
    it('should replace all messages', async () => {
      await history.addMessage({ role: 'user', content: 'Old message' });
      
      const newMessages: ChatMessage[] = [
        { role: 'user', content: 'New message 1' },
        { role: 'assistant', content: 'New response' },
      ];
      
      await history.setMessages(newMessages);
      
      const messages = history.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('New message 1');
      expect(messages[1].content).toBe('New response');
    });

    it('should emit messageAdded event for each new message', async () => {
      const events: any[] = [];
      history.on('messageAdded', (event) => events.push(event));
      
      await history.setMessages([
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Message 2' },
      ]);
      
      expect(events).toHaveLength(2);
      expect(events[0].message.content).toBe('Message 1');
      expect(events[1].message.content).toBe('Message 2');
    });
  });

  describe('Event Handling', () => {
    it('should emit messageAdded event', async () => {
      const handler = vi.fn();
      history.on('messageAdded', handler);
      
      await history.addMessage({ role: 'user', content: 'Test' });
      
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({
        message: { role: 'user', content: 'Test' },
        index: 0,
        timestamp: expect.any(Number),
      });
    });

    it('should handle multiple event listeners', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      history.on('messageAdded', handler1);
      history.on('messageAdded', handler2);
      
      await history.addMessage({ role: 'user', content: 'Test' });
      
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('should remove event listeners', async () => {
      const handler = vi.fn();
      
      history.on('messageAdded', handler);
      history.off('messageAdded', handler);
      
      await history.addMessage({ role: 'user', content: 'Test' });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      await history.addMessage({ role: 'user', content: '' });
      
      const messages = history.getMessages();
      expect(messages[0].content).toBe('');
    });

    it('should handle special characters in content', async () => {
      const specialContent = 'Hello\n\t"World" with <tags> & symbols';
      await history.addMessage({ role: 'user', content: specialContent });
      
      const messages = history.getMessages();
      expect(messages[0].content).toBe(specialContent);
    });

    it('should maintain message integrity with complex tool calls', async () => {
      const complexMessage: ChatMessage = {
        role: 'assistant',
        content: 'Using multiple tools',
        toolCalls: [
          {
            toolCallId: 'call-1',
            toolName: 'search',
            args: { query: 'test query' },
          },
          {
            toolCallId: 'call-2',
            toolName: 'calculator',
            args: { expression: '5*5' },
          },
        ],
      };
      
      await history.addMessage(complexMessage);
      const stored = history.getMessages()[0];
      
      expect(stored.toolCalls).toHaveLength(2);
      expect(stored.toolCalls[0].toolName).toBe('search');
      expect(stored.toolCalls[1].toolName).toBe('calculator');
    });
  });

  describe('Performance', () => {
    it('should handle large number of messages efficiently', async () => {
      const messageCount = 1000;
      const start = Date.now();
      
      for (let i = 0; i < messageCount; i++) {
        await history.addMessage({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        });
      }
      
      const duration = Date.now() - start;
      const messages = history.getMessages();
      
      expect(messages).toHaveLength(messageCount);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should retrieve last N messages quickly from large history', async () => {
      // Add many messages
      for (let i = 0; i < 1000; i++) {
        await history.addMessage({
          role: 'user',
          content: `Message ${i}`,
        });
      }
      
      const start = Date.now();
      const last10 = history.getLastNMessages(10);
      const duration = Date.now() - start;
      
      expect(last10).toHaveLength(10);
      expect(last10[9].content).toBe('Message 999');
      expect(duration).toBeLessThan(10); // Should be instant
    });
  });
});