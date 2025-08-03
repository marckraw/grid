import { promises as fs } from 'fs';
import * as path from 'path';
import { STMService, STMConfig, MemoryEvent } from './memory.types';

export const createSimpleSTMService = (config?: STMConfig): STMService => {
  const logPath = config?.logPath || './memory/stm.jsonl';
  
  const ensureDirectory = async () => {
    const dir = path.dirname(logPath);
    await fs.mkdir(dir, { recursive: true });
  };
  
  const log = async (event: Omit<MemoryEvent, 'timestamp'>) => {
    await ensureDirectory();
    
    const memoryEvent: MemoryEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    
    const line = JSON.stringify(memoryEvent) + '\n';
    await fs.appendFile(logPath, line);
  };
  
  return {
    log,
    getLogPath: () => logPath
  };
};