import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MTMService,
  MTMSummary,
  MemoryEvent,
  STMService,
} from "../services/memory/memory.types.js";
import { createMemoryTools, getMemoryToolsArray } from "./memory.tools.js";

describe("createMemoryTools", () => {
  // Mock STM service
  const mockSTM: STMService = {
    log: vi.fn(),
    getRecent: vi.fn(),
    getByType: vi.fn(),
    clear: vi.fn(),
    getLogPath: vi.fn(() => "./memory/stm.jsonl"),
  };

  // Mock MTM service
  const mockMTM: MTMService = {
    summarizeDay: vi.fn(),
    getSummary: vi.fn(),
    getSummaryMarkdown: vi.fn(),
    listSummaries: vi.fn(),
    searchFacts: vi.fn(),
    getStoragePath: vi.fn(() => "./memory/mtm"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchRecentMemory", () => {
    it("should search recent memory events", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const testEvents: MemoryEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: { message: "Hello AI" },
        },
        {
          timestamp: new Date().toISOString(),
          type: "conversation.agent.response",
          data: { message: "Hello! How can I help?" },
        },
      ];

      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const result = await tools.searchRecentMemory.execute({
        hours: 24,
        query: undefined,
        eventType: undefined,
      });

      expect(mockSTM.getRecent).toHaveBeenCalledWith(24);
      expect(result.totalEvents).toBe(2);
      expect(result.filteredEvents).toBe(2);
      expect(result.timeRange).toBe("last 24 hours");
      expect(result.events).toHaveLength(2);
    });

    it("should filter by event type", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const testEvents: MemoryEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: { message: "Hello" },
        },
        {
          timestamp: new Date().toISOString(),
          type: "conversation.agent.response",
          data: { message: "Hi there" },
        },
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: { message: "How are you?" },
        },
      ];

      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const result = await tools.searchRecentMemory.execute({
        hours: 24,
        eventType: "conversation.user.message",
      });

      expect(result.filteredEvents).toBe(2);
      expect(result.events).toHaveLength(2);
      expect(
        result.events.every((e) => e.type === "conversation.user.message"),
      ).toBe(true);
    });

    it("should filter by query text", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const testEvents: MemoryEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: { message: "Tell me about TypeScript" },
        },
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: { message: "What is JavaScript?" },
        },
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: { message: "I love TypeScript" },
        },
      ];

      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const result = await tools.searchRecentMemory.execute({
        hours: 24,
        query: "typescript",
      });

      expect(result.filteredEvents).toBe(2);
      expect(result.events).toHaveLength(2);
    });

    it("should limit results to last 10 events", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const testEvents: MemoryEvent[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          timestamp: new Date().toISOString(),
          type: "test.event",
          data: { index: i },
        }));

      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const result = await tools.searchRecentMemory.execute({
        hours: 24,
      });

      expect(result.events).toHaveLength(10);
      expect(result.events[0].preview).toContain('index":10'); // Should be events 10-19
    });
  });

  describe("recallConversationHistory", () => {
    it("should recall both user and agent messages", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const userMessages: MemoryEvent[] = [
        {
          timestamp: new Date("2024-01-15T10:00:00Z").toISOString(),
          type: "conversation.user.message",
          data: { message: "Hello" },
        },
        {
          timestamp: new Date("2024-01-15T10:02:00Z").toISOString(),
          type: "conversation.user.message",
          data: { message: "How are you?" },
        },
      ];

      const agentMessages: MemoryEvent[] = [
        {
          timestamp: new Date("2024-01-15T10:01:00Z").toISOString(),
          type: "conversation.agent.response",
          data: { message: "Hi there!" },
        },
        {
          timestamp: new Date("2024-01-15T10:03:00Z").toISOString(),
          type: "conversation.agent.response",
          data: { message: "I am doing well!" },
        },
      ];

      mockSTM.getByType = vi
        .fn()
        .mockResolvedValueOnce(userMessages)
        .mockResolvedValueOnce(agentMessages);

      const result = await tools.recallConversationHistory.execute({
        limit: 10,
        messageType: "both",
      });

      expect(mockSTM.getByType).toHaveBeenCalledWith(
        "conversation.user.message",
        10,
      );
      expect(mockSTM.getByType).toHaveBeenCalledWith(
        "conversation.agent.response",
        10,
      );
      expect(result.messageCount).toBe(4);
      expect(result.messages).toHaveLength(4);
      // Check messages are sorted by time
      expect(result.messages[0].content).toBe("Hello");
      expect(result.messages[1].content).toBe("Hi there!");
      expect(result.messages[2].content).toBe("How are you?");
      expect(result.messages[3].content).toBe("I am doing well!");
    });

    it("should recall only user messages when specified", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const userMessages: MemoryEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: { message: "User message 1" },
        },
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: { message: "User message 2" },
        },
      ];

      mockSTM.getByType = vi.fn().mockResolvedValue(userMessages);

      const result = await tools.recallConversationHistory.execute({
        limit: 5,
        messageType: "user",
      });

      expect(mockSTM.getByType).toHaveBeenCalledWith(
        "conversation.user.message",
        5,
      );
      expect(mockSTM.getByType).toHaveBeenCalledTimes(1); // Not called for agent messages
      expect(result.messages.every((m) => m.role === "user")).toBe(true);
    });

    it("should handle missing message content", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const messages: MemoryEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: "conversation.user.message",
          data: {}, // No message property
        },
      ];

      mockSTM.getByType = vi.fn().mockResolvedValue(messages);

      const result = await tools.recallConversationHistory.execute({
        limit: 5,
        messageType: "user",
      });

      expect(result.messages[0].content).toBe("[No content]");
    });
  });

  describe("getMemoryStatistics", () => {
    it("should calculate statistics from events", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      // Use current time to avoid timezone issues
      const now = new Date();
      const hour1 = 10;
      const hour2 = 14;

      const testEvents: MemoryEvent[] = [
        {
          timestamp: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hour1,
          ).toISOString(),
          type: "conversation.user.message",
          data: {},
          metadata: { source: "cli" },
        },
        {
          timestamp: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hour1,
          ).toISOString(),
          type: "conversation.user.message",
          data: {},
          metadata: { source: "cli" },
        },
        {
          timestamp: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hour2,
          ).toISOString(),
          type: "conversation.agent.response",
          data: {},
          metadata: { source: "agent" },
        },
      ];

      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const result = await tools.getMemoryStatistics.execute({ hours: 24 });

      expect(result.totalEvents).toBe(3);
      expect(result.eventTypes["conversation.user.message"]).toBe(2);
      expect(result.eventTypes["conversation.agent.response"]).toBe(1);
      expect(result.sources["cli"]).toBe(2);
      expect(result.sources["agent"]).toBe(1);

      // Check that we have activity by hour
      const hourKeys = Object.keys(result.activityByHour);
      expect(hourKeys.length).toBeGreaterThan(0);

      // Check that activity counts are correct
      const totalActivity = Object.values(result.activityByHour).reduce(
        (sum, count) => sum + count,
        0,
      );
      expect(totalActivity).toBe(3);

      expect(result.mostCommonType).toBe("conversation.user.message");
    });

    it("should handle empty events", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      mockSTM.getRecent = vi.fn().mockResolvedValue([]);

      const result = await tools.getMemoryStatistics.execute({ hours: 24 });

      expect(result.totalEvents).toBe(0);
      expect(result.mostActiveHour).toBe("none");
      expect(result.mostCommonType).toBe("none");
    });
  });

  describe("searchMemoryByTags", () => {
    it("should search by tags with ANY match mode", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const testEvents: MemoryEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: "note",
          data: { content: "Work meeting" },
          metadata: { tags: ["work", "meeting"] },
        },
        {
          timestamp: new Date().toISOString(),
          type: "note",
          data: { content: "Personal task" },
          metadata: { tags: ["personal"] },
        },
        {
          timestamp: new Date().toISOString(),
          type: "note",
          data: { content: "Work task" },
          metadata: { tags: ["work", "todo"] },
        },
      ];

      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const result = await tools.searchMemoryByTags.execute({
        tags: ["work", "personal"],
        matchAll: false,
      });

      expect(result.foundEvents).toBe(3); // All events match
      expect(result.matchMode).toBe("any");
    });

    it("should search by tags with ALL match mode", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const testEvents: MemoryEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: "note",
          data: { content: "Work meeting" },
          metadata: { tags: ["work", "meeting", "important"] },
        },
        {
          timestamp: new Date().toISOString(),
          type: "note",
          data: { content: "Regular meeting" },
          metadata: { tags: ["meeting"] },
        },
        {
          timestamp: new Date().toISOString(),
          type: "note",
          data: { content: "Important work" },
          metadata: { tags: ["work", "important"] },
        },
      ];

      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const result = await tools.searchMemoryByTags.execute({
        tags: ["work", "meeting"],
        matchAll: true,
      });

      expect(result.foundEvents).toBe(1); // Only first event has both tags
      expect(result.events[0].tags).toEqual(["work", "meeting", "important"]);
    });

    it("should handle events without tags", async () => {
      const tools = createMemoryTools({ stm: mockSTM });
      const testEvents: MemoryEvent[] = [
        {
          timestamp: new Date().toISOString(),
          type: "note",
          data: { content: "No tags" },
          // No metadata or tags
        },
        {
          timestamp: new Date().toISOString(),
          type: "note",
          data: { content: "Has tags" },
          metadata: { tags: ["test"] },
        },
      ];

      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const result = await tools.searchMemoryByTags.execute({
        tags: ["test"],
        matchAll: false,
      });

      expect(result.foundEvents).toBe(1);
    });
  });

  describe("recallFacts", () => {
    it("should recall facts from MTM summaries", async () => {
      const tools = createMemoryTools({ stm: mockSTM, mtm: mockMTM });

      const todaySummary: MTMSummary = {
        date: "2024-01-15",
        extractedFacts: {
          userName: "Alice",
          userPreferences: ["favorite color: blue"],
          keyTopics: ["AI", "TypeScript"],
          importantEvents: [],
          relationships: {},
        },
        conversations: {
          count: 1,
          totalMessages: 5,
          avgLength: 50,
          topics: [],
        },
        eventStatistics: {},
        highlights: [],
        createdAt: new Date().toISOString(),
      };

      const historicalSummary: MTMSummary = {
        date: "2024-01-14",
        extractedFacts: {
          userPreferences: ["favorite food: pizza", "favorite color: blue"],
          keyTopics: ["JavaScript"],
          importantEvents: [],
          relationships: {},
        },
        conversations: {
          count: 1,
          totalMessages: 3,
          avgLength: 40,
          topics: [],
        },
        eventStatistics: {},
        highlights: [],
        createdAt: new Date().toISOString(),
      };

      mockMTM.getSummary = vi.fn().mockResolvedValue(todaySummary);
      mockMTM.searchFacts = vi.fn().mockResolvedValue([historicalSummary]);

      const result = await tools.recallFacts.execute({
        query: "preferences",
      });

      expect(result.foundFacts.userName).toBe("Alice");
      expect(result.foundFacts.userPreferences).toHaveLength(2); // Deduplicated
      expect(result.foundFacts.userPreferences).toContain(
        "favorite color: blue",
      );
      expect(result.foundFacts.userPreferences).toContain(
        "favorite food: pizza",
      );
      expect(result.sourceDates).toEqual(["2024-01-15", "2024-01-14"]);
    });

    it("should handle missing MTM service", async () => {
      const tools = createMemoryTools({ stm: mockSTM }); // No MTM

      const result = await tools.recallFacts.execute({
        query: "user name",
      });

      expect(result.error).toBe("Mid-term memory not available");
      expect(result.suggestion).toBe("Try using search_recent_memory instead");
    });

    it("should handle no facts found", async () => {
      const tools = createMemoryTools({ stm: mockSTM, mtm: mockMTM });

      mockMTM.getSummary = vi.fn().mockResolvedValue(null);
      mockMTM.searchFacts = vi.fn().mockResolvedValue([]);

      const result = await tools.recallFacts.execute({
        query: "nonexistent",
      });

      expect(result.foundFacts).toEqual({});
      expect(result.sourceDates).toEqual([]);
    });
  });

  describe("getMemoryToolsArray", () => {
    it("should return all tools as an array", () => {
      const toolsArray = getMemoryToolsArray({ stm: mockSTM, mtm: mockMTM });

      expect(Array.isArray(toolsArray)).toBe(true);
      expect(toolsArray).toHaveLength(5);
      expect(
        toolsArray.every(
          (tool) =>
            typeof tool.name === "string" && typeof tool.execute === "function",
        ),
      ).toBe(true);

      const toolNames = toolsArray.map((t) => t.name);
      expect(toolNames).toContain("search_recent_memory");
      expect(toolNames).toContain("recall_conversation_history");
      expect(toolNames).toContain("get_memory_statistics");
      expect(toolNames).toContain("search_memory_by_tags");
      expect(toolNames).toContain("recall_facts");
    });
  });
});
