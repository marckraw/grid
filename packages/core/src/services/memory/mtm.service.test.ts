import { promises as fs } from "fs";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LLMService,
  MTMSummary,
  MemoryEvent,
  STMService,
} from "./memory.types.js";
import { createMTMService } from "./mtm.service.js";

// Mock fs module
vi.mock("fs", () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock path module
vi.mock("path", () => ({
  join: vi.fn((...args: string[]) => args.join("/")),
  default: {
    join: vi.fn((...args: string[]) => args.join("/")),
  },
}));

describe("createMTMService", () => {
  const mockFs = fs as any;
  const mockPath = path as any;
  const defaultStoragePath = "./memory/mtm";

  // Mock STM service
  const mockSTM: STMService = {
    log: vi.fn(),
    getRecent: vi.fn(),
    getByType: vi.fn(),
    clear: vi.fn(),
    getLogPath: vi.fn(() => "./memory/stm.jsonl"),
  };

  // Mock LLM service
  const mockLLMService: LLMService = {
    runLLM: vi.fn(),
    runLLMWithTools: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSTM.getRecent = vi.fn().mockResolvedValue([]);
    mockFs.readdir.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create service with default storage path", () => {
      const mtm = createMTMService({ stm: mockSTM });
      expect(mtm.getStoragePath()).toBe(defaultStoragePath);
    });

    it("should create service with custom storage path", () => {
      const customPath = "./custom/mtm-storage";
      const mtm = createMTMService({
        stm: mockSTM,
        config: { storagePath: customPath },
      });
      expect(mtm.getStoragePath()).toBe(customPath);
    });
  });

  describe("summarizeDay", () => {
    const testDate = new Date("2024-01-15T12:00:00Z");
    const testEvents: MemoryEvent[] = [
      {
        timestamp: new Date("2024-01-15T10:00:00Z").toISOString(),
        type: "conversation.started",
        data: {},
      },
      {
        timestamp: new Date("2024-01-15T10:01:00Z").toISOString(),
        type: "conversation.user.message",
        data: { message: "My name is Alice" },
      },
      {
        timestamp: new Date("2024-01-15T10:02:00Z").toISOString(),
        type: "conversation.agent.response",
        data: { message: "Nice to meet you, Alice!" },
      },
      {
        timestamp: new Date("2024-01-15T10:03:00Z").toISOString(),
        type: "conversation.user.message",
        data: { message: "My favorite color is blue and I love cats" },
      },
      {
        timestamp: new Date("2024-01-15T14:00:00Z").toISOString(),
        type: "conversation.started",
        data: {},
      },
      {
        timestamp: new Date("2024-01-15T14:01:00Z").toISOString(),
        type: "conversation.user.message",
        data: { message: "I am working on a project about AI" },
      },
    ];

    it("should create directory if it does not exist", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      await mtm.summarizeDay(testDate);

      expect(mockFs.mkdir).toHaveBeenCalledWith(defaultStoragePath, {
        recursive: true,
      });
    });

    it("should generate summary with pattern-based fact extraction", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      const summary = await mtm.summarizeDay(testDate);

      expect(summary.date).toBe("2024-01-15");
      expect(summary.extractedFacts.userName).toBe("Alice");
      expect(summary.extractedFacts.userPreferences).toContain(
        "favorite color: blue and I love cats",
      );
      expect(summary.extractedFacts.keyTopics).toContain("a project about ai");
      expect(summary.conversations.count).toBe(2);
      expect(summary.conversations.totalMessages).toBe(3);
      expect(summary.eventStatistics["conversation.started"]).toBe(2);
      expect(summary.eventStatistics["conversation.user.message"]).toBe(3);
    });

    it("should save both JSON and markdown files", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);

      await mtm.summarizeDay(testDate);

      // Check JSON file saved
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "./memory/mtm/2024-01-15.json",
        expect.stringMatching(/"date":\s*"2024-01-15"/),
      );

      // Check markdown file saved
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "./memory/mtm/2024-01-15.md",
        expect.stringContaining("# Daily Memory Summary - 2024-01-15"),
      );
    });

    it("should filter events to only the specified day", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      const mixedEvents = [
        ...testEvents,
        {
          timestamp: new Date("2024-01-14T10:00:00Z").toISOString(),
          type: "conversation.started",
          data: {},
        },
        {
          timestamp: new Date("2024-01-16T10:00:00Z").toISOString(),
          type: "conversation.started",
          data: {},
        },
      ];
      mockSTM.getRecent = vi.fn().mockResolvedValue(mixedEvents);

      const summary = await mtm.summarizeDay(testDate);

      expect(summary.conversations.count).toBe(2); // Only events from Jan 15
      expect(summary.eventStatistics["conversation.started"]).toBe(2);
    });

    it("should handle empty day gracefully", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      mockSTM.getRecent = vi.fn().mockResolvedValue([]);

      const summary = await mtm.summarizeDay(testDate);

      expect(summary.date).toBe("2024-01-15");
      expect(summary.conversations.count).toBe(0);
      expect(summary.conversations.totalMessages).toBe(0);
      expect(summary.highlights).toEqual([]);
      expect(summary.extractedFacts.userName).toBeUndefined();
    });
  });

  describe("summarizeDay with LLM", () => {
    const testDate = new Date("2024-01-15T12:00:00Z");
    const testEvents: MemoryEvent[] = [
      {
        timestamp: new Date("2024-01-15T10:00:00Z").toISOString(),
        type: "conversation.user.message",
        data: { message: "Hi, I am Bob and I work as a software engineer" },
      },
      {
        timestamp: new Date("2024-01-15T10:01:00Z").toISOString(),
        type: "conversation.agent.response",
        data: {
          message:
            "Nice to meet you Bob! How can I help with your engineering work?",
        },
      },
    ];

    it("should use LLM for fact extraction when available", async () => {
      const mtm = createMTMService({
        stm: mockSTM,
        llmService: mockLLMService,
      });
      mockSTM.getRecent = vi.fn().mockResolvedValue(testEvents);
      mockLLMService.runLLM = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          userName: "Bob",
          userPreferences: [],
          keyTopics: ["software engineering"],
          importantEvents: ["User works as software engineer"],
          relationships: { occupation: "software engineer" },
        }),
      });

      const summary = await mtm.summarizeDay(testDate);

      expect(mockLLMService.runLLM).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("Bob"),
          }),
        ]),
      });
      expect(summary.extractedFacts.userName).toBe("Bob");
      expect(summary.extractedFacts.keyTopics).toContain(
        "software engineering",
      );
    });

    it("should fallback to pattern extraction if LLM fails", async () => {
      const mtm = createMTMService({
        stm: mockSTM,
        llmService: mockLLMService,
      });
      mockSTM.getRecent = vi.fn().mockResolvedValue([
        {
          timestamp: new Date("2024-01-15T10:00:00Z").toISOString(),
          type: "conversation.user.message",
          data: { message: "My name is Charlie" },
        },
      ]);
      mockLLMService.runLLM = vi.fn().mockRejectedValue(new Error("LLM error"));

      const summary = await mtm.summarizeDay(testDate);

      expect(summary.extractedFacts.userName).toBe("Charlie");
    });

    it("should handle malformed LLM JSON response", async () => {
      const mtm = createMTMService({
        stm: mockSTM,
        llmService: mockLLMService,
      });
      mockSTM.getRecent = vi.fn().mockResolvedValue([
        {
          timestamp: new Date("2024-01-15T10:00:00Z").toISOString(),
          type: "conversation.user.message",
          data: { message: "I am David" },
        },
      ]);
      mockLLMService.runLLM = vi.fn().mockResolvedValue({
        content: "This is not valid JSON",
      });

      const summary = await mtm.summarizeDay(testDate);

      expect(summary.extractedFacts.userName).toBe("David"); // Falls back to patterns
    });
  });

  describe("getSummary", () => {
    it("should retrieve existing summary", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      const testDate = new Date("2024-01-15");
      const mockSummary: MTMSummary = {
        date: "2024-01-15",
        extractedFacts: { userName: "Alice" },
        conversations: {
          count: 1,
          totalMessages: 5,
          avgLength: 50,
          topics: [],
        },
        eventStatistics: {},
        highlights: ["Test highlight"],
        createdAt: new Date().toISOString(),
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockSummary));

      const summary = await mtm.getSummary(testDate);

      expect(mockFs.readFile).toHaveBeenCalledWith(
        "./memory/mtm/2024-01-15.json",
        "utf-8",
      );
      expect(summary).toEqual(mockSummary);
    });

    it("should return null if summary does not exist", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      mockFs.readFile.mockRejectedValueOnce(new Error("ENOENT"));

      const summary = await mtm.getSummary(new Date("2024-01-15"));

      expect(summary).toBeNull();
    });
  });

  describe("getSummaryMarkdown", () => {
    it("should retrieve existing markdown summary", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      const testDate = new Date("2024-01-15");
      const mockMarkdown =
        "# Daily Memory Summary - 2024-01-15\n\nTest content";

      mockFs.readFile.mockResolvedValueOnce(mockMarkdown);

      const markdown = await mtm.getSummaryMarkdown(testDate);

      expect(mockFs.readFile).toHaveBeenCalledWith(
        "./memory/mtm/2024-01-15.md",
        "utf-8",
      );
      expect(markdown).toBe(mockMarkdown);
    });

    it("should return null if markdown does not exist", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      mockFs.readFile.mockRejectedValueOnce(new Error("ENOENT"));

      const markdown = await mtm.getSummaryMarkdown(new Date("2024-01-15"));

      expect(markdown).toBeNull();
    });
  });

  describe("listSummaries", () => {
    it("should list all summary dates", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      mockFs.readdir.mockResolvedValueOnce([
        "2024-01-13.json",
        "2024-01-14.json",
        "2024-01-15.json",
        "2024-01-15.md", // Should be filtered out
        "other-file.txt", // Should be filtered out
      ]);

      const summaries = await mtm.listSummaries();

      expect(mockFs.mkdir).toHaveBeenCalledWith(defaultStoragePath, {
        recursive: true,
      });
      expect(summaries).toEqual(["2024-01-13", "2024-01-14", "2024-01-15"]);
    });

    it("should return empty array if directory does not exist", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      mockFs.readdir.mockRejectedValueOnce(new Error("ENOENT"));

      const summaries = await mtm.listSummaries();

      expect(summaries).toEqual([]);
    });
  });

  describe("searchFacts", () => {
    it("should search across all summaries", async () => {
      const mtm = createMTMService({ stm: mockSTM });

      // Mock list of summaries
      mockFs.readdir.mockResolvedValueOnce([
        "2024-01-14.json",
        "2024-01-15.json",
      ]);

      // Mock summaries
      const summary1: MTMSummary = {
        date: "2024-01-14",
        extractedFacts: { userName: "Alice", keyTopics: ["cooking"] },
        conversations: {
          count: 1,
          totalMessages: 5,
          avgLength: 50,
          topics: [],
        },
        eventStatistics: {},
        highlights: ["Discussed recipes"],
        createdAt: new Date().toISOString(),
      };

      const summary2: MTMSummary = {
        date: "2024-01-15",
        extractedFacts: { userName: "Bob", keyTopics: ["programming"] },
        conversations: {
          count: 1,
          totalMessages: 3,
          avgLength: 40,
          topics: [],
        },
        eventStatistics: {},
        highlights: ["Talked about Python"],
        createdAt: new Date().toISOString(),
      };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(summary1))
        .mockResolvedValueOnce(JSON.stringify(summary2));

      const results = await mtm.searchFacts("Alice");

      expect(results).toHaveLength(1);
      expect(results[0].date).toBe("2024-01-14");
    });

    it("should search in highlights as well", async () => {
      const mtm = createMTMService({ stm: mockSTM });

      mockFs.readdir.mockResolvedValueOnce(["2024-01-15.json"]);

      const summary: MTMSummary = {
        date: "2024-01-15",
        extractedFacts: {},
        conversations: {
          count: 1,
          totalMessages: 3,
          avgLength: 40,
          topics: [],
        },
        eventStatistics: {},
        highlights: ["Discussed Python programming"],
        createdAt: new Date().toISOString(),
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(summary));

      const results = await mtm.searchFacts("python");

      expect(results).toHaveLength(1);
    });

    it("should handle case-insensitive search", async () => {
      const mtm = createMTMService({ stm: mockSTM });

      mockFs.readdir.mockResolvedValueOnce(["2024-01-15.json"]);

      const summary: MTMSummary = {
        date: "2024-01-15",
        extractedFacts: { userName: "ALICE" },
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

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(summary));

      const results = await mtm.searchFacts("alice");

      expect(results).toHaveLength(1);
    });

    it("should return empty array if no matches found", async () => {
      const mtm = createMTMService({ stm: mockSTM });

      mockFs.readdir.mockResolvedValueOnce(["2024-01-15.json"]);

      const summary: MTMSummary = {
        date: "2024-01-15",
        extractedFacts: { userName: "Bob" },
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

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(summary));

      const results = await mtm.searchFacts("NonExistent");

      expect(results).toHaveLength(0);
    });
  });

  describe("markdown generation", () => {
    it("should generate comprehensive markdown with all sections", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      const testDate = new Date("2024-01-15T12:00:00Z");
      const richEvents: MemoryEvent[] = [
        {
          timestamp: new Date("2024-01-15T10:00:00Z").toISOString(),
          type: "conversation.started",
          data: {},
          metadata: { conversationId: "conv-1" },
        },
        {
          timestamp: new Date("2024-01-15T10:01:00Z").toISOString(),
          type: "conversation.user.message",
          data: { message: "My name is Alice and my favorite food is pizza" },
          metadata: { conversationId: "conv-1" },
        },
        {
          timestamp: new Date("2024-01-15T10:02:00Z").toISOString(),
          type: "conversation.agent.response",
          data: { message: "Nice to meet you Alice! Pizza is delicious!" },
          metadata: { conversationId: "conv-1" },
        },
      ];

      mockSTM.getRecent = vi.fn().mockResolvedValue(richEvents);

      await mtm.summarizeDay(testDate);

      const markdownCall = mockFs.writeFile.mock.calls.find((call) =>
        call[0].includes(".md"),
      );
      const markdown = markdownCall[1];

      expect(markdown).toContain("# Daily Memory Summary - 2024-01-15");
      expect(markdown).toContain("## User Profile");
      expect(markdown).toContain("**Name**: Alice");
      expect(markdown).toContain("### Preferences");
      expect(markdown).toContain("favorite food: pizza");
      expect(markdown).toContain("## Conversation Overview");
      expect(markdown).toContain("## Conversation Samples");
      expect(markdown).toContain("**User**: My name is Alice");
      expect(markdown).toContain("## Event Statistics");
      expect(markdown).toContain("| conversation.started | 1 |");
    });

    it("should handle multiple conversation sessions", async () => {
      const mtm = createMTMService({ stm: mockSTM });
      const testDate = new Date("2024-01-15T12:00:00Z");

      // Create events for multiple sessions
      const multiSessionEvents: MemoryEvent[] = [];
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 10; j++) {
          multiSessionEvents.push({
            timestamp: new Date(
              `2024-01-15T${10 + i}:${String(j).padStart(2, "0")}:00Z`,
            ).toISOString(),
            type:
              j % 2 === 0
                ? "conversation.user.message"
                : "conversation.agent.response",
            data: { message: `Message ${j} in session ${i}` },
            metadata: { conversationId: `session-${i}` },
          });
        }
      }

      mockSTM.getRecent = vi.fn().mockResolvedValue(multiSessionEvents);

      await mtm.summarizeDay(testDate);

      const markdownCall = mockFs.writeFile.mock.calls.find((call) =>
        call[0].includes(".md"),
      );
      const markdown = markdownCall[1];

      // Should only show first 3 sessions
      expect(markdown).toContain("### Session at");
      expect(markdown).toContain("Message 0 in session 0");
      expect(markdown).toContain("Message 0 in session 1");
      expect(markdown).toContain("Message 0 in session 2");
      expect(markdown).not.toContain("Message 0 in session 3");
      // Now that the bug is fixed, it shows both user and assistant messages
      // Each session has 10 messages (0-9), shows first 6 (0-5)
      expect(markdown).toContain("Message 0 in session 0");
      expect(markdown).toContain("Message 1 in session 0");
      expect(markdown).toContain("Message 4 in session 0");
      expect(markdown).toContain("Message 5 in session 0");
      expect(markdown).not.toContain("Message 6 in session 0"); // 7th message
      expect(markdown).not.toContain("Message 8 in session 0"); // 9th message

      // Should show "4 more messages" since 10 - 6 = 4
      expect(markdown).toContain("*... 4 more messages in this session*");
    });
  });
});
