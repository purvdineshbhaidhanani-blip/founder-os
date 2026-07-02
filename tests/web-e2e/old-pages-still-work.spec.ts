import { test, expect } from "@playwright/test";
import { collectConsoleErrors, login } from "./helpers";

/**
 * Phase 2 (the one-button pipeline + simplified Home page) is additive: the
 * pre-existing Dashboard/Research/History/Settings pages must keep working
 * exactly as before, still reachable from the nav (now labelled "Advanced: *"
 * per Nav.tsx) alongside the new "Home" link.
 */
test.describe("Old pages still work after the Phase 2 pipeline addition", () => {
  test("nav links to Home and to every old-flow page; each old page still renders real data with no console errors", async ({
    page,
  }) => {
    const consoleState = collectConsoleErrors(page);

    await login(page);
    await page.goto("/dashboard");

    const nav = page.locator("nav.nav");
    await expect(nav).toBeVisible();

    // Home link (the new default route).
    const homeLink = nav.getByRole("link", { name: "Home", exact: true });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute("href", "/");

    // Old-flow links, exact labels per Nav.tsx.
    const oldFlowLinks: Array<{ name: string; href: string }> = [
      { name: "Advanced: Dashboard", href: "/dashboard" },
      { name: "Advanced: Research", href: "/research" },
      { name: "Advanced: History", href: "/history" },
      { name: "Advanced: Settings", href: "/settings" },
    ];
    for (const link of oldFlowLinks) {
      const locator = nav.getByRole("link", { name: link.name, exact: true });
      await expect(locator).toBeVisible();
      await expect(locator).toHaveAttribute("href", link.href);
    }

    // Clicking Home actually navigates to "/" and renders the new Home page.
    await homeLink.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Founder Intelligence OS" })).toBeVisible();

    // Now verify each old page still loads directly (deep link) without
    // crashing, with real data rendered — same level of check as the
    // original dashboard.spec.ts/settings.spec.ts.

    // /dashboard
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Founder Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "System Health" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.locator(".status-ok, .status-bad")).toBeVisible();

    // /research
    await page.goto("/research");
    await expect(page.getByRole("heading", { name: "Research", exact: true })).toBeVisible();
    const badgeGrid = page.locator(".badge-grid");
    await expect(badgeGrid).toBeVisible();
    const badges = badgeGrid.locator(".badge");
    await expect(badges.first()).toBeVisible();
    expect(await badges.count()).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: /run research \(30 days\)/i })).toBeVisible();

    // /history
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Research History" })).toBeVisible();

    // /settings
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    const table = page.locator("table.data-table");
    await expect(table).toBeVisible();
    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);

    expect(consoleState.errors, `Console/page errors detected: ${consoleState.errors.join("\n")}`).toEqual([]);
  });
});
