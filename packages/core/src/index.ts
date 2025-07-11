/**
 * @grid/core - Core primitives for LLM orchestration and agentic workflows
 */

export const VERSION = "0.0.0";

export type GridConfig = {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
};

export const createGrid = (config: GridConfig = {}) => {
  return {
    config,
    version: VERSION,
  };
};

export const TEST_VERSION = "0.1.0";

// New feature: Helper function for API configuration
export const validateConfig = (config: GridConfig): boolean => {
  if (config.timeout && config.timeout < 0) {
    return false;
  }
  if (config.retries && config.retries < 0) {
    return false;
  }
  return true;
};

// New feature: Default configuration helper
export const getDefaultConfig = (): GridConfig => {
  return {
    timeout: 30000,
    retries: 3,
  };
};
