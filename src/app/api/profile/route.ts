import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, json, readJson } from "@/lib/http";
import { getProfile } from "@/lib/plan/service";
import { toProfileDTO } from "@/lib/plan/serialize";

const body = z.object({
  name: z.string().trim().min(1).max(40),
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(14).max(90),
  heightCm: z.number().int().min(120).max(230),
  weightKg: z.number().min(35).max(250),
  goal: z.string().trim().min(3).max(300),
  limitations: z.string().trim().max(400),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  routine: z.string().trim().max(400),
});

export async function GET() {
  return handle(async () => json({ profile: toProfileDTO(await getProfile()) }));
}

export async function PUT(req: Request) {
  return handle(async () => {
    const data = body.parse(await readJson(req));
    const saved = await prisma.userProfile.upsert({
      where: { id: "me" },
      update: data,
      create: { id: "me", ...data },
    });
    return json({ profile: toProfileDTO(saved) });
  });
}
