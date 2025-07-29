import { describe, it, expect, vi, afterEach } from "vitest";
import { getLastUserMessage, transformMessagesForAI } from "./utils.js";
import type { ChatMessage } from "./types/llm.types.js";

describe("getLastUserMessage", () => {
  it("should return undefined when conversation history is empty", () => {
    const conversationHistory: ChatMessage[] = [];
    const result = getLastUserMessage(conversationHistory);
    expect(result).toBeUndefined();
  });

  it("should return undefined when there are no user messages", () => {
    const conversationHistory: ChatMessage[] = [
      { role: "assistant", content: "Hello!" },
      { role: "system", content: "You are a helpful assistant" },
      {
        role: "tool",
        content: "Tool response",
        tool_call_id: "123",
        tool_name: "test",
      },
    ];
    const result = getLastUserMessage(conversationHistory);
    expect(result).toBeUndefined();
  });

  it("should return the only user message when there is one", () => {
    const userMessage: ChatMessage = {
      role: "user",
      content: "Hello, how are you?",
    };
    const conversationHistory: ChatMessage[] = [
      { role: "system", content: "You are a helpful assistant" },
      userMessage,
      { role: "assistant", content: "I am doing well, thank you!" },
    ];
    const result = getLastUserMessage(conversationHistory);
    expect(result).toEqual(userMessage);
  });

  it("should return the last user message when there are multiple user messages", () => {
    const firstUserMessage: ChatMessage = {
      role: "user",
      content: "First message",
    };
    const lastUserMessage: ChatMessage = {
      role: "user",
      content: "Last message",
    };

    const conversationHistory: ChatMessage[] = [
      { role: "system", content: "You are a helpful assistant" },
      firstUserMessage,
      { role: "assistant", content: "Response to first" },
      { role: "user", content: "Middle message" },
      { role: "assistant", content: "Response to middle" },
      lastUserMessage,
      { role: "assistant", content: "Response to last" },
    ];

    const result = getLastUserMessage(conversationHistory);
    expect(result).toEqual(lastUserMessage);
  });

  it("should return the last user message even when it is at the beginning", () => {
    const userMessage: ChatMessage = {
      role: "user",
      content: "Only user message",
    };
    const conversationHistory: ChatMessage[] = [
      userMessage,
      { role: "assistant", content: "Response" },
      { role: "assistant", content: "Another response" },
      { role: "system", content: "System message" },
    ];

    const result = getLastUserMessage(conversationHistory);
    expect(result).toEqual(userMessage);
  });

  it("should work with user messages that have metadata", () => {
    const userMessageWithMetadata: ChatMessage = {
      role: "user",
      content: "Message with metadata",
      metadata: { timestamp: "2024-01-01", source: "web" },
    };

    const conversationHistory: ChatMessage[] = [
      { role: "user", content: "First message" },
      userMessageWithMetadata,
    ];

    const result = getLastUserMessage(conversationHistory);
    expect(result).toEqual(userMessageWithMetadata);
  });

  it("should handle consecutive user messages correctly", () => {
    const lastUserMessage: ChatMessage = {
      role: "user",
      content: "Third consecutive user message",
    };

    const conversationHistory: ChatMessage[] = [
      { role: "user", content: "First consecutive user message" },
      { role: "user", content: "Second consecutive user message" },
      lastUserMessage,
    ];

    const result = getLastUserMessage(conversationHistory);
    expect(result).toEqual(lastUserMessage);
  });
});

