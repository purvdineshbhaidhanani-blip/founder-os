import { test, expect } from "@playwright/test";
import { collectConsoleErrors, login } from "./helpers";

test.describe("Dashboard", () => {
  test("renders real data, nav links to all pages are visible/clickable, no console errors", async ({ page }) => {
    const consoleState = collectConsoleErrors(page);

    await login(page);

    // Real data sections from FounderDashboardView.
    await expect(page.getByRole("heading", { name: "System Health" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.locator(".status-ok, .status-bad")).toBeVisible();

    // Nav links to every other page, all visible and clickable.
    const nav = page.locator("nav.nav");
    await expect(nav).toBeVisible();

    const links: Array<{ name: string; urlPattern: RegExp }> = [
      { name: "Dashboard", urlPattern: /\/dashboard$/ },
      { name: "Research", urlPattern: /\/research$/ },
      { name: "History", urlPattern: /\/history$/ },
      { name: "Settings", urlPattern: /\/settings$/ },
    ];

    for (const link of links) {
      const locator = nav.getByRole("link", { name: link.name });
      await expect(locator).toBeVisible();
      await locator.click();
      await expect(page).toHaveURL(link.urlPattern);
    }

    // Navigate back to dashboard for a clean final state.
    await nav.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    expect(consoleState.errors, `Console/page errors detected: ${consoleState.errors.join("\n")}`).toEqual([]);
  });
});
