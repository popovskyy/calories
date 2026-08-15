import { test, expect } from "@playwright/test";
import { e2eCreds, login } from "./helpers";

test("ручний запис їжі з’являється в журналі і прибирається", async ({
  page,
}) => {
  test.skip(!e2eCreds(), "Немає E2E_USERNAME / E2E_PASSWORD");
  await login(page);

  const marker = `e2e-meal-${Date.now()}`;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const created = await page.request.post("/api/meals", {
    data: {
      date,
      description: marker,
      calories: 111,
      protein: 1,
      fats: 1,
      carbs: 1,
    },
  });
  expect(created.ok()).toBeTruthy();
  const meal = (await created.json()) as { id: string };

  try {
    await page.goto("/log");
    await expect(page.getByText(marker)).toBeVisible();
    await expect(page.getByText("111")).toBeVisible();
  } finally {
    const del = await page.request.delete(`/api/meals/${meal.id}`);
    expect(del.ok()).toBeTruthy();
  }
});