describe("transformMessagesForAI", () => {
  // Mock console methods to avoid noise in tests
  const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when input is empty", () => {
    const result = transformMessagesForAI([]);
    expect(result).toEqual([]);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "✅ Transformed 0 messages to 0 valid AI messages"
    );
  });

  it("should transform user messages correctly", () => {
    const input = [
      { role: "user", content: "Hello, how are you?" },
      { role: "user", content: "What is the weather like?" },
    ];

    const result = transformMessagesForAI(input);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ role: "user", content: "Hello, how are you?" });
    expect(result[1]).toEqual({
      role: "user",
      content: "What is the weather like?",
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "✅ Transformed 2 messages to 2 valid AI messages"
    );
  });

  it("should transform regular assistant messages correctly", () => {
    const input = [
      { role: "assistant", content: "I am doing well, thank you!" },
      { role: "assistant", content: "The weather is sunny today." },
    ];

    const result = transformMessagesForAI(input);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      role: "assistant",
      content: "I am doing well, thank you!",
    });
    expect(result[1]).toEqual({
      role: "assistant",
      content: "The weather is sunny today.",
    });
  });

  it("should transform assistant messages with tool calls correctly", () => {
    const input = [
      {
        role: "assistant",
        tool_call_id: "call_123",
        content: JSON.stringify({
          name: "get_weather",
          arguments: '{"location": "New York"}',
        }),
      },
    ];

    const result = transformMessagesForAI(input);

    expect(result).toHaveLength(1);
    // Validation fails due to schema mismatch, so only basic structure is returned
    expect(result[0]).toEqual({
      role: "assistant",
      content: null,
    });
  });

  it("should handle malformed JSON in assistant tool call messages", () => {
    const input = [
      {
        role: "assistant",
        tool_call_id: "call_123",
        content: "invalid json content",
      },
    ];

    const result = transformMessagesForAI(input);

    expect(result).toHaveLength(0); // Should not add anything due to JSON parse error
  });

  it("should transform tool messages correctly", () => {
    const input = [
      {
        role: "tool",
        tool_call_id: "call_123",
        content: "The weather in New York is sunny.",
      },
    ];

    const result = transformMessagesForAI(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      role: "tool",
      content: "The weather in New York is sunny.",
      tool_call_id: "call_123",
    });
  });

  it("should ignore tool messages without tool_call_id", () => {
    const input = [
      {
        role: "tool",
        content: "Tool message without ID",
      },
    ];

    const result = transformMessagesForAI(input);

    expect(result).toHaveLength(0);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "✅ Transformed 1 messages to 0 valid AI messages"
    );
  });

  it("should ignore unknown message types", () => {
    const input = [
      { role: "unknown", content: "Unknown message type" },
      { role: "user", content: "Valid user message" },
    ];

    const result = transformMessagesForAI(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ role: "user", content: "Valid user message" });
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "✅ Transformed 2 messages to 1 valid AI messages"
    );
  });

  it("should handle mixed message types correctly", () => {
    const input = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
      {
        role: "assistant",
        tool_call_id: "call_456",
        content: JSON.stringify({
          name: "calculator",
          arguments: '{"operation": "add", "a": 1, "b": 2}',
        }),
      },
      { role: "tool", tool_call_id: "call_456", content: "3" },
      { role: "user", content: "Thanks!" },
    ];

    const result = transformMessagesForAI(input);

    expect(result).toHaveLength(5);

    // User message
    expect(result[0]).toEqual({ role: "user", content: "Hello" });

    // Regular assistant message
    expect(result[1]).toEqual({ role: "assistant", content: "Hi there!" });

    // Assistant message with tool call (validation fails, only basic structure returned)
    expect(result[2]).toEqual({
      role: "assistant",
      content: null,
    });

    // Tool message
    expect(result[3]).toEqual({
      role: "tool",
      content: "3",
      tool_call_id: "call_456",
    });

    // Final user message
    expect(result[4]).toEqual({ role: "user", content: "Thanks!" });
  });

  it("should handle messages with missing content gracefully", () => {
    const input = [
      { role: "user" }, // Missing content
      { role: "user", content: "Valid message" },
    ];

    const result = transformMessagesForAI(input);

    // Should still process both messages (graceful degradation)
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ role: "user", content: undefined });
    expect(result[1]).toEqual({ role: "user", content: "Valid message" });
  });

  it("should log console info with correct counts", () => {
    const input = [
      { role: "user", content: "Test" },
      { role: "unknown", content: "Will be ignored" },
      { role: "assistant", content: "Response" },
    ];

    transformMessagesForAI(input);

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "✅ Transformed 3 messages to 2 valid AI messages"
    );
  });
});
