import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  baseLLMService,
  createConfigurableAgent,
  createToolExecutor,
  langfuseService,
} from "@mrck-labs/grid-core";
import { textWithCancel, isCancel } from "../../../utils/prompts.js";
import { createSpinner } from "../../../utils/spinners.js";

export const testGeneralAgentWithCustomHandlers = async () => {
  // Display agent description
  console.log(""); // Empty line for spacing
  p.note(
    "This agent demonstrates all available custom handlers (hooks) in Grid.\n" +
      "Test how beforeAct, afterResponse, onError, validateResponse, and transform handlers work.",
    "General Agent with Custom Handlers"
  );
  console.log(""); // Empty line for spacing

  // Create tool executor and register tools
  const toolExecutor = createToolExecutor({
    onToolRegister: (tool) => {
      p.log.success(`[ToolExecutor] ${tool.name} registered`);
    },
  });

  const agent = await createConfigurableAgent({
    llmService: baseLLMService({
      toolExecutionMode: "custom",
      langfuse: langfuseService,
    }),
    config: {
      id: "conversation-agent-with-handlers",
      type: "general",
      prompts: {
        system: `You are a helpful, friendly assistant engaged in a conversation. 
    This is a special test environment where custom handlers are logging various events.
    Be concise but friendly in your responses.`,
      },
      version: "1.0.0",
      metadata: {
        id: "conversation-agent-with-handlers",
        type: "general",
        name: "Conversational Agent with Handlers",
        description: "An agent demonstrating custom handlers",
        capabilities: ["general"],
        icon: "🔧",
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
        validateResponse: true, // Enable to trigger validateResponse handler
        emitEvents: [],
      },
      orchestration: {},
    },
    toolExecutor: toolExecutor,
    customHandlers: {
      // Called before processing the input
      beforeAct: async ({ input, config }) => {
        p.log.info(pc.blue("🔵 [beforeAct] Processing input..."));
        p.log.info(
          pc.dim(`   Input: ${JSON.stringify(input.messages[0].content)}`)
        );
        return input;
      },

      // Called after receiving the response
      afterResponse: async ({ response, input }) => {
        p.log.info(pc.green("🟢 [afterResponse] Response received"));
        p.log.info(
          pc.dim(`   Response length: ${response.content?.length || 0} chars`)
        );
        return response;
      },

      // Called when an error occurs
      onError: async ({ error, attempt }) => {
        p.log.error(
          pc.red(`🔴 [onError] Error on attempt ${attempt}: ${error.message}`)
        );
        // Return retry decision
        return { retry: attempt < 3, modifiedInput: undefined };
      },

      // Called to validate the response
      validateResponse: async ({ response }) => {
        p.log.info(pc.yellow("🟡 [validateResponse] Validating response..."));
        const isValid = response.content && response.content.length > 0;
        const result = {
          isValid,
          errors: isValid ? undefined : ["Response is empty"],
        };
        p.log.info(pc.dim(`   Valid: ${result.isValid}`));
        return result;
      },

      // Called to transform input before processing
      transformInput: async ({ input }) => {
        p.log.info(pc.magenta("🟣 [transformInput] Transforming input..."));
        // Just log, don't actually transform
        return input;
      },

      // Called to transform output before returning
      transformOutput: async ({ output }) => {
        p.log.info(pc.cyan("🔵 [transformOutput] Transforming output..."));
        // Just log, don't actually transform
        return output;
      },
    },
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
