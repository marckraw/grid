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
import {
  createConfigurableAgent,
  createToolExecutor,
} from "@mrck-labs/grid-core";
import { calculatorTool } from "../tools/demo-tools/calculator.tool.js";
import { currentTimeTool } from "../tools/demo-tools/current-time.tool.js";

export async function exploreAgentPrimitives(): Promise<void> {
  const agentTypeOptions: MenuOption[] = [
    {
      value: "basic",
      label: "Basic Agent with tools",
      hint: "Simple Q&A agent with tools",
    },
  ];

  const agentType = await selectWithCancel<string>(
    "Select an agent primitive to explore:",
    agentTypeOptions
  );

  if (isCancel(agentType) || agentType === "back") return;

  // Create tool executor and register tools
  const toolExecutor = createToolExecutor();

  // Register our tools with the executor
  toolExecutor.registerTool(calculatorTool);
  toolExecutor.registerTool(currentTimeTool);

  // Configure system prompt based on agent type
  const systemPrompt = "You are a helpful assistant";

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
        name: "Basic Agent with tools",
        description: "Demonstrates agent capabilities",
        capabilities: ["general"],
        icon: "🤖",
        version: "1.0.0",
      },
      tools: {
        builtin: [],
        custom: [calculatorTool, currentTimeTool],
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
    // Pass the tool executor to enable tool execution
    toolExecutor: toolExecutor,
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
    console.log("Tool calls made:");
    console.log(response);
    p.log.step("Tool calls made:");
    for (const toolCall of response.toolCalls) {
      p.log.info(`  - ${toolCall.toolName}: ${JSON.stringify(toolCall.args)}`);
    }
  }

  console.log("[agent.ts] response:", response);
  console.log(
    "[agent.ts] response.metadata.toolResponses:",
    response.metadata?.toolResponses
  );

  // Display tool responses if any
  if (response.metadata?.toolResponses) {
    p.log.step("Tool responses:");
    for (const toolResponse of response.metadata.toolResponses) {
      p.log.info(`  - ${toolResponse.toolName}: ${toolResponse.result}`);
    }
  }

  // Optional: show full response in debug mode
  if (process.env.DEBUG) {
    p.log.info("Full response:");
    p.log.info(JSON.stringify(response, null, 2));
  }

  await confirmWithCancel("Would you like to try another agent?");
}
