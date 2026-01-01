import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'e2e/**'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/education/**/*.ts',
        'src/lib/ai/**/*.ts',
        'src/lib/safety/**/*.ts',
        'src/lib/tools/**/*.ts',
        'src/lib/profile/**/*.ts',
      ],
      exclude: [
        'node_modules/',
        'e2e/',
        '**/*.config.*',
        '**/*.d.ts',
        'src/types/**',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
