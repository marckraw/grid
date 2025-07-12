import dotenv from "dotenv";
import { existsSync } from "fs";
import { join } from "path";
import color from "picocolors";

// Load environment variables
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try to find .env in parent directories (for monorepo setup)
  const parentEnvPath = join(process.cwd(), "../..", ".env");
  if (existsSync(parentEnvPath)) {
    dotenv.config({ path: parentEnvPath });
  }
}

export interface AppConfig {
  // API Keys
  openAIApiKey?: string;
  anthropicApiKey?: string;
  gridApiKey?: string;
  
  // Grid Configuration
  gridBaseUrl: string;
  gridTimeout: number;
  gridRetries: number;
  
  // Agent Configuration
  defaultModel: string;
  maxIterations: number;
  
  // App Configuration
  nodeEnv: string;
  logLevel: string;
}

export const config: AppConfig = {
  // API Keys from environment
  openAIApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  gridApiKey: process.env.GRID_API_KEY,
  
  // Grid Configuration with defaults
  gridBaseUrl: process.env.GRID_BASE_URL || "https://api.grid.dev",
  gridTimeout: parseInt(process.env.GRID_TIMEOUT || "30000", 10),
  gridRetries: parseInt(process.env.GRID_RETRIES || "3", 10),
  
  // Agent Configuration
  defaultModel: process.env.DEFAULT_MODEL || "gpt-4",
  maxIterations: parseInt(process.env.MAX_ITERATIONS || "10", 10),
  
  // App Configuration
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
};

// Validation function
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.openAIApiKey && !config.anthropicApiKey) {
    errors.push("At least one API key (OpenAI or Anthropic) must be configured");
  }
  
  if (config.gridTimeout < 0) {
    errors.push("GRID_TIMEOUT must be a positive number");
  }
  
  if (config.gridRetries < 0) {
    errors.push("GRID_RETRIES must be a positive number");
  }
  
  if (config.maxIterations < 1) {
    errors.push("MAX_ITERATIONS must be at least 1");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper to display configuration status
export function displayConfigStatus(): void {
  console.log(color.cyan("\n📋 Configuration Status:"));
  console.log(color.dim("─".repeat(40)));
  
  // API Keys (show masked)
  console.log(color.blue("API Keys:"));
  console.log(`  OpenAI: ${config.openAIApiKey ? color.green("✓ Configured") : color.yellow("✗ Not set")}`);
  console.log(`  Anthropic: ${config.anthropicApiKey ? color.green("✓ Configured") : color.yellow("✗ Not set")}`);
  console.log(`  Grid: ${config.gridApiKey ? color.green("✓ Configured") : color.yellow("✗ Not set")}`);
  
  // Grid Settings
  console.log(color.blue("\nGrid Settings:"));
  console.log(`  Base URL: ${config.gridBaseUrl}`);
  console.log(`  Timeout: ${config.gridTimeout}ms`);
  console.log(`  Retries: ${config.gridRetries}`);
  
  // Agent Settings
  console.log(color.blue("\nAgent Settings:"));
  console.log(`  Default Model: ${config.defaultModel}`);
  console.log(`  Max Iterations: ${config.maxIterations}`);
  
  console.log(color.dim("─".repeat(40)) + "\n");
}

// Helper to check if essential APIs are configured
export function hasRequiredApiKeys(): boolean {
  return !!(config.openAIApiKey || config.anthropicApiKey);
}

// Helper to get active API provider
export function getActiveProvider(): "openai" | "anthropic" | null {
  if (config.openAIApiKey) return "openai";
  if (config.anthropicApiKey) return "anthropic";
  return null;
}