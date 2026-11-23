import { HttpError, handle, json } from "@/lib/http";
import { youtubeSearchUrl } from "@/lib/video/query";
import { resolveVideos } from "@/lib/video/service";
import { youtubeConfigured } from "@/lib/video/youtube";

export const maxDuration = 30;

/**
 * GET /api/video            → { enabled } — чи задано YOUTUBE_API_KEY (клієнт вирішує: шторка з плеєром чи просте посилання).
 * GET /api/video?q=<запит>  → кандидати-відео (до 5) + запасне посилання на пошук.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const q = new URL(req.url).searchParams.get("q");
    if (q === null) return json({ enabled: youtubeConfigured() });

    const query = q.trim();
    if (query.length < 3 || query.length > 120) throw new HttpError(400, "Запит для відео має бути від 3 до 120 символів");

    const res = await resolveVideos(query);
    return json({
      status: res.status,
      candidates: res.status === "ok" ? res.candidates : [],
      searchUrl: youtubeSearchUrl(query),
    });
  });
}
