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
import { createConfigurableAgent, createToolExecutor } from "@mrck-labs/grid-core";
import { calculatorTool, currentTimeTool } from "../tools/demo-tools.js";

export async function exploreAgentPrimitives(): Promise<void> {
  const agentTypeOptions: MenuOption[] = [
    { value: "basic", label: "Basic Agent", hint: "Simple Q&A agent" },
    { value: "tooled", label: "Agent with Tools", hint: "Agent that can use calculator and time tools" },
  ];

  const agentType = await selectWithCancel<string>(
    "Select an agent primitive to explore:",
    agentTypeOptions
  );

  if (isCancel(agentType) || agentType === "back") return;

  // For now, we'll pass tools directly to the agent without the executor
  // The Vercel AI SDK handles tool execution internally

  // Configure system prompt based on agent type
  const systemPrompt = agentType === "tooled" 
    ? "You are a helpful assistant that can perform calculations and tell the time. When asked to do math or time-related tasks, use the available tools."
    : "You are a helpful assistant that breaks down tasks into steps.";

  const agent = createConfigurableAgent({
    config: {
      id: "agent-1",
      type: "general",
      prompts: {
        system: systemPrompt,
      },
      version: "1.0.0",
      metadata: {
        id: "demo-agent",
        type: "general",
        name: agentType === "tooled" ? "Tool-Using Agent" : "Basic Agent",
        description: agentType === "tooled" 
          ? "Demonstrates tool-calling capabilities"
          : "Demonstrates basic agent capabilities",
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
    // Pass tools if this is a tooled agent
    additionalTools: agentType === "tooled" ? {
      local: [calculatorTool, currentTimeTool]
    } : undefined,
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

  // Display the response
  if (response.content) {
    p.log.info(`Agent: ${response.content}`);
  }

  // Display tool calls if any
  if (response.toolCalls && response.toolCalls.length > 0) {
    p.log.step("Tool calls made:");
    for (const toolCall of response.toolCalls) {
      p.log.info(`  - ${toolCall.toolName}: ${JSON.stringify(toolCall.args)}`);
    }
  }

  // Display tool responses if any
  if (response.metadata?.toolResponses) {
    p.log.step("Tool responses:");
    for (const toolResponse of response.metadata.toolResponses) {
      p.log.info(`  - ${toolResponse.name}: ${toolResponse.content}`);
    }
  }

  // Optional: show full response in debug mode
  if (process.env.DEBUG) {
    p.log.info("Full response:");
    p.log.info(JSON.stringify(response, null, 2));
  }

  await confirmWithCancel("Would you like to try another agent?");
}
