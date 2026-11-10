import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright({
    // Set PW_CHANNEL=chrome or msedge to test in an installed browser instead of Playwright's Chromium.
    launchOptions: process.env['PW_CHANNEL'] ? { channel: process.env['PW_CHANNEL'] } : {},
  }),
  instances: [{ browser: 'chromium' as const }],
  screenshotFailures: false,
});

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'generators', include: ['test/generators/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: { name: 'unit', include: ['test/unit/**/*.test.ts'], browser: browser() },
      },
      {
        extends: true,
        test: { name: 'golden', include: ['test/golden/**/*.test.ts'], browser: browser(), testTimeout: 600_000 },
      },
      {
        extends: true,
        test: { name: 'audit', include: ['test/audit/**/*.test.ts'], browser: browser(), testTimeout: 600_000 },
      },
    ],
  },
});
