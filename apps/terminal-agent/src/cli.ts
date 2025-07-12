import * as p from "@clack/prompts";
import color from "picocolors";
import { createGrid } from "@mrck-labs/grid-core";
import { selectWithCancel, isCancel } from "./utils/prompts.js";
import type { MenuOption } from "./types/index.js";
import {
  exploreAgentPrimitives,
  exploreWorkflowPrimitives,
  conversationMode,
  exploreToolUsage,
  exploreCollaboration,
  configureGrid,
} from "./commands/index.js";

const menuOptions: MenuOption[] = [
  { value: "agent", label: "🤖 Agent Primitives", hint: "Explore basic agent capabilities" },
  { value: "workflow", label: "🔄 Workflow Primitives", hint: "Create and test workflows" },
  { value: "conversation", label: "💬 Conversation Mode", hint: "Interactive agent conversation" },
  { value: "tools", label: "🛠️  Tool Usage", hint: "Explore tool-calling capabilities" },
  { value: "collaboration", label: "👥 Agent Collaboration", hint: "Multiple agents working together" },
  { value: "config", label: "⚙️  Configuration", hint: "View and modify Grid settings" },
  { value: "exit", label: "👋 Exit" },
];

const commandHandlers: Record<string, () => Promise<void>> = {
  agent: exploreAgentPrimitives,
  workflow: exploreWorkflowPrimitives,
  conversation: conversationMode,
  tools: exploreToolUsage,
  collaboration: exploreCollaboration,
  config: configureGrid,
};

export async function runCLI(): Promise<void> {
  console.clear();
  p.intro(color.cyan("🤖 Grid Terminal Agent Explorer"));

  try {
    const grid = createGrid({ apiKey: "test" });

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