import { z } from "zod";
import {
  AgentTypeSchema,
  AgentMetadataSchema,
  VoiceConfigSchema,
} from "../types/agent.types.js";
import type { Tool } from "../types/tool.types.js";

// Tool source types
export const ToolSourceSchema = z.enum(["local", "mcp", "agent", "external"]);

// Agent behavior configuration
export const AgentBehaviorSchema = z.object({
  maxRetries: z.number().default(3),
  responseFormat: z.enum(["json", "text", "structured"]).default("text"),
  validateResponse: z.boolean().default(false),
  emitEvents: z.array(z.string()).optional(),
  timeout: z.number().optional(), // milliseconds
  model: z.string().optional(), // AI model to use (e.g., "gpt-4.1", "claude-3-5-sonnet-20241022")
  provider: z.string().optional(), // LLM provider preference (e.g., "openai", "anthropic", "openrouter")
});

// Agent prompts configuration
export const AgentPromptsSchema = z.object({
  system: z.string(),
  systemCache: z.boolean().optional(), // Enable Anthropic prompt caching for system message
  errorCorrection: z.string().optional(),
  fallback: z.string().optional(),
});

// MCP Server configuration schema
export const MCPServerConfigSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.enum(["http", "sse"]).default("http"),
  authToken: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

// Tool configuration
export const AgentToolsSchema = z.object({
  builtin: z.record(z.any()).default({}), // Names of built-in tools
  custom: z.record(z.any()).default({}), // Custom tool instances
  mcp: z.record(z.any()).default({}), // MCP server tool instances (populated at runtime)
  mcpServers: z.array(MCPServerConfigSchema).optional().default([]), // MCP server configurations
  agents: z.array(AgentTypeSchema).optional(), // Other agents as tools
});

// Hooks configuration for custom logic injection
export const AgentHooksSchema = z
  .object({
    beforeAct: z.boolean().default(false),
    afterResponse: z.boolean().default(false),
    onError: z.boolean().default(false),
    validateResponse: z.boolean().default(false),
    transformInput: z.boolean().default(false),
    transformOutput: z.boolean().default(false),
  })
  .partial(); // Make all fields optional

// Orchestration capabilities
export const AgentOrchestrationSchema = z
  .object({
    // Can this agent be called by other agents?
    callable: z.boolean().default(true),

    // Can this agent call other agents?
    canDelegate: z.boolean().default(false),

    // Which agents can this agent delegate to?
    allowedDelegates: z.array(AgentTypeSchema).optional(),

    // Resource constraints
    maxParallelDelegations: z.number().default(3),
    maxDelegationDepth: z.number().default(3),

    // Delegation strategies
    delegationStrategy: z
      .enum([
        "best-match", // Choose best agent based on capabilities
        "load-balance", // Distribute among capable agents
        "specialist", // Always use specialist agents
        "fallback", // Try primary, fallback to secondary
      ])
      .optional(),

    // Cost and resource management
    costTier: z.enum(["low", "medium", "high"]).default("medium"),
    estimatedDuration: z.number().optional(), // milliseconds
  })
  .partial()
  .refine((data: any) => data, { message: "Invalid orchestration config" });

// Main agent configuration schema
export const AgentConfigSchema = z.object({
  // Basic identification
  id: z.string(),
  type: z.string(), //
  version: z.string().default("1.0.0"),

  // Metadata
  metadata: AgentMetadataSchema,

  // Prompts configuration
  prompts: AgentPromptsSchema,

  // Behavior configuration
  behavior: AgentBehaviorSchema.default({}),

  // Tools configuration
  tools: AgentToolsSchema.default({ builtin: {} }),

  // Hooks for custom logic
  hooks: AgentHooksSchema.optional(),

  // Orchestration capabilities
  orchestration: AgentOrchestrationSchema.optional(),

  // Observability configuration
  // observability: ObservabilityConfigSchema.optional(), // Removed - using simple Langfuse integration

  // Feature flags
  features: z.record(z.boolean()).optional(),

  // Voice configuration
  voice: VoiceConfigSchema.optional(),

  // Custom configuration (agent-specific)
  customConfig: z.record(z.any()).optional(),
});

// Inferred types
export type ToolSource = z.infer<typeof ToolSourceSchema>;
export type AgentBehavior = z.infer<typeof AgentBehaviorSchema>;
export type AgentPrompts = z.infer<typeof AgentPromptsSchema>;
export type AgentTools = z.infer<typeof AgentToolsSchema>;
export type AgentHooks = z.infer<typeof AgentHooksSchema>;
export type AgentOrchestration = z.infer<typeof AgentOrchestrationSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Validation helpers
export const validateAgentConfig = (data: unknown) => {
  const result = AgentConfigSchema.safeParse(data);
  if (!result.success) {
    return { success: false, data: null, error: result.error };
  }
  return { success: true, data: result.data, error: null };
};

// Config builder helper for better DX
export const createAgentConfig = (config: AgentConfig): AgentConfig => {
  const validation = validateAgentConfig(config);
  if (!validation.success) {
    throw new Error(
      `Invalid agent configuration: ${JSON.stringify(validation.error)}`
    );
  }
  return validation.data!;
};
