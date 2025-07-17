import * as p from "@clack/prompts";
import { createAgent } from "@mrck-labs/grid-agents";
import {
  selectWithCancel,
  textWithCancel,
  confirmWithCancel,
  isCancel,
} from "../utils/prompts.js";
import { withSpinner, simulateWork, createSpinner } from "../utils/spinners.js";
import type { MenuOption } from "../types/index.js";
import { createConfigurableAgent } from "@mrck-labs/grid-core";

export async function exploreAgentPrimitives(): Promise<void> {
  const agentTypeOptions: MenuOption[] = [
    { value: "basic", label: "Basic Agent", hint: "Simple Q&A agent" },
  ];

  const agentType = await selectWithCancel<string>(
    "Select an agent primitive to explore:",
    agentTypeOptions
  );

  if (isCancel(agentType) || agentType === "back") return;

  const agent = createConfigurableAgent({
    config: {
      id: "agent-1",
      type: "general",
      prompts: {
        system:
          "You are a helpful assistant that breaks down tasks into steps.",
      },
      version: "1.0.0",
      metadata: {
        id: "autonomous-agent",
        type: "general",
        name: "Autonomous Demo Agent",
        description: "Demonstrates autonomous flow capabilities",
        capabilities: ["general"],
        icon: "🤖",
        version: "1.0.0",
      },
      tools: {
        builtin: [],
        custom: [],
        mcp: [],
        agents: [],
      },
      behavior: {
        maxRetries: 3,
        responseFormat: "text" as const,
        validateResponse: false,
        emitEvents: [],
      },
      orchestration: {},
    },
    // Use custom LLM service if selected
    llmService: undefined,
  });

  const message = await textWithCancel(
    "What message do you want to send to the agent?"
  );

  const currentSpinner = createSpinner();
  currentSpinner.start("Agent is thinking...");

  const response = await agent.act({
    messages: [{ role: "user", content: message }],
  });

  currentSpinner.stop();

  p.log.info(`Agent: ${response.content}`);
  p.log.info(JSON.stringify(response, null, 2));

  await confirmWithCancel("Would you like to try another agent?");
}
