import * as p from "@clack/prompts";
import { createAgent } from "@mrck-labs/grid-agents";
import { selectWithCancel, textWithCancel, confirmWithCancel, isCancel } from "../utils/prompts.js";
import { withSpinner, simulateWork } from "../utils/spinners.js";
import type { MenuOption } from "../types/index.js";

export async function exploreAgentPrimitives(): Promise<void> {
  const agentTypeOptions: MenuOption[] = [
    { value: "basic", label: "Basic Agent", hint: "Simple Q&A agent" },
    { value: "memory", label: "Agent with Memory", hint: "Stateful conversations" },
    { value: "reasoning", label: "Reasoning Agent", hint: "Step-by-step reasoning" },
    { value: "back", label: "← Back to main menu" },
  ];

  const agentType = await selectWithCancel<string>(
    "Select an agent primitive to explore:",
    agentTypeOptions
  );

  if (isCancel(agentType) || agentType === "back") return;

  const name = await textWithCancel(
    "What should we call this agent?",
    "My Agent",
    `${String(agentType)}-agent`
  );

  if (isCancel(name)) return;

  const agent = await withSpinner(
    "Creating agent...",
    async () => createAgent(
      `agent-${Date.now()}`,
      String(name)
    ),
    `Agent created: ${String(name)}`
  );

  const task = await textWithCancel(
    "What task should the agent perform?",
    "e.g., Explain quantum computing in simple terms"
  );

  if (isCancel(task)) return;

  await withSpinner(
    "Agent is thinking...",
    async () => simulateWork(2000),
    "Agent completed the task!"
  );

  p.note(
    `Agent: ${agent.name}\nTask: ${String(task)}\n\nResponse: This is where the agent's response would appear.`,
    "Agent Output"
  );

  await confirmWithCancel("Would you like to try another agent?");
}