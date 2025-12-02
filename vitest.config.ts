import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'apps/**', // Exclude apps from coverage
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@mrck-labs/grid-core': path.resolve(__dirname, './packages/core/src'),
      '@mrck-labs/grid-agents': path.resolve(__dirname, './packages/agents/src'),
      '@mrck-labs/grid-workflows': path.resolve(__dirname, './packages/workflows/src'),
      '@mrck-labs/grid-tools': path.resolve(__dirname, './packages/tools/src'),
    },
  },
});