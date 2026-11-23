import { prisma } from "@/lib/prisma";
import { normalizeQuery } from "@/lib/video/query";
import { searchYoutube, type VideoCandidate, type YoutubeSearch } from "@/lib/video/youtube";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Свіжість кешу. Політика YouTube API: зберігати дані пошуку не довше 30 днів — оновлюємо раніше, з запасом. */
export const FRESH_MS = 25 * DAY_MS;
export const MAX_AGE_MS = 30 * DAY_MS;
/** «Нічого не знайдено» теж кешуємо: інакше кожен тап по такій вправі палив би 200 одиниць квоти (два пошуки). */
export const NONE_TTL_MS = DAY_MS;

export interface CacheRow {
  key: string;
  candidates: VideoCandidate[];
  createdAt: Date;
}

/** Мінімальний інтерфейс сховища — щоб логіку кешу можна було тестувати без БД. */
export interface VideoStore {
  find(key: string): Promise<CacheRow | null>;
  save(key: string, candidates: VideoCandidate[]): Promise<void>;
  purgeOlderThan(cutoff: Date): Promise<void>;
}

const prismaStore: VideoStore = {
  async find(key) {
    const row = await prisma.videoCache.findUnique({ where: { key } });
    return row ? { key: row.key, candidates: row.candidates as unknown as VideoCandidate[], createdAt: row.createdAt } : null;
  },
  async save(key, candidates) {
    const data = candidates as unknown as object;
    await prisma.videoCache.upsert({ where: { key }, update: { candidates: data, createdAt: new Date() }, create: { key, candidates: data } });
  },
  async purgeOlderThan(cutoff) {
    await prisma.videoCache.deleteMany({ where: { createdAt: { lt: cutoff } } });
  },
};

interface Deps {
  store?: VideoStore;
  search?: (query: string) => Promise<YoutubeSearch>;
  now?: () => number;
}

/**
 * Кандидати-відео для запиту: спершу кеш (один пошук на унікальний запит для всіх планів), потім API.
 * Якщо API недоступне, а в кеші є непорожній запис молодший за 30 днів — використовуємо його (краще застарілий, ніж ніякий).
 */
export async function resolveVideos(query: string, deps: Deps = {}): Promise<YoutubeSearch> {
  const store = deps.store ?? prismaStore;
  const search = deps.search ?? ((q: string) => searchYoutube(q));
  const now = deps.now ?? Date.now;

  const key = normalizeQuery(query);
  const row = await store.find(key);
  const age = row ? now() - row.createdAt.getTime() : Infinity;
  const usable = row && age < MAX_AGE_MS ? row.candidates : null;

  if (usable) {
    if (usable.length === 0) {
      if (age < NONE_TTL_MS) return { status: "none" };
    } else if (age < FRESH_MS) {
      return { status: "ok", candidates: usable };
    }
  }

  const res = await search(query);
  if (res.status === "ok" || res.status === "none") {
    await store.save(key, res.status === "ok" ? res.candidates : []);
    // Гігієна за політикою: рядки старші за 30 днів не лежать у базі
    await store.purgeOlderThan(new Date(now() - MAX_AGE_MS));
    return res;
  }
  // API недоступне: непорожній кеш молодший за 30 днів краще за відсутність відео
  if (usable && usable.length > 0) return { status: "ok", candidates: usable };
  return res;
}
