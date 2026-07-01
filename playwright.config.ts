import { defineConfig, devices } from "@playwright/test";

/**
 * Real browser E2E config for the Founder OS web frontend.
 *
 * Chromium is pre-installed in this sandbox at a fixed path outside the
 * default Playwright cache location (PLAYWRIGHT_BROWSERS_PATH points at
 * /opt/pw-browsers). We point `executablePath` directly at the extracted
 * binary rather than relying on `playwright install`, which is unnecessary
 * here and disabled via PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1.
 */
const CHROMIUM_EXECUTABLE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const PORT = 4175;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "tests/web-e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: CHROMIUM_EXECUTABLE,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node dist/server/index.js",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      FOUNDER_EMAIL: "e2e@test.com",
      FOUNDER_PASSWORD: "e2epass123",
      PORT: String(PORT),
    },
  },
});
