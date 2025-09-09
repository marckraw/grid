import { validateChatMessage } from "./factories/configurable-agent.factory.types.js";
import type { ChatMessage } from "./types/llm.types.js";

export const transformMessagesForAI = (
  conversationHistory: any[],
): ChatMessage[] => {
  const transformedMessages = conversationHistory.reduce((acc, msg) => {
    // For regular user messages
    if (msg.role === "user") {
      const userMessage = {
        role: "user" as const,
        content: msg.content,
      };

      const validation = validateChatMessage(userMessage);
      if (validation.success) {
        acc.push(validation.data);
      } else {
        console.warn(
          "⚠️ Invalid user message in conversation history:",
          validation.error,
        );
        acc.push(userMessage); // Add anyway for graceful degradation
      }
      return acc;
    }

    // For assistant messages with tool calls
    if (msg.role === "assistant" && msg.tool_call_id) {
      try {
        const functionCall = JSON.parse(msg.content);
        const assistantMessage = {
          role: "assistant" as const,
          content: null, // Content should be null when there's a tool call
          tool_calls: [
            {
              id: msg.tool_call_id,
              type: "function" as const,
              function: {
                name: functionCall.name,
                arguments: functionCall.arguments,
              },
            },
          ],
        };

        const validation = validateChatMessage(assistantMessage);
        if (validation.success) {
          acc.push(validation.data);
        } else {
          console.warn(
            "⚠️ Invalid assistant tool call message:",
            validation.error,
          );
          acc.push(assistantMessage); // Add anyway
        }
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
      return acc;
    }

    // For regular assistant messages (without tool calls)
    if (msg.role === "assistant" && !msg.tool_call_id) {
      const assistantMessage = {
        role: "assistant" as const,
        content: msg.content,
      };

      const validation = validateChatMessage(assistantMessage);
      if (validation.success) {
        acc.push(validation.data);
      } else {
        console.warn("⚠️ Invalid assistant message:", validation.error);
        acc.push(assistantMessage); // Add anyway
      }
      return acc;
    }

    // For tool messages
    if (msg.role === "tool" && msg.tool_call_id) {
      const toolMessage = {
        role: "tool" as const,
        content: msg.content,
        tool_call_id: msg.tool_call_id,
      };

      const validation = validateChatMessage(toolMessage);
      if (validation.success) {
        acc.push(validation.data);
      } else {
        console.warn("⚠️ Invalid tool message:", validation.error);
        acc.push(toolMessage); // Add anyway
      }
      return acc;
    }

    return acc;
  }, [] as ChatMessage[]);

  console.info(
    `✅ Transformed ${conversationHistory.length} messages to ${transformedMessages.length} valid AI messages`,
  );
  return transformedMessages;
};

export const getLastUserMessage = (conversationHistory: ChatMessage[]) => {
  const userMessages = conversationHistory.filter((msg) => msg.role === "user");
  return userMessages[userMessages.length - 1];
};
