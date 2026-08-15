import { test, expect } from "@playwright/test";
import { e2eCreds, login } from "./helpers";

test("без сесії корінь веде на логін", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Увійти" })).toBeVisible();
});

test("успішний логін відкриває огляд", async ({ page }) => {
  test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
  await login(page);
  await expect(page.getByText("Білки")).toBeVisible();
});
