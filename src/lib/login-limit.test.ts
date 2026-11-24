import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, WINDOW_MS, clearAttempts, clientIp, registerAttempt, type AttemptStore } from "./login-limit";

function memoryStore() {
  const rows: { ip: string; at: number }[] = [];
  const store: AttemptStore = {
    add: async (ip, at) => { rows.push({ ip, at: at.getTime() }); },
    countSince: async (ip, since) => rows.filter((r) => r.ip === ip && r.at >= since.getTime()).length,
    clear: async (ip) => { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].ip === ip) rows.splice(i, 1); },
    purge: async (before) => { for (let i = rows.length - 1; i >= 0; i--) if (rows[i].at < before.getTime()) rows.splice(i, 1); },
  };
  return { store, rows };
}
const T0 = Date.UTC(2026, 10, 24, 10, 0, 0);

describe("registerAttempt", () => {
  it("перші MAX_ATTEMPTS спроб дозволені, наступна — ні", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < MAX_ATTEMPTS; i++) expect((await registerAttempt("1.1.1.1", { store, now: () => T0 + i })).allowed).toBe(true);
    expect((await registerAttempt("1.1.1.1", { store, now: () => T0 + 100 })).allowed).toBe(false);
  });

  it("паралельні запити теж рахуються: дозволених не більше за ліміт (запис ДО перевірки)", async () => {
    const { store } = memoryStore();
    const results = await Promise.all(Array.from({ length: 30 }, () => registerAttempt("2.2.2.2", { store, now: () => T0 })));
    // Усі 30 встигли записати спробу до підрахунку, тож жоден не обійшов ліміт; безпечно навіть заблокувати всіх
    expect(results.filter((r) => r.allowed).length).toBeLessThanOrEqual(MAX_ATTEMPTS);
  });

  it("ліміт по IP: інший IP не заблоковано", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < MAX_ATTEMPTS + 3; i++) await registerAttempt("3.3.3.3", { store, now: () => T0 });
    expect((await registerAttempt("4.4.4.4", { store, now: () => T0 })).allowed).toBe(true);
  });

  it("вікно спливає: через 15 хв тиші вхід знову можливий, старі рядки видалено", async () => {
    const { store, rows } = memoryStore();
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) await registerAttempt("5.5.5.5", { store, now: () => T0 });
    expect((await registerAttempt("5.5.5.5", { store, now: () => T0 + WINDOW_MS + 1000 })).allowed).toBe(true);
    expect(rows.filter((r) => r.at < T0 + 1000)).toHaveLength(0);
  });

  it("успішний вхід скидає лічильник", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) await registerAttempt("6.6.6.6", { store, now: () => T0 });
    await clearAttempts("6.6.6.6", { store });
    for (let i = 0; i < MAX_ATTEMPTS; i++) expect((await registerAttempt("6.6.6.6", { store, now: () => T0 })).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
  it("перший елемент x-forwarded-for", () => expect(clientIp(req({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9"));
  it("запасні варіанти", () => {
    expect(clientIp(req({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
