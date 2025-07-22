/**
 * @mrck-labs/grid-agents - Pre-configured agents for common use cases
 */

// Export individual agents
export { researchAgent, createCustomResearchAgent } from "./agents/research.agent";
export { mathDataAgent, createCustomMathDataAgent } from "./agents/math-data.agent";

// Import for collection
import { researchAgent } from "./agents/research.agent";
import { mathDataAgent } from "./agents/math-data.agent";
import type { Agent } from "@mrck-labs/grid-core";

// Export all agents as a collection for convenience
export const allAgents: Record<string, Agent> = {
  research: researchAgent,
  mathData: mathDataAgent,
};

// Type exports for agent configurations
export type { Agent } from "@mrck-labs/grid-core";
