import { prisma } from "@/lib/prisma";
import { normalizeQuery } from "@/lib/video/query";
import { searchYoutube, type VideoCandidate, type YoutubeSearch } from "@/lib/video/youtube";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Свіжість кешу. Політика YouTube API: зберігати дані пошуку не довше 30 днів — оновлюємо раніше, з запасом. */
const FRESH_MS = 25 * DAY_MS;
const MAX_AGE_MS = 30 * DAY_MS;

/**
 * Кандидати-відео для запиту: спершу кеш (один пошук на унікальний запит для всіх планів), потім API.
 * Якщо API недоступне, а в кеші є запис молодший за 30 днів — використовуємо його (краще застарілий, ніж ніякий).
 */
export async function resolveVideos(query: string): Promise<YoutubeSearch> {
  const key = normalizeQuery(query);
  const row = await prisma.videoCache.findUnique({ where: { key } });
  const age = row ? Date.now() - row.createdAt.getTime() : Infinity;
  const cached = row && age < MAX_AGE_MS ? (row.candidates as unknown as VideoCandidate[]) : null;

  if (cached && age < FRESH_MS) return { status: "ok", candidates: cached };

  const res = await searchYoutube(query);
  if (res.status === "ok") {
    await prisma.videoCache.upsert({
      where: { key },
      update: { candidates: res.candidates as unknown as object, createdAt: new Date() },
      create: { key, candidates: res.candidates as unknown as object },
    });
    // Гігієна за політикою: рядки старші за 30 днів не лежать у базі
    await prisma.videoCache.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - MAX_AGE_MS) } } });
    return res;
  }
  if (cached) return { status: "ok", candidates: cached };
  return res;
}
