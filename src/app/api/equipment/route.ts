import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { equipmentKey } from "@/lib/equipment-key";
import { equipmentFields, normalizeWeights } from "@/lib/equipment-input";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { listEquipment } from "@/lib/plan/service";
import { toEquipmentDTO } from "@/lib/plan/serialize";

export async function GET() {
  return handle(async () => json({ equipment: (await listEquipment()).map(toEquipmentDTO) }));
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = normalizeWeights(equipmentFields.parse(await readJson(req)));
    const key = equipmentKey(input.name);
    if (!key) throw new HttpError(400, "Вкажіть назву предмета");
    try {
      const created = await prisma.equipment.create({
        data: {
          name: input.name,
          key,
          detail: input.detail || null,
          category: input.category,
          adjustable: input.adjustable,
          maxWeightKg: input.adjustable ? (input.maxWeightKg ?? null) : null,
          weightKg: input.adjustable ? (input.weightKg ?? input.maxWeightKg ?? null) : null,
          source: "manual",
        },
      });
      return json({ item: toEquipmentDTO(created) }, { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new HttpError(409, "Такий предмет уже є в арсеналі");
      }
      throw e;
    }
  });
}
