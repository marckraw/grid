import {
  createConversationManager,
  createConversationContext,
  type Agent,
} from "@mrck-labs/grid-core";

import type {
  Workflow,
  WorkflowConfig,
  WorkflowStep,
  StepBuilder,
  StepContext,
  WorkflowResult,
  WorkflowCheckpoint,
  StepFunction,
  TransitionFunction,
} from "./types.js";

/**
 * Creates a new workflow with injected conversation primitives
 */
export const createWorkflow = (config?: WorkflowConfig): Workflow => {
  // Create dedicated primitives for this workflow
  const manager = createConversationManager(config?.managerOptions);
  const workflowContext = createConversationContext();
  
  // Step registry
  const steps = new Map<string, WorkflowStep>();
  
  // Execution state
  let currentStep: string | null = null;
  let executedSteps: string[] = [];
  const startTime = Date.now();
  
  /**
   * Creates a step builder for fluent API
   */
  const createStepBuilder = (stepName: string): StepBuilder => {
    const builder: StepBuilder = {
      function: <TInput = any, TOutput = any>(
        fn: StepFunction<TInput, TOutput>
      ): StepBuilder => {
        steps.set(stepName, {
          name: stepName,
          type: "function",
          execute: fn,
        });
        return builder;
      },
      
      llm: (agent: Agent): StepBuilder => {
        const llmStep: StepFunction = async (input, context) => {
          // Prepare user message
          const userMessage = typeof input === "string" ? input : JSON.stringify(input);
          
          // Add to conversation history
          await context.manager.addUserMessage(userMessage);
          
          // Store step input in context
          await context.setState("workflow.stepInput", input);
          await context.setState("workflow.currentStep", stepName);
          
          // Get response from agent with proper context format
          const response = await agent.act({
            messages: context.manager.getMessages(),
            context: {
              userMessage,
              state: context.manager.getState(),
            },
          });
          
          // Process the response
          await context.manager.processAgentResponse(response);
          
          // Return the response content
          return response.content;
        };
        
        steps.set(stepName, {
          name: stepName,
          type: "llm",
          execute: llmStep,
        });
        return builder;
      },
      
      then: (transition: TransitionFunction): StepBuilder => {
        const step = steps.get(stepName);
        if (!step) {
          throw new Error(`Step ${stepName} not found`);
        }
        step.transition = transition;
        return builder;
      },
    };
    
    return builder;
  };
  
  /**
   * Executes the workflow from a given starting step
   */
  const run = async <T = any>(
    initialStep: string,
    input?: any
  ): Promise<WorkflowResult<T>> => {
    currentStep = initialStep;
    executedSteps = [];
    let stepInput = input;
    
    while (currentStep) {
      const step = steps.get(currentStep);
      if (!step) {
        throw new Error(`Step "${currentStep}" not found in workflow`);
      }
      
      // Update workflow context
      await workflowContext.updateState("workflow.currentStep", currentStep);
      await workflowContext.updateState("workflow.stepInput", stepInput);
      
      // Create step context with injected primitives
      const stepContext: StepContext = {
        manager,
        context: workflowContext,
        history: manager.history,
        
        // Convenience methods
        addMessage: manager.addUserMessage.bind(manager),
        getState: workflowContext.getState.bind(workflowContext),
        setState: workflowContext.updateState.bind(workflowContext),
        
        // Metadata
        stepName: currentStep,
      };
      
      try {
        // Execute the step
        console.log(`[Workflow] Executing step: ${currentStep}`);
        const result = await step.execute(stepInput, stepContext);
        
        // Store result in context
        await workflowContext.updateState(
          `steps.${currentStep}.result`,
          result
        );
        await workflowContext.updateState(
          `steps.${currentStep}.completedAt`,
          Date.now()
        );
        
        // Track executed step
        executedSteps.push(currentStep);
        
        // Determine next step
        if (step.transition) {
          currentStep = step.transition(result);
          console.log(`[Workflow] Transitioning to: ${currentStep || "END"}`);
        } else {
          currentStep = null; // End of workflow
        }
        
        // Pass result to next step
        stepInput = result;
      } catch (error) {
        console.error(`[Workflow] Error in step ${currentStep}:`, error);
        await workflowContext.updateState(
          `steps.${currentStep}.error`,
          error instanceof Error ? error.message : String(error)
        );
        throw error;
      }
    }
    
    return {
      finalResult: stepInput as T,
      executedSteps,
      state: workflowContext.getSnapshot().state,
      history: manager.getMessages(),
      duration: Date.now() - startTime,
    };
  };
  
  /**
   * Suspends the workflow execution
   */
  const suspend = async (): Promise<WorkflowCheckpoint> => {
    return {
      currentStep,
      state: workflowContext.getSnapshot().state,
      history: manager.getMessages(),
      executedSteps: [...executedSteps],
    };
  };
  
  /**
   * Resumes workflow from a checkpoint
   */
  const resume = async (checkpoint: WorkflowCheckpoint): Promise<void> => {
    currentStep = checkpoint.currentStep;
    executedSteps = checkpoint.executedSteps;
    
    // Restore conversation history
    await manager.history.setMessages(checkpoint.history);
    
    // Restore context state
    for (const [key, value] of Object.entries(checkpoint.state)) {
      await workflowContext.updateState(key, value);
    }
  };
  
  // Return the workflow interface
  return {
    step: createStepBuilder,
    run,
    suspend,
    resume,
    primitives: {
      manager,
      context: workflowContext,
      history: manager.history,
    },
  };
};