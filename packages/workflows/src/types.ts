import type {
  ConversationManager,
  ConversationContext,
  ConversationHistory,
  Agent,
} from "@mrck-labs/grid-core";

/**
 * Context provided to each workflow step
 */
export interface StepContext {
  // Core primitives
  manager: ConversationManager;
  context: ConversationContext;
  history: ConversationHistory;
  
  // Convenience methods
  addMessage: (content: string) => Promise<void>;
  getState: () => Record<string, any>;
  setState: (key: string, value: any) => Promise<void>;
  
  // Step metadata
  stepName: string;
  workflow?: Workflow;
}

/**
 * Function that executes within a workflow step
 */
export type StepFunction<TInput = any, TOutput = any> = (
  input: TInput,
  context: StepContext
) => Promise<TOutput>;

/**
 * Function that determines the next step based on result
 */
export type TransitionFunction<TResult = any> = (
  result: TResult
) => string | null;

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  name: string;
  type: "function" | "llm" | "conditional";
  execute: StepFunction;
  transition?: TransitionFunction;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  name?: string;
  description?: string;
  managerOptions?: {
    historyOptions?: {
      systemPrompt?: string;
      maxMessages?: number;
    };
    contextOptions?: any;
  };
}

/**
 * Workflow execution result
 */
export interface WorkflowResult<T = any> {
  finalResult: T;
  executedSteps: string[];
  state: Record<string, any>;
  history: any[]; // ChatMessage[]
  duration: number;
}

/**
 * Workflow checkpoint for suspend/resume
 */
export interface WorkflowCheckpoint {
  currentStep: string | null;
  state: Record<string, any>;
  history: any[]; // ChatMessage[]
  executedSteps: string[];
}

/**
 * Step builder interface for fluent API
 */
export interface StepBuilder {
  function<TInput = any, TOutput = any>(
    fn: StepFunction<TInput, TOutput>
  ): StepBuilder;
  
  llm(agent: Agent): StepBuilder;
  
  then(transition: TransitionFunction): StepBuilder;
  
  // Future extensions
  // parallel(...steps: string[]): StepBuilder;
  // retry(times: number): StepBuilder;
  // timeout(ms: number): StepBuilder;
}

/**
 * Main workflow interface
 */
export interface Workflow {
  step(name: string): StepBuilder;
  
  run<T = any>(
    initialStep: string,
    input?: any
  ): Promise<WorkflowResult<T>>;
  
  suspend(): Promise<WorkflowCheckpoint>;
  
  resume(checkpoint: WorkflowCheckpoint): Promise<void>;
  
  // Access to primitives if needed
  primitives: {
    manager: ConversationManager;
    context: ConversationContext;
    history: ConversationHistory;
  };
}