import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    hookTimeout: 30_000,
    coverage: {
      enabled: false
    }
  }
});
