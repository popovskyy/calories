import { test, expect } from "@playwright/test";
import { e2eCreds, login } from "./helpers";

test.describe("шеля", () => {
  test("таби змінюють URL, арени й магазину немає", async ({ page }) => {
    test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
    await login(page);

    await expect(page.getByRole("navigation").getByRole("link", { name: "Огляд" })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Журнал" })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Профіль" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Арена" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Магазин" })).toHaveCount(0);

    await page.getByRole("navigation").getByRole("link", { name: "Журнал" }).click();
    await expect(page).toHaveURL(/\/log/);

    await page.getByRole("navigation").getByRole("link", { name: "Профіль" }).click();
    await expect(page).toHaveURL(/\/profile/);

    await page.getByRole("navigation").getByRole("link", { name: "Огляд" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("/shop /arena /epics — 404", async ({ page }) => {
    test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
    await login(page);
    for (const path of ["/shop", "/arena", "/epics"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
    }
  });
});
