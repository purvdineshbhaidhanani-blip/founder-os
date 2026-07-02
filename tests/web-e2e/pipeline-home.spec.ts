import { test, expect } from "@playwright/test";
import { collectConsoleErrors, login } from "./helpers";

test.describe("Pipeline home (one-button flow)", () => {
  test("Home -> START RESEARCH -> progress -> Top Opportunities -> Opportunity Detail -> export, degrading gracefully", async ({
    page,
  }) => {
    const consoleState = collectConsoleErrors(page);

    await login(page);

    // Navigate to "/" explicitly rather than assuming login already landed
    // there (login() lands on /dashboard by design — the old flow's own
    // default — so this confirms "/" itself renders Home behind auth).
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Founder Intelligence OS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "START RESEARCH" })).toBeVisible();

    // Kick off the one-button pipeline.
    const startButton = page.getByRole("button", { name: "START RESEARCH" });
    await startButton.click();

    await expect(page).toHaveURL(/\/pipeline\/[^/]+\/progress$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Founder Intelligence OS" })).toBeVisible();

    // Wait for the progress page to show real progress: either a stage
    // heading updates past the initial "1/3 Researching" label, a source
    // status entry appears, or the run has already completed and
    // redirected onward. Real network calls (GitHub/YouTube/HN/RSS/Reddit)
    // may be slow or degrade to zero results in this sandbox, so this uses
    // a generous timeout and accepts either outcome — same tolerance as
    // research-flow.spec.ts.
    await Promise.race([
      page.locator(".source-progress-list li").first().waitFor({ state: "visible", timeout: 45_000 }),
      page.getByRole("heading", { name: /2\/3 Clustering Problems|3\/3 Scoring Opportunities|Complete/ }).waitFor({
        state: "visible",
        timeout: 45_000,
      }),
      page.waitForURL(/\/pipeline\/[^/]+\/opportunities$/, { timeout: 45_000 }),
    ]).catch(() => undefined);

    // Eventually navigates to the Top Opportunities page — success or
    // fully-degraded, the pipeline always resolves (the only rejection
    // path is MissingKeysError, which fires before any SSE connection is
    // even possible and would show a banner on Home instead).
    await expect(page).toHaveURL(/\/pipeline\/[^/]+\/opportunities$/, { timeout: 60_000 });

    // Top Opportunities page must render without a blank crash: heading
    // and export section always render, whether the opportunities list is
    // populated or empty (fully-degraded run).
    await expect(page.getByRole("heading", { name: "Top Opportunities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Export" })).toBeVisible();

    const rankRows = page.locator(".opportunity-rank-row");
    const emptyState = page.getByText("No opportunities surfaced for this run.");
    const rowCount = await rankRows.count();
    const hasEmptyState = await emptyState.count();
    expect(rowCount + hasEmptyState).toBeGreaterThan(0);

    // Export buttons always exist regardless of whether the list is empty.
    const exportMarkdownButton = page.getByRole("button", { name: "Export Markdown" });
    const exportJsonButton = page.getByRole("button", { name: "Export JSON" });
    await expect(exportMarkdownButton).toBeVisible();
    await expect(exportJsonButton).toBeVisible();

    // Clicking "Export JSON" triggers a real request whose response has
    // Content-Type: application/json.
    const [exportResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/export?format=json")),
      exportJsonButton.click(),
    ]);
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()["content-type"]).toContain("application/json");

    if (rowCount > 0) {
      const pipelineUrl = page.url();
      const firstRow = rankRows.first();
      await expect(firstRow).toBeVisible();
      await firstRow.click();

      await expect(page).toHaveURL(/\/pipeline\/[^/]+\/opportunities\/[^/]+$/, { timeout: 15_000 });
      expect(page.url().startsWith(pipelineUrl.replace(/\/opportunities$/, "/opportunities/"))).toBe(true);

      // Detail page renders without crashing: key section headings present.
      await expect(page.getByRole("heading", { name: "Recommendation" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Score Breakdown" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Buying Intent" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Competition" })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Supporting Evidence/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Representative Quotes" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Build Guidance" })).toBeVisible();

      // If at least one representative quote link exists, it must open in a
      // new tab with a real href (not a dead "#" link).
      const quoteLinks = page.locator("section.card:has(h2:text('Representative Quotes')) li a");
      const quoteLinkCount = await quoteLinks.count();
      if (quoteLinkCount > 0) {
        const firstQuoteLink = quoteLinks.first();
        await expect(firstQuoteLink).toHaveAttribute("target", "_blank");
        const href = await firstQuoteLink.getAttribute("href");
        expect(href).toBeTruthy();
        expect(href).not.toBe("#");
      }
    }

    expect(consoleState.errors, `Console/page errors detected: ${consoleState.errors.join("\n")}`).toEqual([]);
  });
});
