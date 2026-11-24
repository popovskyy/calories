import { z } from "zod";
import { isISODate, isMonday } from "@/lib/dates";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { generateWeek } from "@/lib/plan/service";

// План на 5 днів (~40 вправ): 30–80 с на виклик, а «ремонтний» повтор — ще один виклик. Дефолт Vercel — 300 с,
// тому явне значення не має бути нижчим (інакше платформа обірве функцію й клієнт отримає не-JSON 504).
export const maxDuration = 300;

const body = z.object({
  weekStart: z.string(),
  note: z.string().trim().max(300).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const { weekStart, note } = body.parse(await readJson(req));
    if (!isISODate(weekStart) || !isMonday(weekStart)) {
      throw new HttpError(400, "weekStart має бути понеділком у форматі YYYY-MM-DD");
    }
    return json({ plan: await generateWeek({ weekStart, note }) });
  });
}
