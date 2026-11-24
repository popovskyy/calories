/**
 * Клієнт YouTube Data API v3 (пошук відео-демонстрацій вправ).
 * `fetch`, ключ і базовий URL підставляються ззовні — так усі гілки тестуються без мережі й без реального ключа.
 */

export interface VideoCandidate {
  id: string;
  title: string;
  channel: string;
}

export type YoutubeSearch =
  | { status: "ok"; candidates: VideoCandidate[] }
  | { status: "none" }
  | { status: "unavailable"; reason: "no_key" | "quota" | "error" };

const DEFAULT_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 5;

export function youtubeKey(): string | null {
  return process.env.YOUTUBE_API_KEY?.trim() || null;
}

/** Фіча вмикається самим наявним ключем: без нього застосунок лишається на пошуковому посиланні. */
export function youtubeConfigured(): boolean {
  return youtubeKey() !== null;
}

export { normalizeQuery, youtubeSearchUrl } from "./query";

/** API віддає назви з HTML-сутностями («&#39;», «&amp;»). */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k === "amp") return "&";
    if (k === "lt") return "<";
    if (k === "gt") return ">";
    if (k === "quot") return '"';
    if (k === "apos") return "'";
    const code = k.startsWith("#x") ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
  });
}

interface Deps {
  fetch?: typeof fetch;
  apiKey?: string | null;
  base?: string;
}

type Once = { ok: true; candidates: VideoCandidate[] } | { ok: false; reason: "quota" | "error" };

async function searchOnce(query: string, shortOnly: boolean, key: string, f: typeof fetch, base: string): Promise<Once> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(MAX_RESULTS),
    videoEmbeddable: "true", // інакше плеєр у застосунку покаже «відео недоступне»
    videoSyndicated: "true",
    safeSearch: "strict",
    key,
  });
  // Демонстрація вправи — зазвичай коротке відео (<4 хв); довші лише якщо коротких немає
  if (shortOnly) params.set("videoDuration", "short");

  let res: Response;
  try {
    res = await f(`${base}/search?${params.toString()}`, { headers: { Accept: "application/json" } });
  } catch {
    return { ok: false, reason: "error" };
  }

  if (!res.ok) {
    let reason = "";
    try {
      const body = (await res.json()) as { error?: { errors?: { reason?: string }[] } };
      reason = body.error?.errors?.[0]?.reason ?? "";
    } catch {
      /* тіло не JSON */
    }
    return { ok: false, reason: /quota|rateLimit|dailyLimit/i.test(reason) ? "quota" : "error" };
  }

  let body: { items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }[] };
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: "error" };
  }

  const candidates: VideoCandidate[] = [];
  for (const item of body.items ?? []) {
    const id = item.id?.videoId;
    if (!id || !/^[\w-]{6,20}$/.test(id)) continue; // лише схожий на справжній id: він піде в URL iframe
    candidates.push({
      id,
      title: decodeEntities(item.snippet?.title ?? "").slice(0, 140),
      channel: decodeEntities(item.snippet?.channelTitle ?? "").slice(0, 80),
    });
  }
  return { ok: true, candidates };
}

export async function searchYoutube(query: string, deps: Deps = {}): Promise<YoutubeSearch> {
  const key = deps.apiKey === undefined ? youtubeKey() : deps.apiKey;
  if (!key) return { status: "unavailable", reason: "no_key" };
  const f = deps.fetch ?? fetch;
  const base = deps.base ?? (process.env.YOUTUBE_API_BASE?.trim() || DEFAULT_BASE);

  const short = await searchOnce(query, true, key, f, base);
  if (!short.ok) return { status: "unavailable", reason: short.reason };
  if (short.candidates.length > 0) return { status: "ok", candidates: short.candidates };

  const any = await searchOnce(query, false, key, f, base);
  if (!any.ok) return { status: "unavailable", reason: any.reason };
  return any.candidates.length > 0 ? { status: "ok", candidates: any.candidates } : { status: "none" };
}
