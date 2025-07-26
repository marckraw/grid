import * as p from "@clack/prompts";
import pc from "picocolors";
import { selectWithCancel, isCancel } from "../../utils/prompts.js";
import type { MenuOption } from "../../types/index.js";
import { testGeneralAgent } from "./agent-selection/general.js";
import { testGeneralAgentWithCustomHandlers } from "./agent-selection/general-with-custom-handlers.js";
import { testGeneralAgentWithCustomLLM } from "./agent-selection/general-with-custom-llm/general-with-custom-llm.js";

const agentOptions: MenuOption[] = [
  {
    value: "general",
    label: "🤖 General agent",
    hint: "A general-purpose agent",
  },
  {
    value: "general-with-handlers",
    label: "🔧 General agent with custom handlers",
    hint: "Test all available hooks",
  },
  {
    value: "general-with-custom-llm",
    label: "🎭 General agent with custom LLM",
    hint: "Custom LLM service implementation",
  },
  {
    value: "back",
    label: "⬅️  Back to main menu",
  },
];

export async function exploreTestAgents(): Promise<void> {
  p.intro(pc.cyan("🧪 Test Different Agents"));
  p.log.info("Select an agent to test and interact with.");

  while (true) {
    const selectedAgent = await selectWithCancel<string>(
      "Which agent would you like to test?",
      agentOptions
    );

    if (isCancel(selectedAgent) || selectedAgent === "back") {
      return;
    }

    switch (selectedAgent) {
      case "general":
        await testGeneralAgent();
        break;
      case "general-with-handlers":
        await testGeneralAgentWithCustomHandlers();
        break;
      case "general-with-custom-llm":
        await testGeneralAgentWithCustomLLM();
        break;
      default:
        p.log.error(pc.red("Unknown agent selected"));
    }

    const continueTest = await p.confirm({
      message: "Would you like to test another agent?",
      initialValue: true,
    });

    if (!continueTest || p.isCancel(continueTest)) {
      return;
    }
  }
}
