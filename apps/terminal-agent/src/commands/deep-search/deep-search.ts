import * as p from "@clack/prompts";
import {
  createConfigurableAgent,
  createToolExecutor,
  createConversationLoop,
  baseLLMService,
  langfuseService,
} from "@mrck-labs/grid-core";
import { textWithCancel, isCancel } from "../../utils/prompts.js";
import { createSpinner } from "../../utils/spinners.js";
import { calculatorTool, currentTimeTool } from "@mrck-labs/grid-tools";
import pc from "picocolors";
import { saveConversation } from "../helpers/conversation.helper.js";
import {
  registerTestMCPTools,
  type MCPClientType,
} from "../helpers/registerTestMcp.js";

const sendUpdateOnProgress = async (message: any) => {
  // Handle different progress message types
  switch (message.type) {
    case "thinking":
      // Don't show thinking messages unless in debug mode
      if (process.env.DEBUG) {
        p.log.step(pc.dim(`💭 ${message.content}`));
      }
      break;
    case "tool_execution":
      p.log.step(pc.yellow(`🔧 ${message.content}`));
      break;
    case "error":
      p.log.error(pc.red(`❌ ${message.content}`));
      break;
    case "iteration":
      if (process.env.DEBUG) {
        p.log.step(pc.dim(`🔄 ${message.content}`));
      }
      break;
    default:
      if (process.env.DEBUG) {
        p.log.info(pc.dim(`[${message.type}] ${message.content}`));
      }
  }
};

