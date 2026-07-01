import { defineConfig, devices } from "@playwright/test";

const webUrl = process.env.PLAYWRIGHT_WEB_URL ?? "http://127.0.0.1:3000";
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:3001";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @ff/api exec tsx src/index.ts",
      cwd: ".",
      url: `${apiUrl}/health`,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      env: {
        PORT: "3001",
        DEMO_USERNAME: "admin",
        DEMO_PASSWORD: "demo123",
        SESSION_SECRET: "e2e-test-session-secret",
        NODE_ENV: "test",
      },
    },
    {
      command:
        "bash -c 'pnpm --filter @ff/web build && pnpm --filter @ff/web start'",
      cwd: ".",
      url: webUrl,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
      timeout: 120_000,
      env: {
        API_URL: apiUrl,
      },
    },
  ],
});
