import { z } from "zod";
import { handle, json } from "@/lib/http";
import { adaptDay } from "@/lib/plan/service";

export const maxDuration = 90;

const body = z.object({
  dayId: z.string().min(1).max(64),
  mode: z.enum(["fatigued", "short_time", "full_power"]),
  note: z.string().trim().max(300).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const input = body.parse(await req.json());
    return json({ plan: await adaptDay(input) });
  });
}
