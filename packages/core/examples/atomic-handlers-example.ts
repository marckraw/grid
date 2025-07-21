import { createConversationHistory } from "../src/services/conversation-history.service.js";
import { createConversationContext } from "../src/services/conversation-context.service.js";
import { createConversationManager } from "../src/services/conversation-manager.service.js";

// Example: Using atomic primitives directly with handlers

console.log("=== Atomic Primitives with Handlers ===\n");

// 1. ConversationHistory - Atomic level
console.log("1. Creating ConversationHistory with handlers...\n");

const history = createConversationHistory({
  handlers: {
    onMessageAdded: async (message) => {
      console.log(`[History] ${message.role} message: ${message.content?.substring(0, 50)}`);
      // Save to your database
    },
    onToolResponseAdded: async (toolResponse) => {
      console.log(`[History] Tool ${toolResponse.toolName} executed`);
      // Track tool usage
    },
    onCleared: async () => {
      console.log("[History] Conversation history cleared");
      // Clear from database
    }
  }
});

// Use the history
await history.addMessage({
  role: "user",
  content: "What's the weather like?"
});

await history.addMessage({
  role: "assistant", 
  content: "Let me check the weather for you.",
  toolCalls: [{
    toolCallId: "call_001",
    toolName: "getWeather",
    args: { location: "New York" }
  }]
});

await history.addToolResponse(
  "call_001",
  "getWeather",
  { temp: 75, condition: "sunny" }
);

// 2. ConversationContext - Atomic level
console.log("\n2. Creating ConversationContext with handlers...\n");

const context = createConversationContext({
  sessionId: "session-123",
  userId: "user-456",
  handlers: {
    onStateChanged: async (key, newValue, oldValue) => {
      console.log(`[Context] State '${key}': ${oldValue} -> ${newValue}`);
      // Sync state changes
    },
    onStatesChanged: async (updates, oldState) => {
      console.log(`[Context] Bulk update: ${Object.keys(updates).join(", ")}`);
      // Batch sync
    },
    onMetadataChanged: async (key, value) => {
      console.log(`[Context] Metadata '${key}' = ${value}`);
      // Update metadata store
    },
    onReset: async () => {
      console.log("[Context] Context has been reset");
      // Clear context from store
    }
  }
});

// Use the context
await context.updateState("currentTopic", "weather");
await context.updateState("sentiment", "curious");
await context.updateStates({
  location: "New York",
  timezone: "EST"
});
await context.updateMetadata("lastActive", new Date().toISOString());

// 3. ConversationManager - Composed level (uses both history and context)
console.log("\n3. Creating ConversationManager with all handlers...\n");

const manager = createConversationManager({
  handlers: {
    // Manager's own handlers
    manager: {
      onUserMessageAdded: async (message) => {
        console.log("[Manager] User message processed");
      },
      onAgentResponseProcessed: async (response) => {
        console.log("[Manager] Agent response processed");
      }
    },
    // Pass handlers to atomic services
    history: {
      onMessageAdded: async (message) => {
        console.log(`[Manager>History] ${message.role} message added`);
      }
    },
    context: {
      onStateChanged: async (key, newValue) => {
        console.log(`[Manager>Context] State '${key}' updated`);
      }
    }
  }
});

// Use the manager
await manager.addUserMessage("Tell me a joke");
await manager.updateState("requestType", "humor");

// Summary
console.log("\n=== Summary ===");
console.log("- Atomic primitives (History, Context) can have their own handlers");
console.log("- Composed primitives (Manager) can have handlers at multiple levels");
console.log("- ConversationLoop provides the highest level with all handlers grouped");
console.log("\nChoose the right level based on your needs:");
console.log("- Use atomic primitives for fine-grained control");
console.log("- Use ConversationManager for managing conversations without full agent loop");
console.log("- Use ConversationLoop for complete agent-driven conversations");

export { history, context, manager };