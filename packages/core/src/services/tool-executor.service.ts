import type { Tool, ToolResult } from "../types/tool.types.js";
import type { ToolCall } from "../types/llm.types.js";
import type { ObservabilityService } from "./observability.service.js";
import type { ToolTrace } from "../types/observability.types.js";

/**
 * Tool executor options
 */
export interface ToolExecutorOptions {
  maxRetries?: number;
  defaultTimeout?: number;
  observability?: ObservabilityService;
}

/**
 * Create a tool executor service for Vercel AI SDK tools
 */
export const createToolExecutor = (options?: ToolExecutorOptions) => {
  const config = {
    maxRetries: options?.maxRetries ?? 3,
    defaultTimeout: options?.defaultTimeout ?? 30000,
  };
  
  const observability = options?.observability;

  // Registry of tools by name
  const toolRegistry = new Map<string, Tool<any, any>>();

  /**
   * Register a tool
   */
  const registerTool = (tool: Tool<any, any>) => {
    if (!tool.name) {
      throw new Error("Tool must have a name");
    }
    toolRegistry.set(tool.name, tool);
  };

  /**
   * Unregister a tool
   */
  const unregisterTool = (toolName: string) => {
    return toolRegistry.delete(toolName);
  };

  /**
   * Get all registered tools
   */
  const getAvailableTools = (): Tool<any, any>[] => {
    return Array.from(toolRegistry.values());
  };

  /**
   * Get a specific tool
   */
  const getTool = (toolName: string): Tool<any, any> | undefined => {
    return toolRegistry.get(toolName);
  };

  /**
   * Execute a single tool call
   */
  const executeToolCall = async (
    toolCall: ToolCall,
    context?: { agentId?: string }
  ): Promise<ToolResult> => {
    const startTime = Date.now();
    const tool = toolRegistry.get(toolCall.toolName);

    if (!tool) {
      // Record failed tool execution if observability is enabled
      if (observability) {
        const toolTrace: ToolTrace = {
          toolName: toolCall.toolName,
          parameters: toolCall.args,
          result: { error: `Tool '${toolCall.toolName}' not found` },
          duration: Date.now() - startTime,
          error: `Tool '${toolCall.toolName}' not found`,
          metadata: {
            toolCallId: toolCall.toolCallId,
            agentId: context?.agentId,
          },
        };
        await observability.recordToolExecution(toolTrace);
      }
      
      return {
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        result: {
          error: `Tool '${toolCall.toolName}' not found`,
        },
      };
    }

    try {
      // Execute the tool with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Tool execution timed out")),
          config.defaultTimeout
        );
      });

      const executePromise = tool.execute
        ? tool.execute(toolCall.args, {
            toolCallId: toolCall.toolCallId,
            messages: [], // Empty messages for now
          })
        : Promise.reject(new Error("Tool has no execute function"));

      const result = await Promise.race([executePromise, timeoutPromise]);

      // Record successful tool execution if observability is enabled
      if (observability) {
        const toolTrace: ToolTrace = {
          toolName: toolCall.toolName,
          parameters: toolCall.args,
          result,
          duration: Date.now() - startTime,
          metadata: {
            toolCallId: toolCall.toolCallId,
            agentId: context?.agentId,
          },
        };
        await observability.recordToolExecution(toolTrace);
      }

      return {
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Record failed tool execution if observability is enabled
      if (observability) {
        const toolTrace: ToolTrace = {
          toolName: toolCall.toolName,
          parameters: toolCall.args,
          result: { error: errorMessage },
          duration: Date.now() - startTime,
          error: errorMessage,
          metadata: {
            toolCallId: toolCall.toolCallId,
            agentId: context?.agentId,
            errorType: error instanceof Error ? error.constructor.name : "Unknown",
          },
        };
        await observability.recordToolExecution(toolTrace);
      }
      
      return {
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        result: {
          error: errorMessage,
        },
      };
    }
  };

  /**
   * Execute multiple tool calls
   */
  const executeToolCalls = async (
    toolCalls: ToolCall[],
    context?: { agentId?: string }
  ): Promise<ToolResult[]> => {
    // If observability is enabled, record batch execution event
    if (observability) {
      await observability.recordEvent("tool_batch_start", {
        toolCount: toolCalls.length,
        toolNames: toolCalls.map(tc => tc.toolName),
        agentId: context?.agentId,
      });
    }
    
    const results = await Promise.all(
      toolCalls.map((toolCall) => executeToolCall(toolCall, context))
    );
    
    // Record batch completion
    if (observability) {
      const successCount = results.filter(r => !r.result.error).length;
      await observability.recordEvent("tool_batch_complete", {
        toolCount: toolCalls.length,
        successCount,
        failureCount: toolCalls.length - successCount,
        agentId: context?.agentId,
      });
    }
    
    return results;
  };

  /**
   * Clear all tools
   */
  const clearTools = () => {
    toolRegistry.clear();
  };

  return {
    // Tool management
    registerTool,
    unregisterTool,
    getAvailableTools,
    getTool,
    clearTools,

    // Tool execution
    executeToolCall,
    executeToolCalls,

    // Config
    getConfig: () => ({ ...config }),
  };
};

/**
 * Type for the tool executor service
 */
export type ToolExecutor = ReturnType<typeof createToolExecutor>;
