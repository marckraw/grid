import { createConversationLoop } from "../src/services/conversation-loop.service.js";
import { createConfigurableAgent } from "../src/factories/configurable-agent.factory.js";
import { baseLLMService } from "../src/services/base.llm.service.js";
import type { ChatMessage } from "../src/types/llm.types.js";

// Example: External database integration
class ConversationDatabase {
  private conversations: Map<string, ChatMessage[]> = new Map();
  
  async loadConversation(conversationId: string): Promise<ChatMessage[]> {
    return this.conversations.get(conversationId) || [];
  }
  
  async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
    const messages = this.conversations.get(conversationId) || [];
    messages.push(message);
    this.conversations.set(conversationId, messages);
  }
  
  async saveMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
    this.conversations.set(conversationId, messages);
  }
}

// Create database instance
const db = new ConversationDatabase();

// Create agent
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

// Create conversation loop with persistence
export function createPersistentConversation(conversationId: string) {
  return createConversationLoop({
    agent,
    conversationOptions: {
      contextOptions: {
        sessionId: conversationId
      },
      historyOptions: {
        handlers: {
          // Save every message added to history
          onMessageAdded: async (message) => {
            await db.saveMessage(conversationId, message);
          }
        }
      }
    },
    handlers: {
      // Load conversation on start
      onConversationStarted: async (context) => {
        const messages = await db.loadConversation(conversationId);
        console.log(`Loaded ${messages.length} messages from database`);
        return { initialMessages: messages };
      },
      
      // Alternative: Save full conversation after each exchange
      onResponseReceived: async (response, context) => {
        // You could also save the entire conversation state here
        // const allMessages = conversationLoop.getMessages();
        // await db.saveMessages(conversationId, allMessages);
      }
    }
  });
}

// Example usage
async function exampleUsage() {
  // Create a persistent conversation
  const conversation = createPersistentConversation("user-123-chat-1");
  
  // First message (will be saved to DB)
  await conversation.sendMessage("What is the capital of France?");
  
  // Create a new conversation instance with same ID
  // This will load the previous messages
  const resumedConversation = createPersistentConversation("user-123-chat-1");
  
  // Continue the conversation
  await resumedConversation.sendMessage("What about Germany?");
  
  // The conversation history is preserved across instances
}

export { ConversationDatabase, exampleUsage };