import { describe, expect, it, vi } from "vitest";
import {
  assertMemoryEvent,
  createFactExtractionTestEvents,
  createMixedEventTypes,
  createMockFileSystem,
  createMockMTM,
  createMockSTM,
  createSampleConversation,
  createSampleEvents,
  createSampleMTMSummary,
} from "./test-utils.js";

describe("Memory Test Utils", () => {
  describe("createMockSTM", () => {
    it("should create a mock STM service with default implementations", () => {
      const mockSTM = createMockSTM();

      expect(mockSTM.log).toBeDefined();
      expect(mockSTM.getRecent).toBeDefined();
      expect(mockSTM.getByType).toBeDefined();
      expect(mockSTM.clear).toBeDefined();
      expect(mockSTM.getLogPath).toBeDefined();

      expect(mockSTM.getLogPath()).toBe("./memory/stm.jsonl");
    });

    it("should allow overriding specific methods", async () => {
      const customEvents = [
        { timestamp: new Date().toISOString(), type: "test", data: {} },
      ];
      const mockSTM = createMockSTM({
        getRecent: vi.fn().mockResolvedValue(customEvents),
        getLogPath: vi.fn(() => "/custom/path.jsonl"),
      });

      const events = await mockSTM.getRecent(24);
      expect(events).toEqual(customEvents);
      expect(mockSTM.getLogPath()).toBe("/custom/path.jsonl");
    });
  });

  describe("createMockMTM", () => {
    it("should create a mock MTM service with default implementations", () => {
      const mockMTM = createMockMTM();

      expect(mockMTM.summarizeDay).toBeDefined();
      expect(mockMTM.getSummary).toBeDefined();
      expect(mockMTM.getSummaryMarkdown).toBeDefined();
      expect(mockMTM.listSummaries).toBeDefined();
      expect(mockMTM.searchFacts).toBeDefined();
      expect(mockMTM.getStoragePath).toBeDefined();

      expect(mockMTM.getStoragePath()).toBe("./memory/mtm");
    });

    it("should return default summary structure", async () => {
      const mockMTM = createMockMTM();
      const summary = await mockMTM.summarizeDay(new Date());

      expect(summary).toHaveProperty("date");
      expect(summary).toHaveProperty("extractedFacts");
      expect(summary).toHaveProperty("conversations");
      expect(summary).toHaveProperty("eventStatistics");
      expect(summary).toHaveProperty("highlights");
      expect(summary).toHaveProperty("createdAt");
    });
  });

  describe("createSampleEvents", () => {
    it("should create alternating user/agent events", () => {
      const events = createSampleEvents(6);

      expect(events).toHaveLength(6);
      expect(events[0].type).toBe("conversation.user.message");
      expect(events[1].type).toBe("conversation.agent.response");
      expect(events[2].type).toBe("conversation.user.message");

      // Check timestamps are 1 minute apart
      const time0 = new Date(events[0].timestamp).getTime();
      const time1 = new Date(events[1].timestamp).getTime();
      expect(time0 - time1).toBe(60000);
    });

    it("should add tags to every third event", () => {
      const events = createSampleEvents(10);

      expect(events[0].metadata?.tags).toContain("important");
      expect(events[1].metadata?.tags).toEqual([]);
      expect(events[2].metadata?.tags).toEqual([]);
      expect(events[3].metadata?.tags).toContain("important");
    });
  });

  describe("createSampleConversation", () => {
    it("should create conversation from messages", () => {
      const messages = [
        "Hello",
        "Hi there!",
        "How are you?",
        "I am doing well!",
      ];
      const events = createSampleConversation(messages);

      expect(events).toHaveLength(4);
      expect(events[0].data.message).toBe("Hello");
      expect(events[0].type).toBe("conversation.user.message");
      expect(events[1].data.message).toBe("Hi there!");
      expect(events[1].type).toBe("conversation.agent.response");
    });

    it("should group messages into conversations", () => {
      const messages = Array(25)
        .fill(null)
        .map((_, i) => `Message ${i}`);
      const events = createSampleConversation(messages);

      // First 10 messages should have same conversation ID
      const firstConvId = events[0].metadata?.conversationId;
      expect(events[9].metadata?.conversationId).toBe(firstConvId);

      // 11th message should have different conversation ID
      expect(events[10].metadata?.conversationId).not.toBe(firstConvId);
    });
  });

  describe("createSampleMTMSummary", () => {
    it("should create a complete MTM summary", () => {
      const summary = createSampleMTMSummary();

      expect(summary.extractedFacts.userName).toBe("TestUser");
      expect(summary.extractedFacts.userPreferences).toContain(
        "favorite color: blue",
      );
      expect(summary.extractedFacts.keyTopics).toContain("programming");
      expect(summary.conversations.count).toBe(3);
      expect(summary.eventStatistics["conversation.user.message"]).toBe(12);
      expect(summary.highlights).toHaveLength(3);
    });

    it("should use provided date", () => {
      const testDate = new Date("2024-01-15");
      const summary = createSampleMTMSummary(testDate);

      expect(summary.date).toBe("2024-01-15");
    });
  });

  describe("createFactExtractionTestEvents", () => {
    it("should create events with extractable facts", () => {
      const events = createFactExtractionTestEvents();

      expect(events).toHaveLength(5);

      // Check for name introduction
      expect(events[0].data.message).toContain("my name is Alice");

      // Check for preferences
      expect(events[2].data.message).toContain("favorite programming language");
      expect(events[4].data.message).toContain("favorite color");

      // Check for topics
      expect(events[3].data.message).toContain("machine learning project");
    });
  });

  describe("createMockFileSystem", () => {
    it("should simulate file operations", async () => {
      const mockFS = createMockFileSystem();

      // Test write and read
      await mockFS.writeFile("/test/file.txt", "Hello World");
      const content = await mockFS.readFile("/test/file.txt");
      expect(content).toBe("Hello World");

      // Test file not found
      await expect(mockFS.readFile("/nonexistent.txt")).rejects.toMatchObject({
        code: "ENOENT",
      });
    });

    it("should simulate directory operations", async () => {
      const mockFS = createMockFileSystem();

      // Create some files
      await mockFS.writeFile("/dir/file1.txt", "content1");
      await mockFS.writeFile("/dir/file2.txt", "content2");
      await mockFS.writeFile("/other/file3.txt", "content3");

      // List directory
      const files = await mockFS.readdir("/dir");
      expect(files).toContain("file1.txt");
      expect(files).toContain("file2.txt");
      expect(files).not.toContain("file3.txt");
    });

    it("should simulate file deletion", async () => {
      const mockFS = createMockFileSystem();

      await mockFS.writeFile("/test.txt", "content");
      await mockFS.unlink("/test.txt");

      await expect(mockFS.readFile("/test.txt")).rejects.toMatchObject({
        code: "ENOENT",
      });
    });
  });

  describe("assertMemoryEvent", () => {
    it("should validate memory event structure", () => {
      const event = {
        timestamp: new Date().toISOString(),
        type: "test.event",
        data: { message: "Hello", value: 42 },
      };

      // Should not throw
      assertMemoryEvent(event, "test.event", { message: "Hello", value: 42 });
    });

    it("should validate partial data match", () => {
      const event = {
        timestamp: new Date().toISOString(),
        type: "test.event",
        data: { message: "Hello", value: 42, extra: "data" },
      };

      // Should not throw - only checks specified fields
      assertMemoryEvent(event, "test.event", { message: "Hello" });
    });
  });

  describe("createMixedEventTypes", () => {
    it("should create diverse event types", () => {
      const events = createMixedEventTypes();

      const types = new Set(events.map((e) => e.type));
      expect(types.size).toBeGreaterThanOrEqual(7);
      expect(types.has("conversation.started")).toBe(true);
      expect(types.has("memory.recalled")).toBe(true);
      expect(types.has("error.occurred")).toBe(true);
    });

    it("should create multiple events per type", () => {
      const events = createMixedEventTypes();

      const conversationMessages = events.filter(
        (e) => e.type === "conversation.user.message",
      );
      expect(conversationMessages.length).toBeGreaterThanOrEqual(2);
    });

    it("should add metadata to events", () => {
      const events = createMixedEventTypes();

      events.forEach((event) => {
        expect(event.metadata).toBeDefined();
        expect(event.metadata?.source).toBe("test");
        expect(event.metadata?.tags).toBeDefined();
        expect(Array.isArray(event.metadata?.tags)).toBe(true);
      });
    });
  });
});
