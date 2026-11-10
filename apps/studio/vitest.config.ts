import { defineConfig } from 'vitest/config';

// Unit tests cover the Studio's pure logic, so Node is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'vite.config.test.ts'],
  },
});
