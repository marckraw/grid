import { createConversationManager } from "../src/services/conversation-manager.service.js";
import type { ChatMessage } from "../src/types/llm.types.js";
import type { AgentResponse } from "../src/types/agent.types.js";

// Example: Using ConversationManager directly with grouped handlers

// Mock database for persistence
interface ConversationStore {
  messages: ChatMessage[];
  state: Record<string, any>;
  metadata: Record<string, any>;
}

const conversationStore: ConversationStore = {
  messages: [],
  state: {},
  metadata: {}
};

// Create conversation manager with grouped handlers
const conversationManager = createConversationManager({
  handlers: {
    // Manager-level handlers
    manager: {
      onUserMessageAdded: async (message) => {
        console.log("[Manager] User said:", message);
        // Could trigger analytics, notifications, etc.
      },
      
      onAgentResponseProcessed: async (response) => {
        console.log("[Manager] Agent responded");
        // Could update UI, send webhooks, etc.
      },
      
      onToolExecution: async (toolName, args, result) => {
        console.log(`[Manager] Tool '${toolName}' executed with args:`, args);
        console.log("[Manager] Tool result:", result);
        // Could track tool usage metrics
      },
      
      onReset: async () => {
        console.log("[Manager] Conversation reset");
        // Could clear UI state, notify user, etc.
      }
    },
    
    // History handlers (atomic level)
    history: {
      onMessageAdded: async (message) => {
        console.log(`[History] ${message.role} message added`);
        // Persist to database
        conversationStore.messages.push(message);
      },
      
      onToolResponseAdded: async (toolResponse) => {
        console.log(`[History] Tool response for ${toolResponse.toolName}`);
        // Could store tool responses separately
      },
      
      onCleared: async () => {
        console.log("[History] History cleared");
        conversationStore.messages = [];
      }
    },
    
    // Context handlers (atomic level)
    context: {
      onStateChanged: async (key, newValue, oldValue) => {
        console.log(`[Context] State '${key}': ${oldValue} -> ${newValue}`);
        conversationStore.state[key] = newValue;
      },
      
      onStatesChanged: async (updates, oldState) => {
        console.log("[Context] Multiple states updated:", Object.keys(updates));
        Object.assign(conversationStore.state, updates);
      },
      
      onMetadataChanged: async (key, value) => {
        console.log(`[Context] Metadata '${key}' = ${value}`);
        conversationStore.metadata[key] = value;
      },
      
      onReset: async () => {
        console.log("[Context] Context reset");
        conversationStore.state = {};
        conversationStore.metadata = {};
      }
    }
  }
});

// Example usage
async function demonstrateManagerUsage() {
  console.log("=== ConversationManager with Grouped Handlers ===\n");
  
  // Add a user message
  console.log("1. Adding user message...\n");
  await conversationManager.addUserMessage("Hello, how are you?");
  
  // Update some state
  console.log("\n2. Updating conversation state...\n");
  await conversationManager.updateState("topic", "greeting");
  await conversationManager.updateState("sentiment", "positive");
  
  // Update metadata
  console.log("\n3. Updating metadata...\n");
  await conversationManager.updateMetadata("language", "en");
  await conversationManager.updateMetadata("platform", "web");
  
  // Simulate processing an agent response
  console.log("\n4. Processing agent response...\n");
  const mockResponse: AgentResponse = {
    role: "assistant",
    content: "I'm doing well, thank you! How can I help you today?",
    toolCalls: [
      {
        toolCallId: "call_123",
        toolName: "checkWeather",
        args: { location: "San Francisco" }
      }
    ],
    metadata: {
      toolResponses: [
        {
          toolCallId: "call_123",
          toolName: "checkWeather",
          result: { temperature: 72, condition: "sunny" }
        }
      ]
    }
  };
  await conversationManager.processAgentResponse(mockResponse);
  
  // Check the store
  console.log("\n5. Checking persisted data...\n");
  console.log("Messages in store:", conversationStore.messages.length);
  console.log("State:", conversationStore.state);
  console.log("Metadata:", conversationStore.metadata);
  
  // Get summary
  console.log("\n6. Getting conversation summary...\n");
  const summary = conversationManager.getSummary();
  console.log("Summary:", summary);
  
  // Reset conversation
  console.log("\n7. Resetting conversation...\n");
  await conversationManager.reset();
  
  console.log("\n✅ Demo complete!");
}

// Alternative: Using manager without any handlers
function createBasicManager() {
  // You can also create a manager without handlers
  const basicManager = createConversationManager();
  
  // Or with only specific handlers
  const partialManager = createConversationManager({
    handlers: {
      history: {
        onMessageAdded: async (message) => {
          console.log("Message added:", message.content);
        }
      }
      // No manager or context handlers
    }
  });
  
  return { basicManager, partialManager };
}

// Run demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateManagerUsage().catch(console.error);
}

export { demonstrateManagerUsage, createBasicManager };