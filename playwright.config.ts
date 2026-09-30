import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: process.env.AUTH_URL,
    headless: true,
    channel:
      process.env.TEST_BROWSER_CHANNEL || (process.platform === "win32" ? "chrome" : undefined),
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
  },
});
