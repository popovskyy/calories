import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { UserDTO } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, "Ім'я обов'язкове"),
  targetCalories: z.number().int().positive(),
  age: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export async function GET() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(users satisfies UserDTO[]);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }
  const { id, ...data } = parsed.data;

  const user = id
    ? await prisma.user.update({ where: { id }, data })
    : await prisma.user.create({
        data: {
          name: data.name,
          targetCalories: data.targetCalories,
          age: data.age ?? 30,
          weight: data.weight ?? 70,
          height: data.height ?? 175,
        },
      });

  return NextResponse.json(user satisfies UserDTO, { status: id ? 200 : 201 });
}
