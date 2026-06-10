import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "full-test.spec.ts",
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  reporter: [["list"], ["json", { outputFile: "/tmp/pw-results.json" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
    headless: true,
    channel: undefined,
    launchOptions: {
      executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--headless=new"]
    }
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      }
    }
  ]
});
