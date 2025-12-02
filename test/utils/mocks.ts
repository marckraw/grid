import { vi } from 'vitest';
import type {
  LLMService,
  LLMServiceOptions,
  ChatMessage,
  Tool,
  Agent,
  AgentConfig,
  ToolCall,
} from '@mrck-labs/grid-core';
import { createNamedTool } from '@mrck-labs/grid-core';
import { z } from 'zod';

/**
 * Mock LLM Service for deterministic testing
 */
export class MockLLMService implements LLMService {
  private responses = new Map<string, ChatMessage>();
  private callHistory: LLMServiceOptions[] = [];
  private defaultResponse: ChatMessage = {
    role: 'assistant',
    content: 'Mock response',
  };

  /**
   * Register a mock response for a specific input
   */
  mockResponse(trigger: string | RegExp, response: ChatMessage): void {
    const key = trigger instanceof RegExp ? trigger.source : trigger;
    this.responses.set(key, response);
  }

  /**
   * Set default response for unmatched inputs
   */
  setDefaultResponse(response: ChatMessage): void {
    this.defaultResponse = response;
  }

  /**
   * Get call history for assertions
   */
  getCallHistory(): LLMServiceOptions[] {
    return this.callHistory;
  }

  /**
   * Clear all mocks and history
   */
  reset(): void {
    this.responses.clear();
    this.callHistory = [];
  }

  async runLLM(options: LLMServiceOptions): Promise<ChatMessage> {
    this.callHistory.push(options);

    // Find last user message for matching
    const lastUserMessage = options.messages
      .filter(m => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return this.defaultResponse;
    }

    // Check for exact match first
    if (this.responses.has(lastUserMessage.content)) {
      return this.responses.get(lastUserMessage.content)!;
    }

    // Check for regex matches
    for (const [pattern, response] of this.responses) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(lastUserMessage.content)) {
          return response;
        }
      } catch {
        // Not a valid regex, skip
      }
    }

    return this.defaultResponse;
  }

  async *streamLLM(options: LLMServiceOptions) {
    const response = await this.runLLM(options);
    yield response;
  }
}

/**
 * Create a mock tool for testing
 */
export const createMockTool = <T = any>({
  name,
  result,
  error,
  delay = 0,
}: {
  name: string;
  result?: T;
  error?: Error;
  delay?: number;
}): Tool => {
  return createNamedTool({
    name,
    description: `Mock tool: ${name}`,
    parameters: z.object({
      input: z.any().optional(),
    }),
    execute: vi.fn(async (params) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      if (error) {
        throw error;
      }
      return result ?? `Mock result from ${name}`;
    }),
  });
};

/**
 * Create a mock agent for testing
 */
export const createMockAgent = ({
  id = 'mock-agent',
  responses = new Map<string, string>(),
}: {
  id?: string;
  responses?: Map<string, string>;
} = {}): Agent => {
  return {
    act: vi.fn(async ({ messages, context }) => {
      const lastMessage = messages[messages.length - 1];
      const content = responses.get(lastMessage.content) || 'Mock agent response';
      
      return {
        role: 'assistant' as const,
        content,
      };
    }),
    config: {
      id,
      type: 'general',
      version: '1.0.0',
      prompts: {
        system: 'Mock agent system prompt',
      },
      tools: {
        builtin: [],
        custom: [],
        mcp: [],
      },
      behavior: {
        maxRetries: 3,
        responseFormat: 'text',
      },
      metadata: {
        id,
        type: 'general',
        name: 'Mock Agent',
        description: 'Agent for testing',
        capabilities: ['general'],
        version: '1.0.0',
      },
    } as AgentConfig,
  };
};

/**
 * Builder pattern for creating test conversations
 */
export class ConversationBuilder {
  private messages: ChatMessage[] = [];

  withSystemMessage(content: string): this {
    this.messages.push({ role: 'system', content });
    return this;
  }

  withUserMessage(content: string): this {
    this.messages.push({ role: 'user', content });
    return this;
  }

  withAssistantMessage(content: string, toolCalls?: ToolCall[]): this {
    const message: ChatMessage = { role: 'assistant', content };
    if (toolCalls) {
      message.toolCalls = toolCalls;
    }
    this.messages.push(message);
    return this;
  }

  withToolResponse({
    toolCallId,
    toolName,
    result,
  }: {
    toolCallId: string;
    toolName: string;
    result: any;
  }): this {
    this.messages.push({
      role: 'tool',
      content: JSON.stringify(result),
      tool_call_id: toolCallId,
      tool_name: toolName,
    });
    return this;
  }

  build(): ChatMessage[] {
    return [...this.messages];
  }

  static simple(): ConversationBuilder {
    return new ConversationBuilder()
      .withSystemMessage('You are a helpful assistant')
      .withUserMessage('Hello')
      .withAssistantMessage('Hi! How can I help you?');
  }
}

/**
 * Wait for a condition with timeout
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  {
    timeout = 5000,
    interval = 100,
  }: {
    timeout?: number;
    interval?: number;
  } = {}
): Promise<void> => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

/**
 * Capture events from an EventEmitter
 */
export const captureEvents = <T = any>(emitter: any, eventName: string) => {
  const events: T[] = [];
  const handler = (event: T) => events.push(event);
  
  emitter.on(eventName, handler);
  
  return {
    events,
    stop: () => emitter.off(eventName, handler),
    waitForCount: (count: number) => 
      waitFor(() => events.length >= count),
  };
};

/**
 * Create a test context for agent flow
 */
export const createTestContext = (overrides: any = {}) => {
  return {
    userMessage: 'Test message',
    state: {},
    conversationId: 'test-conversation',
    maxIterations: 5,
    ...overrides,
  };
};