import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfigurableAgent } from '../../factories/agent.factory';
import { createToolExecutor } from '../../services/tool-executor.service';
import { agentFlowService } from '../../services/agent-flow.service';
import {
  MockLLMService,
  createMockTool,
  createTestContext,
  waitFor,
} from '../../../../../test/utils/mocks';
import type { ProgressMessage, AgentFlowContext } from '../../types';

describe('Agent Flow Integration', () => {
  let mockLLM: MockLLMService;
  let toolExecutor: ReturnType<typeof createToolExecutor>;
  let flowService: ReturnType<typeof agentFlowService>;
  let progressUpdates: ProgressMessage[];

  beforeEach(() => {
    mockLLM = new MockLLMService();
    toolExecutor = createToolExecutor();
    flowService = agentFlowService();
    progressUpdates = [];

    // Capture progress updates
    flowService.setSendFunction(async (update) => {
      progressUpdates.push(update);
    });
  });

  describe('Single Turn Conversations', () => {
    it('should execute simple question-answer flow', async () => {
      // Setup mock response
      mockLLM.mockResponse('What is 2+2?', {
        role: 'assistant',
        content: 'The answer is 4.',
      });

      // Create agent
      const agent = createConfigurableAgent({
        llmService: mockLLM,
        toolExecutor,
        config: {
          id: 'test-agent',
          type: 'general',
          version: '1.0.0',
          prompts: {
            system: 'You are a helpful math assistant.',
          },
          metadata: {
            id: 'test-agent',
            type: 'general',
            name: 'Test Agent',
            description: 'Agent for testing',
            capabilities: ['general'],
            version: '1.0.0',
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
        },
      });

      // Execute flow
      const context = createTestContext({
        userMessage: 'What is 2+2?',
        maxIterations: 1,
      });

      const response = await flowService.executeAgentIteration({
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        agent,
        context,
      });

      // Verify response
      expect(response.content).toBe('The answer is 4.');
      
      // Verify progress updates
      expect(progressUpdates).toHaveLength(1);
      expect(progressUpdates[0]).toEqual({
        type: 'llm_response',
        content: 'The answer is 4.',
      });

      // Verify LLM was called correctly
      const callHistory = mockLLM.getCallHistory();
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].messages).toContainEqual({
        role: 'system',
        content: 'You are a helpful math assistant.',
      });
    });
  });

  describe('Tool Usage Flow', () => {
    it('should execute agent flow with tool calls', async () => {
      // Create calculator tool
      const calculator = createMockTool({
        name: 'calculator',
        result: { result: 4 },
      });

      // Mock LLM to use tool
      mockLLM.mockResponse('What is 2+2?', {
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            toolCallId: 'call-123',
            toolName: 'calculator',
            args: { expression: '2+2' },
          },
        ],
      });

      // Mock LLM response after tool execution
      mockLLM.mockResponse(/.*tool.*/, {
        role: 'assistant',
        content: '2+2 equals 4.',
      });

      // Create agent with tool
      const agent = createConfigurableAgent({
        llmService: mockLLM,
        toolExecutor,
        config: {
          id: 'calc-agent',
          type: 'general',
          version: '1.0.0',
          prompts: {
            system: 'Use the calculator tool to solve math problems.',
          },
          metadata: {
            id: 'calc-agent',
            type: 'general',
            name: 'Calculator Agent',
            description: 'Agent with calculator',
            capabilities: ['general'],
            version: '1.0.0',
          },
          tools: {
            builtin: [],
            custom: [calculator],
            mcp: [],
          },
          behavior: {
            maxRetries: 3,
            responseFormat: 'text',
          },
        },
      });

      // Execute autonomous flow
      const context: AgentFlowContext = {
        userMessage: 'What is 2+2?',
        state: {},
        conversationId: 'test-123',
        maxIterations: 3,
      };

      await flowService.executeAutonomousFlow({
        agent,
        context,
        toolExecutor,
      });

      // Verify tool was called
      expect(calculator.execute).toHaveBeenCalledWith({ expression: '2+2' });
      
      // Verify progress updates
      const toolUpdates = progressUpdates.filter(u => u.type === 'tool_use');
      expect(toolUpdates).toHaveLength(1);
      expect(toolUpdates[0].content).toContain('calculator');

      // Verify final response
      const responses = progressUpdates.filter(u => u.type === 'llm_response');
      const finalResponse = responses[responses.length - 1];
      expect(finalResponse.content).toContain('4');
    });

    it('should handle tool execution errors gracefully', async () => {
      // Create failing tool
      const failingTool = createMockTool({
        name: 'failing_tool',
        error: new Error('Tool execution failed'),
      });

      // Mock LLM to use tool
      mockLLM.mockResponse('Test', {
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            toolCallId: 'call-fail',
            toolName: 'failing_tool',
            args: {},
          },
        ],
      });

      // Mock recovery response
      mockLLM.mockResponse(/error|failed/, {
        role: 'assistant',
        content: 'I encountered an error with the tool.',
      });

      const agent = createConfigurableAgent({
        llmService: mockLLM,
        toolExecutor,
        config: {
          id: 'error-agent',
          type: 'general',
          version: '1.0.0',
          prompts: {
            system: 'Handle errors gracefully.',
          },
          metadata: {
            id: 'error-agent',
            type: 'general',
            name: 'Error Agent',
            description: 'Agent for error testing',
            capabilities: ['general'],
            version: '1.0.0',
          },
          tools: {
            builtin: [],
            custom: [failingTool],
            mcp: [],
          },
          behavior: {
            maxRetries: 3,
            responseFormat: 'text',
          },
        },
      });

      const context = createTestContext();
      
      await flowService.executeAutonomousFlow({
        agent,
        context,
        toolExecutor,
      });

      // Verify error was handled
      const errorUpdates = progressUpdates.filter(u => 
        u.type === 'error' || u.content?.includes('error')
      );
      expect(errorUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-turn Autonomous Flow', () => {
    it('should handle multiple iterations with state management', async () => {
      // Setup multi-turn conversation
      const responses = [
        // First turn: gather information
        {
          role: 'assistant' as const,
          content: 'I need more information. What is the first number?',
        },
        // Second turn: get second number
        {
          role: 'assistant' as const,
          content: 'And what is the second number?',
        },
        // Third turn: provide result
        {
          role: 'assistant' as const,
          content: 'The sum of the numbers is 7.',
        },
      ];

      let responseIndex = 0;
      mockLLM.setDefaultResponse(responses[0]);
      mockLLM.runLLM = vi.fn(async (options) => {
        const response = responses[responseIndex % responses.length];
        responseIndex++;
        return response;
      });

      const agent = createConfigurableAgent({
        llmService: mockLLM,
        toolExecutor,
        config: {
          id: 'multi-turn-agent',
          type: 'general',
          version: '1.0.0',
          prompts: {
            system: 'Gather information step by step.',
          },
          metadata: {
            id: 'multi-turn-agent',
            type: 'general',
            name: 'Multi-turn Agent',
            description: 'Agent for multi-turn testing',
            capabilities: ['general'],
            version: '1.0.0',
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
        },
      });

      const context = createTestContext({
        userMessage: 'Add two numbers',
        maxIterations: 3,
      });

      await flowService.executeAutonomousFlow({
        agent,
        context,
        toolExecutor,
      });

      // Verify all iterations executed
      expect(mockLLM.runLLM).toHaveBeenCalledTimes(3);
      
      // Verify progress updates for each turn
      const llmResponses = progressUpdates.filter(u => u.type === 'llm_response');
      expect(llmResponses).toHaveLength(3);
      expect(llmResponses[2].content).toContain('7');
    });

    it('should respect maxIterations limit', async () => {
      // Mock LLM to always want to continue
      mockLLM.setDefaultResponse({
        role: 'assistant',
        content: 'I need to continue thinking...',
        toolCalls: [
          {
            toolCallId: 'call-infinite',
            toolName: 'think_more',
            args: {},
          },
        ],
      });

      const agent = createConfigurableAgent({
        llmService: mockLLM,
        toolExecutor,
        config: {
          id: 'infinite-agent',
          type: 'general',
          version: '1.0.0',
          prompts: {
            system: 'You love to think forever.',
          },
          metadata: {
            id: 'infinite-agent',
            type: 'general',
            name: 'Infinite Agent',
            description: 'Agent that wants to run forever',
            capabilities: ['general'],
            version: '1.0.0',
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
        },
      });

      const maxIterations = 5;
      const context = createTestContext({
        maxIterations,
      });

      await flowService.executeAutonomousFlow({
        agent,
        context,
        toolExecutor,
      });

      // Verify iteration limit was respected
      const llmCalls = mockLLM.getCallHistory();
      expect(llmCalls.length).toBeLessThanOrEqual(maxIterations);
      
      // Verify completion
      const completionUpdate = progressUpdates.find(u => 
        u.type === 'error' || u.content?.includes('iteration')
      );
      expect(completionUpdate).toBeDefined();
    });
  });

  describe('Custom Handlers', () => {
    it('should execute beforeAct and afterResponse handlers', async () => {
      const beforeAct = vi.fn(async (input, config) => input);
      const afterResponse = vi.fn(async (response, input) => response);

      mockLLM.mockResponse('Test', {
        role: 'assistant',
        content: 'Test response',
      });

      const agent = createConfigurableAgent({
        llmService: mockLLM,
        toolExecutor,
        config: {
          id: 'handler-agent',
          type: 'general',
          version: '1.0.0',
          prompts: {
            system: 'Test handlers.',
          },
          metadata: {
            id: 'handler-agent',
            type: 'general',
            name: 'Handler Agent',
            description: 'Agent with custom handlers',
            capabilities: ['general'],
            version: '1.0.0',
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
        },
        customHandlers: {
          beforeAct,
          afterResponse,
        },
      });

      const context = createTestContext();
      
      await flowService.executeAgentIteration({
        messages: [{ role: 'user', content: 'Test' }],
        agent,
        context,
      });

      // Verify handlers were called
      expect(beforeAct).toHaveBeenCalledOnce();
      expect(afterResponse).toHaveBeenCalledOnce();
      expect(afterResponse).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Test response' }),
        expect.any(Object)
      );
    });
  });
});