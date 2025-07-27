import { beforeAll, afterEach, vi } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set up any global mocks or configurations
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  
  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  
  // Keep console.error and console.warn for debugging
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
  
  // Reset any global state
});

// Global test utilities
global.testTimeout = (ms: number) => {
  jest.setTimeout(ms);
};

// Mock timers utility
global.mockTimers = () => {
  vi.useFakeTimers();
  return {
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    restore: () => vi.useRealTimers(),
  };
};