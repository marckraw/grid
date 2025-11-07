import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  createConfigurableAgent,
  createToolExecutor,
} from "@mrck-labs/grid-core";
import { textWithCancel, isCancel } from "../../../../utils/prompts.js";
import { createSpinner } from "../../../../utils/spinners.js";
import { createCustomLLMService } from "./services/custom-llm.service.js";

export const testGeneralAgentWithCustomLLM = async () => {
  // Display agent description
  console.log(""); // Empty line for spacing
  p.note(
    "This agent uses a completely custom MOCKED LLM service implementation.\n" +
      "It demonstrates the LLMService interface without making real LLM API calls.\n" +
      "Watch how the custom service handles messages, tool calls, and responses.",
    "General Agent with Custom LLM Service (Mocked)"
  );
  console.log(""); // Empty line for spacing

  // Create the custom LLM service
  const customLLMService = createCustomLLMService();

  // Create tool executor
  const toolExecutor = createToolExecutor({
    onToolRegister: (tool) => {
      p.log.success(`[ToolExecutor] ${tool.name} registered`);
    },
  });

  // Create agent with custom LLM service
  const agent = await createConfigurableAgent({
    llmService: customLLMService, // Using our custom implementation!
    config: {
      id: "agent-with-custom-llm",
      type: "general",
      prompts: {
        system: `You are a helpful assistant powered by a custom LLM service.
    This demonstrates how developers can integrate their own LLM providers.`,
      },
      version: "1.0.0",
      metadata: {
        id: "agent-with-custom-llm",
        type: "general",
        name: "Agent with Custom LLM",
        description: "An agent using a custom LLM service implementation",
        capabilities: ["general"],
        icon: "🎭",
        version: "1.0.0",
      },
      tools: {
        builtin: {},
        custom: {},
        mcp: {},
        mcpServers: [],
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

  // Show some tips
  p.log.info(pc.dim("💡 Tips for testing:"));
  p.log.info(pc.dim("  - Say 'hello' or 'hi' for a greeting"));
  p.log.info(pc.dim("  - Ask 'how are you' to see status"));
  p.log.info(pc.dim("  - Use the word 'test' for test response"));
  p.log.info(pc.dim("  - Type 'tool' to see mock tool calling"));
  console.log(""); // Empty line for spacing

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
    spinner.start("Custom LLM processing...");

    try {
      const response = await agent.act({
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      });

      spinner.stop();

      // Display the response
      if (response.content) {
        console.log(pc.green("\n🤖 Assistant:"), response.content);
      }

      // Show tool calls if any
      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log(pc.yellow("\n📞 Tool Calls:"));
        response.toolCalls.forEach((call) => {
          console.log(
            pc.dim(`  - ${call.toolName}: ${JSON.stringify(call.args)}`)
          );
        });
      }

      // Show metadata if present
      if (response.metadata) {
        console.log(pc.dim("\n📊 Response Metadata:"), response.metadata);
      }

      console.log(""); // Empty line for spacing
    } catch (error) {
      spinner.stop();
      p.log.error(pc.red("Error: " + (error as Error).message));
    }
  }

  p.outro(pc.magenta("Custom LLM service demonstration ended!"));
};
