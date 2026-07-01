import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Settings", () => {
  test("renders connector statuses, logout clears the session and redirects to /login", async ({ page }) => {
    await login(page);

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Connector statuses render in a real table.
    const table = page.locator("table.data-table");
    await expect(table).toBeVisible();
    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);

    // Logout.
    const logoutButton = page.getByRole("button", { name: /log out/i }).first();
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await expect(page).toHaveURL(/\/login$/);

    // Session actually cleared server-side: /dashboard now redirects back to /login.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});
