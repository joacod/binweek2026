import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:4176', viewport: { width: 1280, height: 900 } },
  webServer: {
    command: 'pnpm preview --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
  },
});
