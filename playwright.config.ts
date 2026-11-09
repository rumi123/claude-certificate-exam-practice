import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  use: { baseURL: 'http://localhost:3100' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm start -- -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_PATH: 'test-results/e2e.db',
      CONTENT_DIR: 'tests/fixtures/content',
      TEST_CLOCK: '1',
    },
  },
});
