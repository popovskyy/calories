import { test, expect } from "@playwright/test";
import { e2eCreds, login } from "./helpers";

test("журнал: дата та вкладки харчування / активність", async ({ page }) => {
  test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
  await login(page);
  await page.getByRole("navigation").getByRole("link", { name: "Журнал" }).click();
  await expect(page).toHaveURL(/\/log/);
  await expect(page.getByRole("button", { name: "Харчування" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Активність" })).toBeVisible();
  await page.getByRole("button", { name: "Активність" }).click();
  await expect(page.getByRole("button", { name: "Активність" })).toBeVisible();
});
