import { test, expect } from "@playwright/test";
import { e2eCreds, login } from "./helpers";

test("огляд: герой і макроси, без квестів і монет", async ({ page }) => {
  test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
  await login(page);

  const headerAvatar = page.getByRole("link", { name: "Профіль" }).locator("img, svg");
  await expect(headerAvatar.first()).toBeVisible();
  const fileAvatar = page.getByRole("link", { name: "Профіль" }).locator("img");
  if (await fileAvatar.count()) {
    await expect(fileAvatar).toHaveAttribute("src", /^(data:image\/svg\+xml|\/mascots\/)/);
    await expect(fileAvatar).not.toHaveAttribute("src", /\/api\/skins\//);
  }

  await expect(page.getByText("Білки")).toBeVisible();
  await expect(page.getByText("Жири")).toBeVisible();
  await expect(page.getByText("Вуглев.")).toBeVisible();
  await expect(page.getByText("монет")).toHaveCount(0);
  await expect(page.getByText("Дізнатись вердикт")).toHaveCount(0);
  await expect(page.getByText("Квести")).toHaveCount(0);
  await expect(page.getByText("Епік")).toHaveCount(0);
});
