import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Research flow (core)", () => {
  test("connector badges render, running a research pass reaches progress and then a report, degrading gracefully", async ({
    page,
  }) => {
    await login(page);

    await page.goto("/research");
    await expect(page.getByRole("heading", { name: "Research", exact: true })).toBeVisible();

    // Connector status badges.
    const badgeGrid = page.locator(".badge-grid");
    await expect(badgeGrid).toBeVisible();
    const badges = badgeGrid.locator(".badge");
    await expect(badges.first()).toBeVisible();
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // At least one "configured" badge (hackernews/rss/stackexchange are always
    // configured; github is configured in this sandbox via GITHUB_TOKEN).
    const configuredBadges = badgeGrid.locator(".badge-ok");
    expect(await configuredBadges.count()).toBeGreaterThan(0);

    // Any "missing-credentials" badge must render the exact missing env var
    // name (e.g. YOUTUBE_API_KEY when that key is not configured).
    const warnBadges = badgeGrid.locator(".badge-warn");
    const warnCount = await warnBadges.count();
    for (let i = 0; i < warnCount; i += 1) {
      const text = await warnBadges.nth(i).innerText();
      expect(text).toMatch(/missing: [A-Z0-9_]+/);
    }

    // Kick off a research run from the Research page.
    const runButton = page.getByRole("button", { name: /run research \(30 days\)/i });
    await expect(runButton).toBeVisible();
    await runButton.click();

    // Navigates to the progress page (or shows a missing-keys banner if
    // somehow zero sources are eligible — handled defensively, though this
    // sandbox always has at least the keyless sources eligible).
    await expect(page).toHaveURL(/\/research\/progress\/.+/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Research in Progress" })).toBeVisible();

    // Wait for the UI to show real progress: either a source status entry
    // appears (source.start/source.done/source.failed rendered) or the run
    // has already reached "complete" and redirected onward. Real network
    // calls (GitHub/YouTube/HN/RSS) may be slow or degraded in this sandbox,
    // so this uses a generous timeout and accepts either outcome.
    await Promise.race([
      page.locator(".source-progress-list li").first().waitFor({ state: "visible", timeout: 45_000 }),
      page.waitForURL(/\/research\/report\/.+/, { timeout: 45_000 }),
    ]).catch(() => undefined);

    // Eventually navigates to the report page — success or fully-degraded,
    // the engine always resolves (MissingKeysError is the only rejection
    // path, and that only fires when zero sources are eligible, which is not
    // the case here since hackernews/rss/stackexchange are always eligible).
    await expect(page).toHaveURL(/\/research\/report\/.+/, { timeout: 60_000 });

    // Report page must render without a blank crash: heading, confidence
    // score, and the top opportunities section always render, even when the
    // list of opportunities is empty (fully-degraded run).
    await expect(page.getByRole("heading", { name: "Research Report" })).toBeVisible();
    const confidenceBadge = page.locator(".badge.confidence-low, .badge.confidence-medium, .badge.confidence-high");
    await expect(confidenceBadge).toBeVisible();
    await expect(confidenceBadge).toContainText(/confidence:/i);

    await expect(page.getByRole("heading", { name: /top opportunities/i })).toBeVisible();
    // Either real opportunity cards or the explicit empty-state message must
    // render — never a blank body.
    const hasOpportunityCards = await page.locator(".opportunity-card").count();
    const hasEmptyState = await page.getByText("No opportunities surfaced for this run.").count();
    expect(hasOpportunityCards + hasEmptyState).toBeGreaterThan(0);

    // Source coverage section always renders too.
    await expect(page.getByRole("heading", { name: "Source Coverage" })).toBeVisible();
  });
});
