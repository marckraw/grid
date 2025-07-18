import * as p from "@clack/prompts";
import {
  createConfigurableAgent,
  createToolExecutor,
  createConversationFlow,
  type ConversationFlow,
  baseLLMService,
} from "@mrck-labs/grid-core";
import { experimental_createMCPClient as createMCPClient, type Tool } from "ai";
import { textWithCancel, isCancel } from "../utils/prompts.js";
import { createSpinner } from "../utils/spinners.js";
import { calculatorTool } from "../tools/demo-tools/calculator.tool.js";
import { currentTimeTool } from "../tools/demo-tools/current-time.tool.js";
import { createImageTool } from "../tools/demo-tools/create-image.tool.js";
import pc from "picocolors";
import { saveConversation } from "./helpers/conversation.helper.js";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";

export async function exploreAgentConversation(): Promise<void> {
  p.intro(pc.cyan("🤖 Agent Conversation Mode"));
  p.log.info("Chat with an AI assistant. Type 'exit' to end the conversation.");
  p.log.info(
    "The assistant can use tools like calculator, time checking, and image generation."
  );

  // Check if MCP server should be connected
  let mcpClient: any = null;
  let linearMcpClient: any = null;
  let mcpTools: Record<string, any> = {};
  let linearMcpTools: Record<string, any> = {};

  console.log("process.env.LINEAR_API_KEY", process.env.LINEAR_API_KEY);

  const spinner = createSpinner();
  spinner.start("Connecting to Figma MCP server...");

  try {
    mcpClient = await createMCPClient({
      transport: {
        type: "sse",
        url: "https://figma-context-mcp-production-a90a.up.railway.app/sse",
      },
    });

    const transport = new Experimental_StdioMCPTransport({
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.linear.app/sse"],
    });

    linearMcpClient = await createMCPClient({
      transport: transport,
    });

    linearMcpTools = await linearMcpClient.tools();
    console.log("linearMcpTools", linearMcpTools);
    mcpTools = await mcpClient.tools();
    console.log("mcpTools", mcpTools);
    spinner.stop();
  } catch (error) {
    spinner.stop();
    p.log.warn(
      `Failed to connect to Linear MCP server: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  p.log.info(
    pc.dim("💾 Conversation is automatically saved to conversation.json\n")
  );

  const transformerMcpTools = Object.entries(mcpTools).map(([key, value]) => ({
    name: key,
    ...value,
  }));

  const transformedLinearMcpTools = Object.entries(linearMcpTools).map(
    ([key, value]) => ({
      name: key,
      ...value,
    })
  );

  // Create tool executor and register tools
  const toolExecutor = createToolExecutor();

  // Register local tools
  toolExecutor.registerTool(calculatorTool);
  toolExecutor.registerTool(currentTimeTool);
  toolExecutor.registerTool(createImageTool);

  // Register MCP tools if available
  for (const tool in transformerMcpTools) {
    console.log("tool", transformerMcpTools[tool]);
    toolExecutor.registerTool(transformerMcpTools[tool]);
  }

  for (const tool in transformedLinearMcpTools) {
    console.log("tool", transformedLinearMcpTools[tool]);
    toolExecutor.registerTool(transformedLinearMcpTools[tool]);
  }

  // Create configurable agent
  const agent = createConfigurableAgent({
    llmService: baseLLMService({ toolExecutionMode: "custom" }),
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
        custom: [calculatorTool, currentTimeTool, createImageTool],
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
  const conversation = createConversationFlow({
    agent,
    toolExecutor,
    maxIterations: 50, // Safety limit
    enableProgressStreaming: true,
    debugMode: process.env.DEBUG === "true",
    conversationOptions: {
      onToolExecution: (toolName, args, result) => {
        if (process.env.DEBUG) {
          console.log("  Args:", args);
          console.log("  Result:", result);
        }
      },
    },
    onProgress: async (message) => {
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
    },
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

    const result = await conversation.sendMessageWithToolResolution(message);

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

  // Clean up MCP client if connected
  if (mcpClient) {
    try {
      await mcpClient.close();
      p.log.info("Closed MCP connection.");
    } catch (error) {
      // Ignore cleanup errors
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