export async function deepSearch(): Promise<void> {
  p.intro(pc.cyan("🤖 Deep Search Mode"));
  p.log.info("Chat with an AI assistant. Type 'exit' to end the conversation.");
  p.log.info(
    "The assistant can use tools like calculator, time checking, and image generation. It can also use tools to search the web."
  );

  // Multiselect for MCP clients
  const mcpClientOptions = [
    {
      value: "figma" as MCPClientType,
      label: "Figma MCP Server (Design context)",
    },
    {
      value: "linear" as MCPClientType,
      label: "Linear MCP Server (Issue tracking)",
    },
  ];

  const selectedMcpClients = await p.multiselect({
    message: "Select MCP clients to initialize:",
    options: mcpClientOptions,
    required: false,
  });

  if (p.isCancel(selectedMcpClients)) {
    p.cancel("Operation cancelled");
    return;
  }

  const { transformerMcpTools, transformedLinearMcpTools, clients } =
    await registerTestMCPTools(selectedMcpClients as MCPClientType[]);

  p.log.info(
    pc.dim("💾 Conversation is automatically saved to conversation.json\n")
  );

  // Create tool executor and register tools
  const toolExecutor = createToolExecutor({
    onToolRegister: (tool) => {
      p.log.success(`[ToolExecutor] ${tool.name} registered`);
    },
  });

  // Register local tools
  toolExecutor.registerTool(calculatorTool);
  toolExecutor.registerTool(currentTimeTool);

  // Register MCP tools if available
  for (const tool in transformerMcpTools) {
    toolExecutor.registerTool(transformerMcpTools[tool]);
  }

  for (const tool in transformedLinearMcpTools) {
    toolExecutor.registerTool(transformedLinearMcpTools[tool]);
  }

  // Create configurable agent
  const agent = createConfigurableAgent({
    llmService: baseLLMService({
      toolExecutionMode: "custom",
      langfuse: langfuseService,
    }),
    config: {
      id: "deep-search-agent",
      type: "general",
      prompts: {
        system: `You are a helpful, friendly assistant engaged in a conversation.`,
      },
      version: "1.0.0",
      metadata: {
        id: "deep-search-agent",
        type: "general",
        name: "Deep Search Agent",
        description: "An agent for deep search",
        capabilities: ["general"],
        icon: "💬",
        version: "1.0.0",
      },
      tools: {
        builtin: [],
        custom: [calculatorTool, currentTimeTool],
        mcp: [...transformerMcpTools, ...transformedLinearMcpTools],
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

  // Create conversation flow with progress streaming
  const conversation = createConversationLoop({
    agent,
    handlers: {
      manager: {
        onToolExecution: async (toolName, args, result) => {
          console.log("  Args:", args);
          console.log("  Result:", result);
          if (process.env.DEBUG) {
            console.log("  Args:", args);
            console.log("  Result:", result);
          }
        },
      },
    },
    onProgress: sendUpdateOnProgress,
    onMessage: async (response) => {
      // Display tool calls if any
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          p.log.step(pc.dim(`Using ${toolCall.toolName}...`));
        }
      }

      // Display the response
      if (response.content) {
        console.log(pc.green("\n🤖 Assistant:"), response.content);
      }
    },
    onError: async (error) => {
      p.log.error(`Error: ${error.message}`);
    },
  });

  p.log.success("Conversation flow created");

  // Start conversation loop
  let continueChat = true;
  console.log(""); // Empty line for spacing

  while (continueChat && conversation.isActive()) {
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

    // Special commands
    if (message.toLowerCase() === "/summary") {
      const summary = conversation.getSummary();
      p.log.info("\n📊 Conversation Summary:");
      p.log.info(`  Messages: ${summary.messageCount}`);
      p.log.info(`  Tool calls: ${summary.toolCallCount}`);
      p.log.info(`  Duration: ${Math.round(summary.duration / 1000)}s`);
      console.log(""); // Empty line
      continue;
    }

    if (message.toLowerCase() === "/history-xml") {
      const historyXml = conversation.manager.history.getMessageHistoryAsXml();
      p.log.info("\n📊 Conversation History XML:");
      console.log(historyXml);
      console.log(""); // Empty line
      continue;
    }

    // Special commands
    if (message.toLowerCase() === "/conversation-state") {
      const conversationState = conversation.manager.getConversationState();
      p.log.info("Conversation state:");
      console.log(conversationState);
      console.log(""); // Empty line
      continue;
    }

    if (message.toLowerCase() === "/conversation-messages") {
      const conversationMessages = conversation.getMessages();
      p.log.info("Conversation messages:");
      console.log(conversationMessages);
      console.log(""); // Empty line
      continue;
    }

    if (message.toLowerCase() === "/conversation") {
      const conversationSummary = conversation.getSummary();
      p.log.info("Conversation summary:");
      console.log(conversationSummary);
      console.log(""); // Empty line
      const conversationAnalytics = conversation.getAnalytics();
      p.log.info("Conversation analytics:");
      console.log(conversationAnalytics);
      console.log(""); // Empty line
      continue;
    }

    if (message.toLowerCase() === "/conversation-manager") {
      const conversationManager = conversation.manager.getConversationState();
      const contextStateValue = conversation.manager.getStateValue("context");
      p.log.info("Conversation manager state:");
      console.log(conversationManager);
      p.log.info("Context state value:");
      console.log(contextStateValue);
      console.log(""); // Empty line
      continue;
    }

    if (message.toLowerCase() === "/conversation-context") {
      const contextStateValue = conversation.manager.context.getSnapshot();
      p.log.info("Context state value:");
      console.log(contextStateValue);
      console.log(""); // Empty line
      continue;
    }

    if (message.toLowerCase() === "/export") {
      const exportData = conversation.exportConversation();
      const filename = `conversation-${Date.now()}.json`;
      p.log.info(
        `\n📄 Conversation exported (in production, this would save to ${filename})`
      );
      if (process.env.DEBUG) {
        console.log(JSON.stringify(exportData, null, 2));
      }
      console.log(""); // Empty line
      continue;
    }

    if (message.toLowerCase() === "/help") {
      p.log.info("\n📖 Available commands:");
      p.log.info("  /summary - Show conversation statistics");
      p.log.info("  /conversation - Show summary and analytics");
      p.log.info("  /conversation-messages - Show all messages");
      p.log.info("  /conversation-state - Show conversation state");
      p.log.info(
        "  /conversation-conversation-state - Show full conversation state"
      );
      p.log.info("  /conversation-manager - Show manager state");
      p.log.info("  /conversation-context - Show context snapshot");
      p.log.info("  /export - Export conversation to JSON");
      p.log.info("  /help - Show this help message");
      p.log.info("  exit/quit - End the conversation");
      p.log.info(
        pc.dim("\n💾 Note: Conversation is auto-saved to conversation.json")
      );
      console.log(""); // Empty line
      continue;
    }

    // Send message with spinner
    const spinner = createSpinner();
    spinner.start("Thinking...");

    const result = await conversation.sendMessage(message);

    spinner.stop();

    // Auto-save conversation after each message
    await saveConversation(conversation);

    // Check if conversation ended
    if (result.conversationEnded) {
      p.log.info("\n📍 Maximum conversation length reached.");
      continueChat = false;
    }

    console.log(""); // Empty line for spacing
  }

  // End conversation and show summary
  await conversation.endConversation();

  // Save final conversation state
  await saveConversation(conversation);

  // Clean up MCP clients if connected
  if (clients) {
    if (clients.mcpClient) {
      try {
        await clients.mcpClient.close();
        p.log.info("Closed Figma MCP connection.");
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    if (clients.linearMcpClient) {
      try {
        await clients.linearMcpClient.close();
        p.log.info("Closed Linear MCP connection.");
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  const summary = conversation.getSummary();
  const analytics = conversation.getAnalytics();

  p.outro(pc.cyan("\n👋 Conversation ended\n"));

  p.log.info("📊 Final Statistics:");
  p.log.info(`  Total messages: ${summary.messageCount}`);
  p.log.info(`  Your messages: ${summary.userMessageCount}`);
  p.log.info(`  Assistant messages: ${summary.assistantMessageCount}`);
  p.log.info(`  Tool executions: ${summary.toolCallCount}`);
  p.log.info(`  Duration: ${Math.round(summary.duration / 1000)} seconds`);
  if (analytics.avgUserMessageLength > 0) {
    p.log.info(
      `  Avg message length: ${Math.round(
        analytics.avgUserMessageLength
      )} chars`
    );
  }
}
