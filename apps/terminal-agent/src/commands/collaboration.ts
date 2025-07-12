import * as p from "@clack/prompts";
import { createAgent } from "@mrck-labs/grid-agents";
import { selectWithCancel, textWithCancel, isCancel } from "../utils/prompts.js";
import { createSpinner, simulateWork } from "../utils/spinners.js";
import type { MenuOption } from "../types/index.js";

export async function exploreCollaboration(): Promise<void> {
  p.note("Set up multiple agents to work together on a task.", "Agent Collaboration");

  const countOptions: MenuOption[] = [
    { value: "2", label: "2 agents" },
    { value: "3", label: "3 agents" },
    { value: "4", label: "4 agents" },
  ];

  const agentCount = await selectWithCancel<string>(
    "How many agents should collaborate?",
    countOptions
  );

  if (isCancel(agentCount)) return;

  const agents = [];
  const count = parseInt(String(agentCount), 10);
  
  for (let i = 0; i < count; i++) {
    const role = await textWithCancel(
      `Agent ${i + 1} role:`,
      "e.g., Researcher, Analyst, Writer"
    );
    
    if (isCancel(role)) return;
    
    agents.push(createAgent(
      `collab-agent-${i}`,
      String(role)
    ));
  }

  const task = await textWithCancel(
    "What should the agents collaborate on?",
    "e.g., Write a comprehensive report on climate change"
  );

  if (isCancel(task)) return;

  const spinner = createSpinner();
  
  for (const agent of agents) {
    spinner.start(`${agent.name} is working...`);
    await simulateWork(1500);
  }
  
  spinner.stop("Collaboration complete!");

  p.note(
    `Task: ${String(task)}\n\nAgents involved:\n${agents.map(a => `• ${a.name}`).join("\n")}\n\nCollaboration result would appear here.`,
    "Collaboration Summary"
  );
}