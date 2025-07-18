import type { Agent } from "../types/agent.types.js";
import type {
  AgentFlowContext,
  ChatMessage,
  ProgressMessage,
} from "../types/index.js";
import type { ToolExecutor } from "./tool-executor.service.js";
import type { ToolResult } from "../types/tool.types.js";

export const agentFlowService = () => {
  const testVariable = "test";
  let sendFunction: ((data: ProgressMessage) => Promise<void>) | null = null;

  const getTestVariable = () => {
    return testVariable;
  };

  /**
   * Set the global send function for streaming updates
   */
  const setSendFunction = (
    sendFn: (data: ProgressMessage) => Promise<void>
  ) => {
    sendFunction = sendFn;
  };

  /**
   * Send a progress update using the global send function and save to database
   */
  const sendUpdate = async (
    data: ProgressMessage,
    context?: AgentFlowContext
  ): Promise<void> => {
    if (sendFunction) {
      await sendFunction(data);
    }
  };

  /**
   * Execute a single agent iteration (LLM call + response handling)
   */
  const executeAgentIteration = async ({
    messages,
    agent,
    context,
  }: {
    messages: ChatMessage[];
    agent: Agent;
    context: AgentFlowContext;
  }) => {
    const response = await agent.act({
      messages,
      context,
    });

    await sendUpdate({
      type: "llm_response",
      content: response.content,
    });

    return response;
  };

  const executeAutonomousFlow = async ({
    agent,
    context,
    toolExecutor,
  }: {
    agent: Agent;
    context: AgentFlowContext;
    toolExecutor?: ToolExecutor;
  }): Promise<void> => {
    // Use context max iterations or default
    const maxIterations = context.maxIterations || 10;
    let iterations = 0;
    let shouldContinue = true;
    
    // Initialize conversation history
    const conversationHistory: ChatMessage[] = [];
    
    // Initialize state
    const flowState = context.state || {};
    
    // Add initial user message
    conversationHistory.push({
      role: "user",
      content: context.userMessage,
    });
    
    await sendUpdate({
      type: "notification",
      content: `Starting autonomous flow with max ${maxIterations} iterations`,
      metadata: { maxIterations },
    });
    
    while (shouldContinue && iterations < maxIterations) {
      iterations++;
      
      await sendUpdate({
        type: "thinking",
        content: `Processing iteration ${iterations}/${maxIterations}`,
        metadata: { iteration: iterations, state: flowState },
      });
      
      // Execute agent iteration with full context including state
      const response = await executeAgentIteration({
        messages: conversationHistory,
        agent,
        context: {
          ...context,
          state: flowState,
        },
      });
      
      // Add assistant response to history
      conversationHistory.push({
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
      });
      
      // Check if response has tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        await sendUpdate({
          type: "notification",
          content: `Agent requested ${response.toolCalls.length} tool call(s)`,
          metadata: { toolCalls: response.toolCalls },
        });
        
        // If continueOnToolCalls is false, stop here
        if (!context.continueOnToolCalls) {
          shouldContinue = false;
          await sendUpdate({
            type: "finished",
            content: "Stopping flow - tool calls require external handling",
            metadata: { toolCalls: response.toolCalls },
          });
          break;
        }
        
        // Execute tool calls if tool executor is provided
        if (toolExecutor) {
          try {
            // Execute all tool calls (ensure args is always present)
            const toolCallsWithArgs = response.toolCalls.map(tc => ({
              ...tc,
              args: tc.args ?? {}
            }));
            const toolResponses = await toolExecutor.executeToolCalls(
              toolCallsWithArgs,
              {
                agentId: agent.id,
              }
            );
            
            // Add tool responses to conversation history
            for (const toolResponse of toolResponses) {
              // Convert ToolResult to ChatMessage format
              conversationHistory.push({
                role: "tool",
                content: JSON.stringify(toolResponse.result),
                tool_call_id: toolResponse.toolCallId,
              });
              
              await sendUpdate({
                type: "tool_execution",
                content: `Tool executed: ${toolResponse.toolName}`,
                metadata: { 
                  toolCallId: toolResponse.toolCallId,
                  result: toolResponse.result,
                },
              });
            }
          } catch (toolError) {
            await sendUpdate({
              type: "error",
              content: `Tool execution failed: ${toolError instanceof Error ? toolError.message : "Unknown error"}`,
              metadata: { toolCalls: response.toolCalls },
            });
            
            // Continue despite tool errors for now
            // In future, we might want configurable behavior here
          }
        } else {
          // No tool executor provided, just log the requests
          for (const toolCall of response.toolCalls) {
            await sendUpdate({
              type: "tool_execution",
              content: `Tool requested (not executed): ${toolCall.toolName}`,
              metadata: { toolCall },
            });
          }
        }
      }
      
      // Check response metadata for flow control
      const responseMetadata = (response as any).metadata;
      if (responseMetadata) {
        // Check if task is complete
        if (responseMetadata.taskComplete) {
          shouldContinue = false;
          await sendUpdate({
            type: "finished",
            content: "Task completed successfully",
            metadata: { 
              iterations,
              finalResponse: response.content,
              state: flowState,
            },
          });
        }
        
        // Check if user input is needed
        else if (responseMetadata.needsUserInput) {
          shouldContinue = false;
          await sendUpdate({
            type: "notification",
            content: "Agent requires user input",
            metadata: { 
              question: response.content,
              state: flowState,
            },
          });
        }
        
        // Update state if provided
        if (responseMetadata.stateUpdate) {
          Object.assign(flowState, responseMetadata.stateUpdate);
          await sendUpdate({
            type: "notification",
            content: "State updated",
            metadata: { state: flowState },
          });
        }
      }
      
      // Simple completion check - if no tool calls and no explicit continuation
      if (!response.toolCalls || response.toolCalls.length === 0) {
        // If the response doesn't indicate continuation, we might be done
        if (!responseMetadata?.continueFlow) {
          // For now, continue unless explicitly told to stop
          // In future, we could add more sophisticated completion detection
        }
      }
    }
    
    // Check if we hit max iterations
    if (iterations >= maxIterations && shouldContinue) {
      await sendUpdate({
        type: "error",
        content: `Maximum iterations (${maxIterations}) reached`,
        metadata: { 
          iterations,
          state: flowState,
        },
      });
    }
    
    await sendUpdate({
      type: "finished",
      content: "Autonomous flow completed",
      metadata: {
        totalIterations: iterations,
        maxIterations,
        finalState: flowState,
        conversationLength: conversationHistory.length,
      },
    });
  };

  return {
    getTestVariable,
    setSendFunction,
    sendUpdate,
    executeAutonomousFlow,
  };
};
