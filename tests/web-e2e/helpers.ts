import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const FOUNDER_EMAIL = "e2e@test.com";
export const FOUNDER_PASSWORD = "e2epass123";

/** Logs in via the real login form and waits for the dashboard to render. */
export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(FOUNDER_EMAIL);
  await page.locator("#password").fill(FOUNDER_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Collects console error-level messages and uncaught page errors for a page. Call before navigation. */
export function collectConsoleErrors(page: Page): { errors: string[] } {
  const state = { errors: [] as string[] };
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      state.errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    state.errors.push(`pageerror: ${err.message}`);
  });
  return state;
}
