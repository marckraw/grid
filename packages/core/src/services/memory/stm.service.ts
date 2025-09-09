import { promises as fs } from "fs";
import * as path from "path";
import type { MemoryEvent, STMConfig, STMService } from "./memory.types.js";

export const createSimpleSTMService = (config?: STMConfig): STMService => {
  const logPath = config?.logPath || "./memory/stm.jsonl";

  const ensureDirectory = async () => {
    const dir = path.dirname(logPath);
    await fs.mkdir(dir, { recursive: true });
  };

  const log = async (event: Omit<MemoryEvent, "timestamp">) => {
    await ensureDirectory();

    const memoryEvent: MemoryEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    const line = JSON.stringify(memoryEvent) + "\n";
    await fs.appendFile(logPath, line);
  };

  const readAllEvents = async (): Promise<MemoryEvent[]> => {
    try {
      const content = await fs.readFile(logPath, "utf-8");
      const events: MemoryEvent[] = [];

      content
        .split("\n")
        .filter((line) => line.trim())
        .forEach((line) => {
          try {
            events.push(JSON.parse(line) as MemoryEvent);
          } catch (parseError) {
            // Skip malformed lines
            console.warn(
              "Skipping malformed JSON line:",
              line.substring(0, 50) + "...",
            );
          }
        });

      return events;
    } catch (error: any) {
      // File doesn't exist yet
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  };

  const getRecent = async (hours = 24): Promise<MemoryEvent[]> => {
    const events = await readAllEvents();
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    return events.filter(
      (event) => new Date(event.timestamp).getTime() > cutoff,
    );
  };

  const getByType = async (
    type: string,
    limit = 100,
  ): Promise<MemoryEvent[]> => {
    const events = await readAllEvents();
    const filtered = events.filter((event) => event.type === type);

    // Return the most recent events up to the limit
    return filtered.slice(-limit);
  };

  const clear = async () => {
    try {
      await fs.unlink(logPath);
    } catch (error: any) {
      // Ignore if file doesn't exist
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  };

  return {
    log,
    getRecent,
    getByType,
    clear,
    getLogPath: () => logPath,
  };
};
