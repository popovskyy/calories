import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { equipmentKey } from "@/lib/equipment-key";
import { HttpError, handle, json } from "@/lib/http";
import { toEquipmentDTO } from "@/lib/plan/serialize";

const patch = z
  .object({
    name: z.string().trim().min(2).max(80),
    detail: z.string().trim().max(140).nullable(),
    category: z.enum(["strength", "cardio", "mobility", "other"]),
    adjustable: z.boolean(),
    maxWeightKg: z.number().min(0.5).max(300).nullable(),
    weightKg: z.number().min(0.5).max(300).nullable(),
    active: z.boolean(),
  })
  .partial();

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const input = patch.parse(await req.json());
    const current = await prisma.equipment.findUnique({ where: { id } });
    if (!current) throw new HttpError(404, "Предмет не знайдено");

    const adjustable = input.adjustable ?? current.adjustable;
    let maxWeightKg = input.maxWeightKg !== undefined ? input.maxWeightKg : current.maxWeightKg;
    let weightKg = input.weightKg !== undefined ? input.weightKg : current.weightKg;
    if (!adjustable) {
      maxWeightKg = null;
      weightKg = null;
    } else if (maxWeightKg != null && weightKg != null && weightKg > maxWeightKg) {
      weightKg = maxWeightKg;
    }

    const data: Prisma.EquipmentUpdateInput = {
      adjustable,
      maxWeightKg,
      weightKg,
      ...(input.detail !== undefined && { detail: input.detail || null }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.active !== undefined && { active: input.active }),
    };
    if (input.name !== undefined) {
      const key = equipmentKey(input.name);
      if (!key) throw new HttpError(400, "Вкажіть назву предмета");
      data.name = input.name;
      data.key = key;
    }

    try {
      const updated = await prisma.equipment.update({ where: { id }, data });
      return json({ item: toEquipmentDTO(updated) });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new HttpError(409, "Предмет з такою назвою вже є");
      }
      throw e;
    }
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const { count } = await prisma.equipment.deleteMany({ where: { id } });
    if (count === 0) throw new HttpError(404, "Предмет не знайдено");
    return json({ ok: true });
  });
}
