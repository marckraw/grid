import * as p from "@clack/prompts";
import color from "picocolors";
import { selectWithCancel, isCancel } from "./utils/prompts.js";
import type { MenuOption } from "./types/index.js";
import {
  config,
  validateConfig,
  displayConfigStatus,
  hasRequiredApiKeys,
} from "./config/index.js";
import {
  exploreAgentConversation,
  exploreTestAgents,
  configureGrid,
  viewEnvironment,
  deepSearch,
  exploreWorkflowExamples,
  exploreVoiceConversation,
  simpleVercelAISDKTest,
} from "./commands/index.js";
import { conversationWithMemory } from "./commands/conversation-with-memory.js";

const menuOptions: MenuOption[] = [
  {
    value: "agent-conversation",
    label: "💬 Agent Conversation",
    hint: "Interactive conversation with tools",
  },
  {
    value: "simple-vercel-ai-sdk-test",
    label: "🤖 Simple Vercel AI SDK Test",
    hint: "Simple test of Vercel AI SDK",
  },
  {
    value: "conversation-with-memory",
    label: "🧠 Conversation with Memory",
    hint: "Chat with memory logging enabled",
  },
  {
    value: "voice-conversation",
    label: "🎙️ Voice Conversation",
    hint: "Voice-enabled conversation with speech-to-text",
  },
  {
    value: "deep-search",
    label: "🔍 Deep Search",
    hint: "Deep search mode with tools",
  },
  {
    value: "test-agents",
    label: "🧪 Test different agents",
    hint: "Test and interact with various agent types",
  },
  {
    value: "workflow-examples",
    label: "🔄 Workflow Examples",
    hint: "Explore workflow patterns with primitives",
  },
  {
    value: "config",
    label: "⚙️  Configuration",
    hint: "View and modify Grid settings",
  },
  {
    value: "env",
    label: "🔐 Environment",
    hint: "View current environment configuration",
  },
  { value: "exit", label: "👋 Exit" },
];

const commandHandlers: Record<string, () => Promise<void>> = {
  "agent-conversation": exploreAgentConversation,
  "simple-vercel-ai-sdk-test": simpleVercelAISDKTest,
  "conversation-with-memory": conversationWithMemory,
  "voice-conversation": exploreVoiceConversation,
  "test-agents": exploreTestAgents,
  "deep-search": deepSearch,
  "workflow-examples": exploreWorkflowExamples,
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
    errors.forEach((error) => p.log.error(color.dim(`   • ${error}`)));
    p.note(
      "Please configure your environment variables.\nCopy .env.example to .env and add your API keys.",
      "Configuration Required"
    );
    process.exit(1);
  }

  // Show configuration status if no API keys are set
  if (!hasRequiredApiKeys()) {
    displayConfigStatus();
    p.log.warn(
      color.yellow("⚠️  No API keys configured. Some features will be limited.")
    );
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
    if (error instanceof Error && error.message.includes("User force closed")) {
      p.outro(color.dim("\nExiting..."));
    } else {
      throw error;
    }
  }
}
