import * as p from "@clack/prompts";
import color from "picocolors";
import { createGrid } from "@mrck-labs/grid-core";
import { selectWithCancel, isCancel } from "./utils/prompts.js";
import type { MenuOption } from "./types/index.js";
import { config, validateConfig, displayConfigStatus, hasRequiredApiKeys } from "./config/index.js";
import {
  exploreAgentPrimitives,
  exploreWorkflowPrimitives,
  conversationMode,
  exploreToolUsage,
  exploreCollaboration,
  configureGrid,
  exploreAutonomousFlow,
  viewEnvironment,
  exploreHooksDemo,
} from "./commands/index.js";

const menuOptions: MenuOption[] = [
  { value: "agent", label: "🤖 Agent Primitives", hint: "Explore basic agent capabilities" },
  { value: "workflow", label: "🔄 Workflow Primitives", hint: "Create and test workflows" },
  { value: "autonomous", label: "🚀 Autonomous Flow", hint: "Run autonomous agent loops" },
  { value: "hooks", label: "🪝 Hooks Demo", hint: "See all agent hooks in action" },
  { value: "conversation", label: "💬 Conversation Mode", hint: "Interactive agent conversation" },
  { value: "tools", label: "🛠️  Tool Usage", hint: "Explore tool-calling capabilities" },
  { value: "collaboration", label: "👥 Agent Collaboration", hint: "Multiple agents working together" },
  { value: "config", label: "⚙️  Configuration", hint: "View and modify Grid settings" },
  { value: "env", label: "🔐 Environment", hint: "View current environment configuration" },
  { value: "exit", label: "👋 Exit" },
];

const commandHandlers: Record<string, () => Promise<void>> = {
  agent: exploreAgentPrimitives,
  workflow: exploreWorkflowPrimitives,
  autonomous: exploreAutonomousFlow,
  hooks: exploreHooksDemo,
  conversation: conversationMode,
  tools: exploreToolUsage,
  collaboration: exploreCollaboration,
  config: configureGrid,
  env: viewEnvironment,
};

export async function runCLI(): Promise<void> {
  console.clear();
  p.intro(color.cyan("🤖 Grid Terminal Agent Explorer"));

  // Validate configuration
  const { isValid, errors } = validateConfig();
  if (!isValid) {
    p.log.error(color.red("❌ Configuration errors detected:"));
    errors.forEach(error => p.log.error(color.dim(`   • ${error}`)));
    p.note(
      "Please configure your environment variables.\nCopy .env.example to .env and add your API keys.",
      "Configuration Required"
    );
    process.exit(1);
  }

  // Show configuration status if no API keys are set
  if (!hasRequiredApiKeys()) {
    displayConfigStatus();
    p.log.warn(color.yellow("⚠️  No API keys configured. Some features will be limited."));
    const proceed = await p.confirm({
      message: "Continue without API keys?",
      initialValue: false,
    });
    
    if (!proceed || p.isCancel(proceed)) {
      p.outro(color.dim("Please configure your API keys in .env file"));
      return;
    }
  }

  try {
    const grid = createGrid({ 
      apiKey: config.gridApiKey || "test",
      baseUrl: config.gridBaseUrl,
      timeout: config.gridTimeout,
      retries: config.gridRetries,
    });

    while (true) {
      const action = await selectWithCancel<string>(
        "What would you like to explore?",
        menuOptions
      );

      if (isCancel(action)) {
        p.outro(color.dim("Operation cancelled"));
        break;
      }

      if (action === "exit") {
        p.outro(color.green("Thanks for exploring Grid! 👋"));
        break;
      }

      const handler = commandHandlers[action];
      if (handler) {
        await handler();
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('User force closed')) {
      p.outro(color.dim("\nExiting..."));
    } else {
      throw error;
    }
  }
}