import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  test: {
    include: ['worker/**/*.test.ts', 'frontend/src/**/*.test.{ts,tsx}'],
  },
});
