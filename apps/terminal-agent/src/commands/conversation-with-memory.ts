import * as p from "@clack/prompts";
import {
  createConfigurableAgent,
  createSimpleSTMService,
  createConversationLoop,
  baseLLMService,
} from "@mrck-labs/grid-core";
import { textWithCancel, isCancel } from "../utils/prompts.js";
import { createSpinner } from "../utils/spinners.js";
import pc from "picocolors";
import { saveConversation } from "./helpers/conversation.helper.js";

export async function conversationWithMemory(): Promise<void> {
  p.intro(pc.cyan("🧠 Conversation with Memory"));
  p.log.info("Chat with an AI assistant that remembers your conversation.");
  p.log.info("Type 'exit' to end the conversation.");
  
  // Initialize STM service with memory storage in terminal-agent
  const stm = createSimpleSTMService({
    logPath: './memory/stm.jsonl'
  });
  
  p.log.info(pc.dim(`Memory will be saved to: ${stm.getLogPath()}`));
  p.log.info(pc.dim("(Check the memory/stm.jsonl file to see logged events)\n"));
  
  // Create configurable agent
  const agent = createConfigurableAgent({
    llmService: baseLLMService({
      langfuse: { enabled: true },
    }),
    config: {
      id: "memory-agent",
      type: "general",
      prompts: {
        system: `You are a helpful assistant participating in a conversation that is being logged to memory.
You can refer to our conversation history and provide contextual responses.
Be friendly and remember details from our chat.`,
      },
      version: "1.0.0",
      metadata: {
        id: "memory-agent",
        type: "general",
        name: "Memory Agent",
        description: "An agent with memory capabilities",
        capabilities: ["general"],
        icon: "🧠",
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
  });
  
  // Create conversation loop with memory logging
  const conversation = createConversationLoop({
    agent,
    handlers: {
      loop: {
        onConversationStarted: async (context) => {
          await stm.log({
            type: 'conversation.started',
            data: { timestamp: new Date().toISOString(), context }
          });
          return { initialMessages: [] };
        },
        onMessageSent: async (message, context) => {
          await stm.log({
            type: 'user.message',
            data: { message, timestamp: new Date().toISOString() }
          });
        },
        onResponseReceived: async (response, context) => {
          await stm.log({
            type: 'agent.response',
            data: { 
              response: response.content,
              toolCalls: response.toolCalls,
              timestamp: new Date().toISOString()
            }
          });
        },
        onConversationEnded: async (summary, context) => {
          await stm.log({
            type: 'conversation.ended',
            data: { summary, timestamp: new Date().toISOString() }
          });
        },
      },
    },
    onMessage: async (response) => {
      // Display the response
      if (response.content) {
        console.log(pc.green("\n🤖 Assistant:"), response.content);
      }
    },
    onError: async (error) => {
      p.log.error(`Error: ${error.message}`);
    },
  });
  
  p.log.success("Memory-enabled conversation started");
  
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
    
    // Special command: show memory stats
    if (message.toLowerCase() === "/memory") {
      p.log.info("\n📊 Memory Statistics:");
      p.log.info(`  Log file: ${stm.getLogPath()}`);
      p.log.info(pc.dim("  (Phase 0.3 will add memory retrieval capabilities)"));
      console.log(""); // Empty line
      continue;
    }
    
    if (message.toLowerCase() === "/help") {
      p.log.info("\n📖 Available commands:");
      p.log.info("  /memory - Show memory information");
      p.log.info("  /help - Show this help message");
      p.log.info("  exit/quit - End the conversation");
      p.log.info(pc.dim("\n💾 Note: All messages are logged to memory/stm.jsonl"));
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
  
  const summary = conversation.getSummary();
  
  p.outro(pc.cyan("\n👋 Conversation ended\n"));
  
  p.log.info("📊 Final Statistics:");
  p.log.info(`  Total messages: ${summary.messageCount}`);
  p.log.info(`  Your messages: ${summary.userMessageCount}`);
  p.log.info(`  Assistant messages: ${summary.assistantMessageCount}`);
  p.log.info(`  Duration: ${Math.round(summary.duration / 1000)} seconds`);
  p.log.info(pc.dim("\n💾 Memory saved to: " + stm.getLogPath()));
}