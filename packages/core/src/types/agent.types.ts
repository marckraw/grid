import z from "zod";
import { AgentFlowContextSchema, type ProgressMessage } from "./index.js";
import { ChatMessageSchema } from "./llm.types.js";
import type {
  VoiceConfig,
  VoiceService,
  AudioResult,
  TranscriptionResult,
  VoiceOptions,
  TranscribeOptions,
} from "./voice.types.js";

export const AgentTypeSchema = z.enum([
  "general",
  "scribe",
  "rephraser",
  "figma-analyzer",
  "test-openrouter",
  "figma-to-storyblok",
  "irf-architect",
  "storyblok-editor",
  "decision-maker",
  "orchestrator",
  "site-builder",
]);

export const AgentCapabilitySchema = z.enum([
  "general",
  "scribe",
  "rephraser",
  "figma-analyzer",
  "test-openrouter",
  "figma-to-storyblok",
  "irf-architect",
  "storyblok-editor",
  "decision-maker",
  "orchestrator",
  "site-builder",
  "web_search",
  "image_generation",
  "file_analysis",
  "planning",
  "memory_search",
  "writing",
  "summarizing",
  "content_creation",
  "text_refinement",
  "text_rephrasing",
  "clarity_improvement",
  "design_analysis",
  "figma_integration",
  "ui_ux_feedback",
  "storyblok_components",
  "cms_management",
  "content_structure",
  "layout_design",
  "architecture_planning",
  "design_systems",
  "storyblok_editing",
  "irf_transformation",
  "content_validation",
  "openrouter_models",
  "experimental_features",
  "model_testing",
  "design_to_code",
  "component_generation",
  "message_analysis",
  "action_planning",
  "memory_management",
  "workflow_routing",
  "task_analysis",
  "agent_coordination",
  "parallel_execution",
  "pipeline_execution",
  "result_synthesis",
]);

export const AgentMetadataSchema = z.object({
  id: z.string(),
  type: AgentTypeSchema,
  name: z.string(),
  description: z.string(),
  capabilities: z.array(AgentCapabilitySchema),
  icon: z.string(),
  version: z.string().optional(),
  author: z.string().optional(),
});

// Voice config schema
export const VoiceConfigSchema = z.object({
  enabled: z.boolean(),
  voiceId: z.string().optional(),
  defaultOptions: z.any().optional(), // Partial<VoiceOptions>
  autoSpeak: z.boolean().optional(),
  autoListen: z.boolean().optional(),
  allowInterruption: z.boolean().optional(),
  mixedModality: z
    .object({
      enabled: z.boolean(),
      mergeStrategy: z.enum(["temporal", "contextual", "append"]),
    })
    .optional(),
});

// Base agent config schema
export const BaseAgentConfigSchema = z.object({
  id: z.string(),
  type: AgentTypeSchema,
  availableTools: z.array(z.any()).optional(),
  metadata: AgentMetadataSchema.partial().optional(),
  voice: VoiceConfigSchema.optional(),
});

export type BaseAgentConfig = z.infer<typeof BaseAgentConfigSchema>;

export type AgentType = z.infer<typeof AgentTypeSchema>;
// Agent input schema
export const AgentInputSchema = z.object({
  messages: z.array(ChatMessageSchema),
  tools: z.array(z.any()).optional(), // Tools can be any structure
  context: AgentFlowContextSchema.optional(), // Full AgentFlowContext with all data
});
export type AgentInput = z.infer<typeof AgentInputSchema>;
export type AgentActInput = AgentInput; // Alias for compatibility
// Agent response schema (this is just ChatMessage)
export const AgentResponseSchema = ChatMessageSchema;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;

// Core agent interface that all agents must implement
export interface Agent {
  // Required properties
  readonly id: string;
  readonly type: AgentType;
  readonly availableTools: any[];

  // Required methods
  act: (input: AgentInput) => Promise<AgentResponse>;

  setSendUpdate?: (
    sendUpdate: (data: ProgressMessage) => Promise<void>
  ) => void;

  // Optional methods for enhanced functionality
  getMetadata: () => AgentMetadata;
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  validateInput?: (input: AgentInput) => boolean;

  // Health check method
  isHealthy?: () => Promise<boolean>;

  // Voice capabilities (optional)
  voiceService?: VoiceService;
  speak?: (text: string, options?: VoiceOptions) => Promise<AudioResult>;
  listen?: (options?: TranscribeOptions) => Promise<TranscriptionResult>;
  hasVoice?: () => boolean;
  canSpeak?: () => boolean;
  canListen?: () => boolean;
}

// Error types for better error handling
export class AgentError extends Error {
  constructor(
    message: string,
    public agentType: AgentType,
    public agentId: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "AgentError";
  }
}

export class AgentInitializationError extends AgentError {
  constructor(agentType: AgentType, agentId: string, originalError?: Error) {
    super(
      `Failed to initialize agent ${agentType}:${agentId}`,
      agentType,
      agentId,
      originalError
    );
    this.name = "AgentInitializationError";
  }
}

export class AgentExecutionError extends AgentError {
  constructor(agentType: AgentType, agentId: string, originalError?: Error) {
    super(
      `Agent execution failed for ${agentType}:${agentId}`,
      agentType,
      agentId,
      originalError
    );
    this.name = "AgentExecutionError";
  }
}
