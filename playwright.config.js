import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3210',
    channel: 'chrome',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3210',
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      RUNQ_DB: '.runq/e2e/runq.db'
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:3210/agents'
  }
});
