import { test, expect } from "@playwright/test";
import { login, collectConsoleErrors } from "./helpers";

test.describe("Monitoring page", () => {
  test("lists providers, runs a check, records history, and never crashes on provider failure", async ({ page }) => {
    const consoleState = collectConsoleErrors(page);
    await login(page);

    // Reach the page via the real nav link.
    await page.getByRole("link", { name: /Advanced: Monitoring/i }).click();
    await expect(page).toHaveURL(/\/monitoring$/);
    await expect(page.locator("h1")).toHaveText("Monitoring");

    // Providers come from the static /api/monitoring/providers route (no network
    // needed) — at least one provider must render.
    await expect(page.getByText("github-trending")).toBeVisible();

    // Run a check. In this environment outbound provider calls are blocked, so
    // providers fail gracefully — the UI must still render a completed run.
    await page.getByLabel("Monitoring query").fill("acme analytics");
    await page.getByRole("button", { name: /Run monitoring/i }).click();

    // "Last run" section appears once the run settles (fast, since blocked
    // fetches reject quickly rather than hang).
    await expect(page.getByRole("heading", { name: "Last run" })).toBeVisible({ timeout: 30_000 });

    // Run history now has at least one entry referencing the query.
    await expect(page.getByText(/"acme analytics"/).first()).toBeVisible();

    // No uncaught errors / console errors during the whole flow.
    expect(consoleState.errors, consoleState.errors.join("\n")).toEqual([]);
  });

  test("is usable on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);
    await page.goto("/monitoring");
    await expect(page.locator("h1")).toHaveText("Monitoring");

    // The query input and run button are reachable and the page does not
    // overflow horizontally on a narrow screen.
    await expect(page.getByLabel("Monitoring query")).toBeVisible();
    await expect(page.getByRole("button", { name: /Run monitoring/i })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
