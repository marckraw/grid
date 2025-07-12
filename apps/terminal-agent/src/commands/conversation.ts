import * as p from "@clack/prompts";
import { createAgent } from "@mrck-labs/grid-agents";
import { textWithCancel, isCancel } from "../utils/prompts.js";
import { withSpinner, simulateWork } from "../utils/spinners.js";

export async function conversationMode(): Promise<void> {
  p.note("Starting interactive conversation mode. Type 'exit' to return to main menu.", "Conversation Mode");

  const agent = createAgent(
    `conversation-${Date.now()}`,
    "Conversational Agent"
  );

  while (true) {
    const message = await textWithCancel(
      "You:",
      "Type your message..."
    );

    if (isCancel(message) || message === "exit") break;

    await withSpinner(
      "Agent is thinking...",
      async () => simulateWork(1500),
      ""
    );

    p.log.info(`Agent: This is where the agent's response to "${String(message)}" would appear.`);
  }
}