import { expect, type Page } from "@playwright/test";

export function e2eCreds(): { username: string; password: string } | null {
  const username = process.env.E2E_USERNAME?.trim();
  const password = process.env.E2E_PASSWORD?.trim();
  if (!username || !password) return null;
  return { username, password };
}

export async function login(page: Page) {
  const creds = e2eCreds();
  if (!creds) {
    throw new Error("Потрібні E2E_USERNAME і E2E_PASSWORD у .env");
  }
  await page.goto("/login");
  await page.getByLabel("Логін").fill(creds.username);
  await page.getByLabel("Пароль").fill(creds.password);
  await page.getByRole("button", { name: "Увійти" }).click();
  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "");
  await expect(page.getByRole("link", { name: "Огляд" })).toBeVisible();
}
