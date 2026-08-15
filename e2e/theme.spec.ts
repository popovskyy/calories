import { test, expect } from "@playwright/test";
import { e2eCreds, login } from "./helpers";

test("у профілі три теми, Forest і Minecraft ставлять data-theme", async ({
  page,
}) => {
  test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
  await login(page);
  await page.getByRole("navigation").getByRole("link", { name: "Профіль" }).click();
  await expect(page.getByRole("button", { name: "Нічне" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Minecraft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "99 ночей у лісі" })).toBeVisible();

  await page.getByRole("button", { name: "99 ночей у лісі" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "forest", {
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "Minecraft" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "minecraft");

  await page.getByRole("button", { name: "Нічне" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "nocturne");
});
