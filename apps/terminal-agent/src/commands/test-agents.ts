import * as p from "@clack/prompts";
import pc from "picocolors";
import { selectWithCancel, isCancel } from "../utils/prompts.js";
import type { MenuOption } from "../types/index.js";

const agentOptions: MenuOption[] = [
  {
    value: "general",
    label: "🤖 General agent",
    hint: "A general-purpose agent",
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
        console.log("I am general agent");
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