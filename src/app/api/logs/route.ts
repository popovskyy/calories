import { z } from "zod";
import { handle, json } from "@/lib/http";
import { completeTarget, uncompleteTarget } from "@/lib/plan/service";

const body = z.object({
  dayId: z.string().min(1).max(64),
  /** null/відсутній → завершення всього тренування. */
  exerciseId: z.string().min(1).max(64).nullish(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const { dayId, exerciseId } = body.parse(await req.json());
    const log = await completeTarget(dayId, exerciseId ?? null);
    return json({ ok: true, completedAt: log.completedAt.toISOString() }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const { dayId, exerciseId } = body.parse(await req.json());
    await uncompleteTarget(dayId, exerciseId ?? null);
    return json({ ok: true });
  });
}
