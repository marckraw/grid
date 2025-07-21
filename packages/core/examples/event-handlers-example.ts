import { createConversationLoop } from "../src/services/conversation-loop.service.js";
import { createConfigurableAgent } from "../src/factories/configurable-agent.factory.js";
import { baseLLMService } from "../src/services/base.llm.service.js";
import type { ChatMessage } from "../src/types/llm.types.js";

// Mock database interface
interface MockDatabase {
  conversations: Map<string, {
    messages: ChatMessage[];
    metadata: Record<string, any>;
  }>;
}

const mockDb: MockDatabase = {
  conversations: new Map()
};

// Create a simple agent
const agent = createConfigurableAgent({
  systemPrompt: "You are a helpful assistant.",
  enableThinking: false,
  llmService: baseLLMService({
    modelProvider: "openai",
    modelName: "gpt-4",
    temperature: 0.7,
  }),
  tools: {},
  handlers: {}
});

// Create conversation loop with event handlers
const conversationLoop = createConversationLoop({
  agent,
  conversationOptions: {
    historyOptions: {
      handlers: {
        // Atomic level: Log when messages are added to history
        onMessageAdded: async (message) => {
          console.log("[History] Message added:", message.role, message.content?.substring(0, 50));
        },
        onToolResponseAdded: async (toolResponse) => {
          console.log("[History] Tool response added:", toolResponse.toolName);
        },
        onCleared: async () => {
          console.log("[History] Conversation cleared");
        }
      }
    },
    contextOptions: {
      handlers: {
        // Atomic level: Log context changes
        onStateChanged: async (key, newValue, oldValue) => {
          console.log(`[Context] State changed: ${key} = ${newValue} (was ${oldValue})`);
        },
        onMetadataChanged: async (key, value) => {
          console.log(`[Context] Metadata changed: ${key} = ${value}`);
        }
      }
    },
    handlers: {
      // Composed level: Log manager events
      onUserMessageAdded: async (message) => {
        console.log("[Manager] User message added:", message);
      },
      onAgentResponseProcessed: async (response) => {
        console.log("[Manager] Agent response processed:", response.content?.substring(0, 50));
      }
    }
  },
  handlers: {
    // Organism level: Database persistence
    onConversationStarted: async (context) => {
      console.log("[Loop] Conversation started:", context);
      
      // Initialize conversation in database
      const conversationId = context.conversationId || "test-conversation";
      
      // Check if conversation exists in DB
      const existing = mockDb.conversations.get(conversationId);
      if (existing) {
        console.log("[Loop] Loading existing conversation with", existing.messages.length, "messages");
        return { initialMessages: existing.messages };
      } else {
        console.log("[Loop] Creating new conversation");
        mockDb.conversations.set(conversationId, {
          messages: [],
          metadata: {}
        });
        return { initialMessages: [] };
      }
    },
    
    onMessageSent: async (message, context) => {
      console.log("[Loop] Message sent:", message);
      console.log("[Loop] Context:", context);
      
      // Save to database
      const conversationId = context.sessionId || "test-conversation";
      const conv = mockDb.conversations.get(conversationId);
      if (conv) {
        conv.messages.push({ role: "user", content: message });
      }
    },
    
    onResponseReceived: async (response, context) => {
      console.log("[Loop] Response received:", response.content?.substring(0, 50));
      
      // Save to database
      const conversationId = context.sessionId || "test-conversation";
      const conv = mockDb.conversations.get(conversationId);
      if (conv) {
        conv.messages.push({
          role: "assistant",
          content: response.content,
          toolCalls: response.toolCalls
        });
      }
    },
    
    onConversationEnded: async (summary, context) => {
      console.log("[Loop] Conversation ended:", summary);
      
      // Update metadata in database
      const conversationId = context.sessionId || "test-conversation";
      const conv = mockDb.conversations.get(conversationId);
      if (conv) {
        conv.metadata = { ...conv.metadata, ...summary };
      }
    }
  }
});

// Example usage
async function testEventHandlers() {
  console.log("=== Testing Event Handlers ===");
  
  // Send a message
  const result = await conversationLoop.sendMessage("Hello, how are you?");
  console.log("\nAgent response:", result.response.content);
  
  // Check database
  console.log("\n=== Database Contents ===");
  const conv = mockDb.conversations.get("test-conversation");
  console.log("Messages in DB:", conv?.messages.length);
  conv?.messages.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg.role}: ${msg.content?.substring(0, 50)}...`);
  });
  
  // End conversation
  await conversationLoop.endConversation();
  
  console.log("\n=== Final Metadata ===");
  console.log(conv?.metadata);
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEventHandlers().catch(console.error);
}

export { testEventHandlers };