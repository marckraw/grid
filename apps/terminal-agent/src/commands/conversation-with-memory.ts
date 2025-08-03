import * as p from "@clack/prompts";
import {
  createConfigurableAgent,
  createSimpleSTMService,
  createConversationLoop,
  baseLLMService,
  createMemoryTools,
  createToolExecutor,
} from "@mrck-labs/grid-core";
import { textWithCancel, isCancel } from "../utils/prompts.js";
import { createSpinner } from "../utils/spinners.js";
import pc from "picocolors";
import { saveConversation } from "./helpers/conversation.helper.js";

export async function conversationWithMemory(): Promise<void> {
  p.intro(pc.cyan("🧠 Conversation with Memory"));
  p.log.info("Chat with an AI assistant that has memory capabilities.");
  p.log.info("The agent can now query its own memory!");
  p.log.info("Try asking: 'What did we talk about earlier?' or 'Do you remember...?'");
  p.log.info("Type 'exit' to end the conversation.");
  
  // Initialize STM service with memory storage in terminal-agent
  const stm = createSimpleSTMService({
    logPath: './memory/stm.jsonl'
  });
  
  p.log.info(pc.dim(`Memory will be saved to: ${stm.getLogPath()}`));
  p.log.info(pc.dim("Agent can now query its own memory using tools!\n"));
  
  // Create memory tools
  const memoryTools = createMemoryTools(stm);
  
  // Create tool executor and register memory tools
  const toolExecutor = createToolExecutor();
  Object.values(memoryTools).forEach(tool => {
    toolExecutor.registerTool(tool);
    p.log.success(`Registered memory tool: ${tool.name}`);
  });
  
  // Create configurable agent with memory tools
  const agent = createConfigurableAgent({
    llmService: baseLLMService({
      langfuse: { enabled: true },
    }),
    config: {
      id: "memory-agent",
      type: "general",
      prompts: {
        system: `You are a helpful assistant with memory capabilities.

You have access to memory tools that let you:
- search_recent_memory: Search through recent events and conversations
- recall_conversation_history: Recall previous messages from conversations
- get_memory_statistics: Get statistics about memory usage
- search_memory_by_tags: Search memory by tags

When users ask about "what we discussed", "earlier", "before", or reference previous conversations, 
use your memory tools to provide accurate responses.

Be proactive in using memory when it would enhance your responses.`,
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
        custom: Object.values(memoryTools),
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
    toolExecutor,
  });
  
  // Create conversation loop with memory logging
  const conversation = createConversationLoop({
    agent,
    handlers: {
      loop: {
        onConversationStarted: async (context) => {
          await stm.log({
            type: 'conversation.started',
            data: { context },
            metadata: {
              source: 'conversation',
              conversationId: context.conversationId,
              agentId: 'memory-agent',
              tags: ['conversation', 'start'],
              priority: 2
            }
          });
          return { initialMessages: [] };
        },
        onMessageSent: async (message, context) => {
          await stm.log({
            type: 'conversation.user.message',
            data: { message },
            metadata: {
              source: 'conversation',
              conversationId: context?.conversationId,
              userId: context?.userId,
              tags: ['conversation', 'user-input'],
              priority: 2
            }
          });
        },
        onResponseReceived: async (response, context) => {
          await stm.log({
            type: 'conversation.agent.response',
            data: { 
              content: response.content,
              toolCalls: response.toolCalls
            },
            metadata: {
              source: 'conversation',
              conversationId: context?.conversationId,
              agentId: 'memory-agent',
              tags: ['conversation', 'agent-output'],
              priority: 2
            }
          });
        },
        onConversationEnded: async (summary, context) => {
          await stm.log({
            type: 'conversation.ended',
            data: { summary },
            metadata: {
              source: 'conversation',
              conversationId: context?.conversationId,
              agentId: 'memory-agent',
              tags: ['conversation', 'end'],
              priority: 2
            }
          });
        },
      },
      manager: {
        onToolExecution: async (toolName, args, result) => {
          await stm.log({
            type: 'tool.execution',
            data: { toolName, args, result },
            metadata: {
              source: 'conversation',
              agentId: 'memory-agent',
              tags: ['tool', 'execution', toolName],
              priority: 3
            }
          });
        },
        onAgentResponseProcessed: async (response: any) => {
          if (response.toolCalls && response.toolCalls.length > 0) {
            await stm.log({
              type: 'tool.calls.requested',
              data: { 
                toolCalls: response.toolCalls
              },
              metadata: {
                source: 'conversation',
                agentId: 'memory-agent',
                tags: ['tool', 'request'],
                priority: 3
              }
            });
          }
        },
      },
    },
    onMessage: async (response) => {
      // Display tool calls if any
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          if (toolCall.toolName.includes('memory')) {
            p.log.step(pc.dim(`🧠 Using memory: ${toolCall.toolName}...`));
          }
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
      const recentEvents = await stm.getRecent(24);
      const eventTypes = [...new Set(recentEvents.map(e => e.type))];
      
      p.log.info("\n📊 Memory Statistics (last 24h):");
      p.log.info(`  Total events: ${recentEvents.length}`);
      p.log.info(`  Event types: ${eventTypes.join(', ')}`);
      p.log.info(`  Log file: ${stm.getLogPath()}`);
      
      // Count by type
      const typeCounts: Record<string, number> = {};
      recentEvents.forEach(e => {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      });
      
      p.log.info("\n  Events by type:");
      Object.entries(typeCounts).forEach(([type, count]) => {
        p.log.info(`    ${type}: ${count}`);
      });
      
      console.log(""); // Empty line
      continue;
    }
    
    // Show recent messages
    if (message.toLowerCase() === "/memory recent") {
      const recentMessages = await stm.getByType('conversation.user.message', 5);
      
      p.log.info("\n💬 Recent messages:");
      recentMessages.forEach((event, idx) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        p.log.info(`  [${time}] ${event.data.message}`);
      });
      
      console.log(""); // Empty line
      continue;
    }
    
    // Show recent responses
    if (message.toLowerCase() === "/memory responses") {
      const recentResponses = await stm.getByType('conversation.agent.response', 3);
      
      p.log.info("\n🤖 Recent agent responses:");
      recentResponses.forEach((event, idx) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        const content = event.data.content || '[No content]';
        const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
        p.log.info(`  [${time}] ${preview}`);
      });
      
      console.log(""); // Empty line
      continue;
    }
    
    // Clear memory
    if (message.toLowerCase() === "/memory clear") {
      const confirm = await p.confirm({
        message: "Are you sure you want to clear all memory?",
        initialValue: false,
      });
      
      if (confirm && !p.isCancel(confirm)) {
        await stm.clear();
        p.log.success("Memory cleared!");
      }
      
      console.log(""); // Empty line
      continue;
    }
    
    if (message.toLowerCase() === "/help") {
      p.log.info("\n📖 Available commands:");
      p.log.info("  /memory - Show memory statistics");
      p.log.info("  /memory recent - Show recent messages");
      p.log.info("  /memory responses - Show recent agent responses");
      p.log.info("  /memory clear - Clear all memory");
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