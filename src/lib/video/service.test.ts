import { describe, expect, it } from "vitest";
import { FRESH_MS, MAX_AGE_MS, NONE_TTL_MS, resolveVideos, type CacheRow, type VideoStore } from "./service";
import type { VideoCandidate, YoutubeSearch } from "./youtube";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const cand = (id: string): VideoCandidate => ({ id, title: `t-${id}`, channel: "c" });

function harness(initial: CacheRow[], replies: YoutubeSearch[]) {
  const rows = new Map(initial.map((r) => [r.key, r]));
  const log = { searches: [] as string[], saves: [] as string[], purges: 0 };
  const store: VideoStore = {
    find: async (k) => rows.get(k) ?? null,
    save: async (k, c) => { log.saves.push(k); rows.set(k, { key: k, candidates: c, createdAt: new Date(NOW) }); },
    purgeOlderThan: async () => { log.purges++; },
  };
  const search = async (q: string) => { log.searches.push(q); const r = replies.shift(); if (!r) throw new Error("unexpected extra search"); return r; };
  return { store, search, log, deps: { store, search, now: () => NOW } };
}
const row = (key: string, candidates: VideoCandidate[], ageMs: number): CacheRow => ({ key, candidates, createdAt: new Date(NOW - ageMs) });

describe("resolveVideos", () => {
  it("свіжий кеш — без звернення до API; запит нормалізується", async () => {
    const h = harness([row("plank form", [cand("aaaaaaaaaaa")], 2 * DAY)], []);
    const r = await resolveVideos("  Plank   FORM ", h.deps);
    expect(r).toEqual({ status: "ok", candidates: [cand("aaaaaaaaaaa")] });
    expect(h.log.searches).toHaveLength(0);
  });

  it("порожнього кешу немає → пошук, збереження, очищення старого", async () => {
    const h = harness([], [{ status: "ok", candidates: [cand("bbbbbbbbbbb")] }]);
    const r = await resolveVideos("squat", h.deps);
    expect(r.status).toBe("ok");
    expect(h.log).toEqual({ searches: ["squat"], saves: ["squat"], purges: 1 });
  });

  it("кеш старший за 25 днів — оновлюється з API", async () => {
    const h = harness([row("squat", [cand("old00000000")], FRESH_MS + DAY)], [{ status: "ok", candidates: [cand("new00000000")] }]);
    const r = await resolveVideos("squat", h.deps);
    expect(r).toEqual({ status: "ok", candidates: [cand("new00000000")] });
    expect(h.log.searches).toHaveLength(1);
  });

  it("«нічого не знайдено» кешується: другий виклик не палить квоту", async () => {
    const h = harness([], [{ status: "none" }]);
    expect(await resolveVideos("zzz", h.deps)).toEqual({ status: "none" });
    expect(await resolveVideos("zzz", h.deps)).toEqual({ status: "none" });
    expect(h.log.searches).toHaveLength(1);
  });

  it("негативний кеш старший за добу — пошук повторюється", async () => {
    const h = harness([row("zzz", [], NONE_TTL_MS + 1000)], [{ status: "ok", candidates: [cand("found000000")] }]);
    expect((await resolveVideos("zzz", h.deps)).status).toBe("ok");
    expect(h.log.searches).toHaveLength(1);
  });

  it("API недоступне, а кеш 25–30 днів є — віддаємо його", async () => {
    const h = harness([row("squat", [cand("stale000000")], FRESH_MS + DAY)], [{ status: "unavailable", reason: "quota" }]);
    expect(await resolveVideos("squat", h.deps)).toEqual({ status: "ok", candidates: [cand("stale000000")] });
    expect(h.log.saves).toHaveLength(0);
  });

  it("API недоступне й кеш старший за 30 днів — не віддаємо (політика) і не зберігаємо", async () => {
    const h = harness([row("squat", [cand("dead0000000")], MAX_AGE_MS + DAY)], [{ status: "unavailable", reason: "error" }]);
    expect(await resolveVideos("squat", h.deps)).toEqual({ status: "unavailable", reason: "error" });
    expect(h.log.saves).toHaveLength(0);
  });

  it("API недоступне й кешу немає — повертаємо причину", async () => {
    const h = harness([], [{ status: "unavailable", reason: "no_key" }]);
    expect(await resolveVideos("squat", h.deps)).toEqual({ status: "unavailable", reason: "no_key" });
  });
});
