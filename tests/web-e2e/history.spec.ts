import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("History", () => {
  test("shows a completed research session and navigates to its report", async ({ page }) => {
    await login(page);

    // Ensure at least one research run exists before checking History — kick
    // one off from the Dashboard's "Research Last 30 Days" button and wait
    // for it to land on a report page (mirrors research-flow.spec.ts's
    // tolerance for success vs. fully-degraded runs).
    await page.goto("/dashboard");
    const runButton = page.getByRole("button", { name: /research last 30 days/i });
    await expect(runButton).toBeVisible();
    await runButton.click();

    await expect(page).toHaveURL(/\/research\/progress\/.+/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/research\/report\/.+/, { timeout: 60_000 });

    // Now check History.
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Research History" })).toBeVisible();

    const table = page.locator("table.data-table");
    await expect(table).toBeVisible({ timeout: 15_000 });

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);

    const firstLink = rows.first().locator("a");
    await expect(firstLink).toBeVisible();
    const sessionId = (await firstLink.innerText()).trim();
    expect(sessionId.length).toBeGreaterThan(0);

    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(`/research/report/${encodeURIComponent(sessionId)}$`));
    await expect(page.getByRole("heading", { name: "Research Report" })).toBeVisible();
  });
});
