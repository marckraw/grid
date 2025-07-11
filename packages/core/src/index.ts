/**
 * @grid/core - Core primitives for LLM orchestration and agentic workflows
 */

export const VERSION = "0.0.0";

export type GridConfig = {
  apiKey?: string;
  baseUrl?: string;
};

export const createGrid = (config: GridConfig = {}) => {
  return {
    config,
    version: VERSION,
  };
};
