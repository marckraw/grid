import type {
  Tool,
  ToolCall,
  ToolResponse,
  ToolResult,
  ToolExecutorOptions,
  ToolRegistryEntry,
  ToolExecutionContext,
} from "../types/tool.types.js";

/**
 * Default options for tool executor
 */
const DEFAULT_OPTIONS: Required<ToolExecutorOptions> = {
  maxRetries: 3,
  defaultTimeout: 30000, // 30 seconds
  validateBeforeExecute: true,
  formatErrors: true,
};

/**
 * Create a functional tool executor service
 */
export const createToolExecutor = (options?: ToolExecutorOptions) => {
  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Private tool registry
  const toolRegistry = new Map<string, ToolRegistryEntry>();
  
  /**
   * Register a tool
   */
  const registerTool = (tool: Tool): { success: boolean; error?: string } => {
    // Validate tool name
    if (!tool.name || typeof tool.name !== "string") {
      return { success: false, error: "Tool must have a valid name" };
    }
    
    // Check if already registered
    if (toolRegistry.has(tool.name)) {
      return { success: false, error: `Tool '${tool.name}' is already registered` };
    }
    
    // Add to registry
    toolRegistry.set(tool.name, {
      tool,
      addedAt: new Date(),
      executionCount: 0,
    });
    
    return { success: true };
  };
  
  /**
   * Unregister a tool
   */
  const unregisterTool = (toolName: string): boolean => {
    return toolRegistry.delete(toolName);
  };
  
  /**
   * Get all available tools
   */
  const getAvailableTools = (): Tool[] => {
    return Array.from(toolRegistry.values()).map(entry => entry.tool);
  };
  
  /**
   * Get a specific tool
   */
  const getTool = (toolName: string): Tool | undefined => {
    return toolRegistry.get(toolName)?.tool;
  };
  
  /**
   * Parse tool arguments safely
   */
  const parseToolArguments = (argumentsString: string): { success: boolean; data?: any; error?: string } => {
    try {
      const parsed = JSON.parse(argumentsString);
      return { success: true, data: parsed };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to parse arguments: ${error instanceof Error ? error.message : "Unknown error"}` 
      };
    }
  };
  
  /**
   * Validate tool call
   */
  const validateToolCall = (toolCall: ToolCall): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!toolCall.id) {
      errors.push("Tool call must have an id");
    }
    
    if (toolCall.type !== "function") {
      errors.push(`Tool call type must be 'function', got '${toolCall.type}'`);
    }
    
    if (!toolCall.function?.name) {
      errors.push("Tool call must have a function name");
    }
    
    if (!toolRegistry.has(toolCall.function?.name)) {
      errors.push(`Tool '${toolCall.function?.name}' not found`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
  
  /**
   * Execute a single tool call with retry logic
   */
  const executeWithRetry = async (
    tool: Tool,
    params: any,
    context: ToolExecutionContext
  ): Promise<ToolResult> => {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        // Set timeout
        const timeout = tool.metadata?.timeout || config.defaultTimeout;
        const timeoutPromise = new Promise<ToolResult>((_, reject) => {
          setTimeout(() => reject(new Error(`Tool execution timed out after ${timeout}ms`)), timeout);
        });
        
        // Execute tool
        const executionPromise = tool.execute(params);
        const result = await Promise.race([executionPromise, timeoutPromise]);
        
        // Success - update registry stats
        const entry = toolRegistry.get(tool.name);
        if (entry) {
          entry.executionCount++;
          entry.lastExecutedAt = new Date();
        }
        
        return {
          ...result,
          metadata: {
            ...result.metadata,
            executionTime: Date.now() - context.startTime,
            retryCount: attempt - 1,
          },
        };
      } catch (error) {
        lastError = error as Error;
        
        // Check if retryable
        if (!tool.metadata?.retryable || attempt === config.maxRetries) {
          break;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
    
    // All retries failed
    return {
      success: false,
      error: {
        message: lastError?.message || "Tool execution failed",
        code: "EXECUTION_FAILED",
        details: { attempts: config.maxRetries },
      },
      metadata: {
        executionTime: Date.now() - context.startTime,
        retryCount: config.maxRetries,
      },
    };
  };
  
  /**
   * Execute a tool call
   */
  const executeToolCall = async (
    toolCall: ToolCall,
    context?: Partial<ToolExecutionContext>
  ): Promise<ToolResponse> => {
    const executionContext: ToolExecutionContext = {
      toolCall,
      attempt: 1,
      startTime: Date.now(),
      ...context,
    };
    
    // Validate tool call
    if (config.validateBeforeExecute) {
      const validation = validateToolCall(toolCall);
      if (!validation.isValid) {
        return {
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: config.formatErrors
            ? JSON.stringify({ error: validation.errors.join(", ") })
            : validation.errors.join(", "),
        };
      }
    }
    
    // Get tool
    const tool = getTool(toolCall.function.name);
    if (!tool) {
      return {
        tool_call_id: toolCall.id,
        role: "tool",
        name: toolCall.function.name,
        content: config.formatErrors
          ? JSON.stringify({ error: `Tool '${toolCall.function.name}' not found` })
          : `Tool '${toolCall.function.name}' not found`,
      };
    }
    
    // Parse arguments
    const parseResult = parseToolArguments(toolCall.function.arguments);
    if (!parseResult.success) {
      return {
        tool_call_id: toolCall.id,
        role: "tool",
        name: toolCall.function.name,
        content: config.formatErrors
          ? JSON.stringify({ error: parseResult.error })
          : parseResult.error || "Failed to parse arguments",
      };
    }
    
    // Validate parameters if validator provided
    if (tool.validate) {
      const validationResult = tool.validate(parseResult.data);
      if (!validationResult.isValid) {
        return {
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: config.formatErrors
            ? JSON.stringify({ error: validationResult.errors?.join(", ") || "Validation failed" })
            : validationResult.errors?.join(", ") || "Validation failed",
        };
      }
    }
    
    // Execute tool
    const result = await executeWithRetry(tool, parseResult.data, executionContext);
    
    // Format response
    let content: string;
    if (result.success) {
      content = typeof result.data === "string" 
        ? result.data 
        : JSON.stringify(result.data);
    } else {
      content = config.formatErrors
        ? JSON.stringify({ error: result.error })
        : result.error?.message || "Tool execution failed";
    }
    
    return {
      tool_call_id: toolCall.id,
      role: "tool",
      name: toolCall.function.name,
      content,
    };
  };
  
  /**
   * Execute multiple tool calls in parallel
   */
  const executeToolCalls = async (
    toolCalls: ToolCall[],
    context?: Partial<ToolExecutionContext>
  ): Promise<ToolResponse[]> => {
    return Promise.all(
      toolCalls.map(toolCall => executeToolCall(toolCall, context))
    );
  };
  
  /**
   * Get tool execution statistics
   */
  const getToolStats = () => {
    const stats: Record<string, {
      executionCount: number;
      lastExecutedAt?: Date;
      addedAt: Date;
    }> = {};
    
    for (const [name, entry] of toolRegistry.entries()) {
      stats[name] = {
        executionCount: entry.executionCount,
        lastExecutedAt: entry.lastExecutedAt,
        addedAt: entry.addedAt,
      };
    }
    
    return stats;
  };
  
  /**
   * Clear all registered tools
   */
  const clearTools = () => {
    toolRegistry.clear();
  };
  
  // Return the service object
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
    validateToolCall,
    
    // Stats and debugging
    getToolStats,
    
    // Config access
    getConfig: () => ({ ...config }),
  };
};

/**
 * Type for the tool executor service
 */
export type ToolExecutor = ReturnType<typeof createToolExecutor>;