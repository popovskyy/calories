import { describe, expect, it, vi } from "vitest";
import { NOT_CONFIGURED, RelayError, STALE_MS, pressLights, readLights, toLightsDTO, type BoardLights } from "./lights";

const T = 1_000_000;
const board = (p: Partial<BoardLights> = {}): BoardLights => ({ want: null, wantAt: 0, actual: null, appliedAt: 0, error: null, ...p });
const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const deps = (f: ReturnType<typeof reply>) => ({ url: "https://board.example/", token: "k", fetch: f as unknown as typeof fetch });

describe("toLightsDTO", () => {
  it("ПК ще не звітував і ніхто не натискав — не «очікує», стан невідомий", () => {
    expect(toLightsDTO(board(), T)).toEqual({ configured: true, on: null, want: null, pending: false, stale: false, error: null });
  });

  it("натиснули, ПК ще не виконав — очікує, але ще не «застряг»", () => {
    const d = toLightsDTO(board({ want: false, wantAt: T - 5_000, actual: true, appliedAt: 100 }), T);
    expect(d).toMatchObject({ on: true, want: false, pending: true, stale: false });
  });

  it("очікування довше за 45 с — ПК, схоже, вимкнений", () => {
    const d = toLightsDTO(board({ want: false, wantAt: T - STALE_MS - 1, actual: true, appliedAt: 100 }), T);
    expect(d).toMatchObject({ pending: true, stale: true });
  });

  it("ПК виконав (appliedAt ≥ wantAt) — не очікує, показує реальний стан і помилку, якщо була", () => {
    expect(toLightsDTO(board({ want: false, wantAt: 500, actual: false, appliedAt: 500 }), T)).toMatchObject({ on: false, pending: false, stale: false });
    expect(toLightsDTO(board({ want: false, wantAt: 500, actual: true, appliedAt: 500, error: "стрічка не перемкнулась" }), T).error).toBe("стрічка не перемкнулась");
  });
});

describe("readLights / pressLights", () => {
  it("без ключа чи адреси — «не налаштовано», дошку не смикаємо", async () => {
    const f = reply(200, {});
    expect(await readLights({ url: "", token: "k", fetch: f as unknown as typeof fetch })).toEqual(NOT_CONFIGURED);
    expect(f).not.toHaveBeenCalled();
    await expect(pressLights(true, { url: "https://x", token: "", fetch: f as unknown as typeof fetch })).rejects.toMatchObject({ status: 503 });
  });

  it("читання: GET на /api/lights з вузьким ключем, слеш в кінці адреси не заважає", async () => {
    const f = reply(200, { lights: board({ want: true, wantAt: 5, actual: true, appliedAt: 5 }), serverNow: T });
    const d = await readLights(deps(f));
    expect(d).toMatchObject({ on: true, pending: false });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://board.example/api/lights");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k");
  });

  it("натискання: POST {want}, відповідь одразу «очікує»", async () => {
    const f = reply(200, { lights: board({ want: false, wantAt: T, actual: true, appliedAt: 1 }) });
    const d = await pressLights(false, deps(f));
    expect(d).toMatchObject({ want: false, pending: true, stale: false });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ want: false });
  });

  it("помилки дошки перетворюються на зрозумілий RelayError без витоку ключа", async () => {
    await expect(readLights(deps(reply(401, { error: "unauthorized" })))).rejects.toThrow("не прийняла ключ");
    await expect(readLights(deps(reply(500, {})))).rejects.toThrow("помилкою 500");
    await expect(readLights(deps(reply(200, { nope: 1 })))).rejects.toThrow("незрозумілу");
    const boom = vi.fn(async () => { throw new Error("socket k"); });
    const err = await readLights({ url: "https://b", token: "secret-key", fetch: boom as unknown as typeof fetch }).catch((e) => e);
    expect(err).toBeInstanceOf(RelayError);
    expect(String(err.message)).not.toContain("secret-key");
    expect(err.message).toBe("Дошка не відповідає");
  });
});
