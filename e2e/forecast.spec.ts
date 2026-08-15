import { test, expect } from "@playwright/test";
import { e2eCreds, login } from "./helpers";

test.describe("прогноз ваги (кг)", () => {
  test("огляд показує картку цілі і легенду графіка, якщо ціль задана", async ({
    page,
  }) => {
    test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
    await login(page);

    await expect(page.getByText("Ціль по вазі")).toBeVisible();

    const forecast = await page.request.get("/api/stats/forecast");
    expect(forecast.ok()).toBeTruthy();
    const body = (await forecast.json()) as {
      configured: boolean;
      startWeight: number | null;
      targetWeight: number | null;
      currentWeight: number | null;
      expectedWeight: number | null;
      paceStatus: string;
      calorieStance: string;
    };

    if (!body.configured) {
      await expect(page.getByRole("button", { name: "Задайте цільову вагу" })).toBeVisible();
      return;
    }

    expect(body.startWeight).toBeGreaterThan(0);
    expect(body.targetWeight).toBeGreaterThan(0);
    expect(body.currentWeight).toBeGreaterThan(0);
    expect(["progressing", "stalled", "stale", "unknown"]).toContain(body.paceStatus);

    await expect(page.getByText("Факт", { exact: true })).toBeVisible();
    await expect(page.getByText("Старт", { exact: true }).first()).toBeVisible();
    await expect(page.locator("figure").first()).toBeVisible();
  });

  test("API історії ваги віддає точки з датою і кг", async ({ page }) => {
    test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
    await login(page);

    const res = await page.request.get("/api/weight");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      items: { date: string; weight: number }[];
    };
    expect(Array.isArray(body.items)).toBe(true);
    for (const p of body.items) {
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.weight).toBeGreaterThan(0);
      expect(p.weight).toBeLessThan(400);
    }
  });
});
