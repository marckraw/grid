import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  baseLLMService,
  createConfigurableAgent,
  createToolExecutor,
} from "@mrck-labs/grid-core";
import { textWithCancel, isCancel } from "../../../utils/prompts.js";
import { createSpinner } from "../../../utils/spinners.js";

export const testGeneralAgent = async () => {
  // Display agent description
  console.log(""); // Empty line for spacing
  p.note(
    "This is a general-purpose conversational agent with basic capabilities.\n" +
    "Test its ability to maintain context, have natural conversations, and provide helpful responses.",
    "General Agent"
  );
  console.log(""); // Empty line for spacing

  // Create tool executor and register tools
  const toolExecutor = createToolExecutor({
    onToolRegister: (tool) => {
      p.log.success(`[ToolExecutor] ${tool.name} registered`);
    },
  });

  const agent = createConfigurableAgent({
    llmService: baseLLMService({
      toolExecutionMode: "custom",
      langfuse: { enabled: true },
    }),
    config: {
      id: "conversation-agent",
      type: "general",
      prompts: {
        system: `You are a helpful, friendly assistant engaged in a conversation. 
    You have access to various tools including calculator, current time, and image generation.
    Remember context from our conversation and refer back to previous topics when relevant.
    Be concise but friendly in your responses.`,
      },
      version: "1.0.0",
      metadata: {
        id: "conversation-agent",
        type: "general",
        name: "Conversational Agent",
        description: "An agent for interactive conversations",
        capabilities: ["general"],
        icon: "💬",
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
    toolExecutor: toolExecutor,
  });

  // Start conversation loop
  let continueChat = true;
  while (continueChat) {
    // Get user input
    const message = await textWithCancel(pc.blue("You: "));

    if (isCancel(message)) {
      continueChat = false;
      break;
    }

    // Check for exit commands
    if (message.toLowerCase() === "exit" || message.toLowerCase() === "quit") {
      continueChat = false;
      break;
    }

    // Send message with spinner
    const spinner = createSpinner();
    spinner.start("Thinking...");

    const response = await agent.act({
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    // Display the response
    if (response.content) {
      console.log(pc.green("\n🤖 Assistant:"), response.content);
    }

    spinner.stop();
  }
};
