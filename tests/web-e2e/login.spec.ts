import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test("redirects unauthenticated users to /login, rejects wrong password, accepts correct credentials", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("h1")).toHaveText("Founder OS");

    // Wrong password -> real error message from the server (401 Invalid email or password.)
    await page.locator("#email").fill("e2e@test.com");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    const errorBanner = page.locator(".banner-error");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toHaveText(/invalid email or password/i);

    // Still on /login after a failed attempt.
    await expect(page).toHaveURL(/\/login$/);

    // Correct credentials -> redirected to /dashboard.
    await page.locator("#password").fill("e2epass123");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("h1")).toHaveText("Founder Dashboard");
  });
});
