import { isISODate, isMonday } from "@/lib/dates";
import { HttpError, handle, json } from "@/lib/http";
import { findActivePlan } from "@/lib/plan/service";
import { toPlanDTO } from "@/lib/plan/serialize";

export async function GET(req: Request) {
  return handle(async () => {
    const weekStart = new URL(req.url).searchParams.get("weekStart");
    if (!isISODate(weekStart) || !isMonday(weekStart)) {
      throw new HttpError(400, "weekStart має бути понеділком у форматі YYYY-MM-DD");
    }
    const plan = await findActivePlan(weekStart);
    return json({ plan: plan ? toPlanDTO(plan) : null });
  });
}
