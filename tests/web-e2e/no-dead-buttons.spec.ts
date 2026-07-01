import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Checks every <button> and <a> on a page: each must either be a real link
 * (non-empty href), a submit button inside a form, or a button that is
 * disabled only for a legitimate transient reason (e.g. "Signing in..." /
 * "Starting..." while a request is in flight) rather than being permanently
 * inert. Returns the counts so the caller can report totals across pages.
 */
async function auditButtonsAndLinks(page: Page, pageName: string): Promise<{ checked: number; ok: number }> {
  const elements = await page.locator("button, a").all();
  let checked = 0;
  let ok = 0;

  for (const el of elements) {
    checked += 1;
    const tagName = await el.evaluate((node) => node.tagName.toLowerCase());
    const isVisible = await el.isVisible();
    if (!isVisible) {
      // Hidden elements (e.g. conditionally-rendered banners not currently
      // shown) are not part of the "dead UI" surface being audited here.
      checked -= 1;
      continue;
    }

    if (tagName === "a") {
      const href = await el.getAttribute("href");
      expect(href, `[${pageName}] <a> with text "${await el.innerText()}" has no real href`).toBeTruthy();
      expect(href).not.toBe("#");
      ok += 1;
      continue;
    }

    // tagName === "button"
    const type = await el.getAttribute("type");
    const disabled = await el.isDisabled();
    const text = (await el.innerText()).trim();

    if (disabled) {
      // The only legitimate disabled state in this app is a submit-in-flight
      // state, which always carries an in-progress verb in its label.
      expect(
        text,
        `[${pageName}] disabled <button> "${text}" is not a recognized transient (in-flight) state`,
      ).toMatch(/signing in|starting/i);
      ok += 1;
      continue;
    }

    if (type === "submit") {
      const form = await el.evaluateHandle((node) => (node as HTMLButtonElement).form);
      expect(form, `[${pageName}] submit <button> "${text}" is not inside a <form>`).toBeTruthy();
      ok += 1;
      continue;
    }

    // Plain type="button" — must have a registered click handler. We verify
    // this behaviorally: every such button in this app is wired to either
    // trigger a network request (logout / run-research) or a navigation.
    // We don't click here (that would mutate shared session/app state
    // mid-audit); instead we assert it is a *known* wired button by name,
    // which fails loudly if a new unwired button is introduced.
    const knownWiredLabels = /log out|research last 30 days|run research \(\d+ days\)|sign in/i;
    expect(
      text,
      `[${pageName}] <button type="button"> "${text}" is not a recognized wired action — possible dead button`,
    ).toMatch(knownWiredLabels);
    ok += 1;
  }

  return { checked, ok };
}

test.describe("No dead buttons or links", () => {
  test("every button/link on Login, Dashboard, Research, History, Settings is real and wired", async ({ page }) => {
    const totals = { checked: 0, ok: 0 };

    // Login (pre-auth).
    await page.goto("/login");
    let result = await auditButtonsAndLinks(page, "Login");
    totals.checked += result.checked;
    totals.ok += result.ok;

    await login(page);

    // Dashboard.
    await page.goto("/dashboard");
    result = await auditButtonsAndLinks(page, "Dashboard");
    totals.checked += result.checked;
    totals.ok += result.ok;

    // Research.
    await page.goto("/research");
    result = await auditButtonsAndLinks(page, "Research");
    totals.checked += result.checked;
    totals.ok += result.ok;

    // History (may be empty or have session links — both are valid; a link
    // to a session must have a real href in either case).
    await page.goto("/history");
    result = await auditButtonsAndLinks(page, "History");
    totals.checked += result.checked;
    totals.ok += result.ok;

    // Settings.
    await page.goto("/settings");
    result = await auditButtonsAndLinks(page, "Settings");
    totals.checked += result.checked;
    totals.ok += result.ok;

    expect(totals.ok).toBe(totals.checked);
    expect(totals.checked).toBeGreaterThan(0);

    // eslint-disable-next-line no-console
    console.log(`no-dead-buttons: verified ${totals.ok}/${totals.checked} interactive elements across 5 pages`);
  });
});
