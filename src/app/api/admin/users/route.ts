import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { calcTargetCalories } from "@/lib/calories";
import { hashPassword } from "@/lib/auth";
import { notifyUser } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { toUserDTO } from "@/lib/user-dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
      // Останній запис їжі — без нього «блокувати того, хто не займається»
      // перетворюється на гадання: в списку не видно, хто взагалі закинув.
      meals: {
        where: { status: { not: "cancelled" } },
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
  });
  // Непідтверджені зверху — щоб адмін одразу бачив чергу.
  const sorted = [...users].sort((a, b) => Number(a.approved) - Number(b.approved));
  return NextResponse.json(
    sorted.map((u) => ({
      ...toUserDTO(u),
      lastEntryDate: u.meals[0]?.date ?? null,
      peppaPunishBackupAvatarUrl: u.peppaPunishBackupAvatarUrl,
    })),
  );
}

const currentYear = new Date().getFullYear();

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  password: z.string().min(6).max(128).optional(),
  birthYear: z.number().int().min(1920).max(currentYear).optional(),
  birthMonth: z.number().int().min(1).max(12).optional(),
  sex: z.enum(["male", "female"]).optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  goal: z.enum(["maintain", "deficit"]).optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  targetCalories: z.number().int().positive().optional(),
  avatarUrl: z.string().nullable().optional(),
  peppaPunishBackupAvatarUrl: z.string().nullable().optional(),
  coins: z.number().int().min(0).max(10_000_000).optional(),
  approved: z.boolean().optional(),
  /** true — призупинити доступ, false — повернути. */
  blocked: z.boolean().optional(),
  /** Причина; порожній рядок = без пояснення (юзер побачить дефолтний текст). */
  blockReason: z.string().trim().max(300).nullable().optional(),
  recalcTarget: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Невалідні дані" },
      { status: 400 },
    );
  }

  const { id, password, recalcTarget, ...rest } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Юзера не знайдено" }, { status: 404 });
  }

  const wasApproved = existing.approved;
  const wasBlocked = existing.blockedAt != null;

  if (rest.username && rest.username.toLowerCase() !== existing.username) {
    const clash = await prisma.user.findUnique({
      where: { username: rest.username.toLowerCase() },
    });
    if (clash) {
      return NextResponse.json({ error: "Логін зайнятий" }, { status: 409 });
    }
  }

  const next = {
    name: rest.name ?? existing.name,
    birthYear: rest.birthYear ?? existing.birthYear,
    birthMonth: rest.birthMonth ?? existing.birthMonth,
    sex: rest.sex ?? existing.sex,
    activityLevel: rest.activityLevel ?? existing.activityLevel,
    goal: rest.goal ?? existing.goal,
    weight: rest.weight ?? existing.weight,
    height: rest.height ?? existing.height,
  };

  let targetCalories = rest.targetCalories ?? existing.targetCalories;
  if (recalcTarget || (!rest.targetCalories && (rest.weight || rest.height || rest.goal || rest.activityLevel || rest.sex || rest.birthYear))) {
    const { targetCalories: t } = calcTargetCalories({
      birthYear: next.birthYear,
      birthMonth: next.birthMonth,
      sex: next.sex as "male" | "female",
      weightKg: next.weight,
      heightCm: next.height,
      goal: next.goal as "maintain" | "deficit",
    });
    targetCalories = t;
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...next,
      ...(rest.username ? { username: rest.username.toLowerCase() } : {}),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
      ...(rest.avatarUrl !== undefined ? { avatarUrl: rest.avatarUrl } : {}),
      ...(rest.peppaPunishBackupAvatarUrl !== undefined
        ? { peppaPunishBackupAvatarUrl: rest.peppaPunishBackupAvatarUrl }
        : {}),
      ...(rest.coins !== undefined ? { coins: rest.coins } : {}),
      ...(rest.approved !== undefined ? { approved: rest.approved } : {}),
      // blockedAt — і прапорець, і дата події: розблокування чистить обидва
      // поля, щоб у базі не лишалось «привидів» старої причини.
      ...(rest.blocked === true
        ? {
            blockedAt: existing.blockedAt ?? new Date(),
            blockReason: rest.blockReason?.trim() || null,
          }
        : {}),
      ...(rest.blocked === false ? { blockedAt: null, blockReason: null } : {}),
      // Правка самої причини без зміни статусу (уточнити формулювання).
      ...(rest.blocked === undefined && rest.blockReason !== undefined
        ? { blockReason: rest.blockReason?.trim() || null }
        : {}),
      targetCalories,
    },
    include: {
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
    },
  });

  // Ручна правка балансу теж має лишати слід у гаманці, інакше історія
  // розійдеться з поточними монетами і зневіриться сама ідея реєстру.
  if (rest.coins !== undefined && rest.coins !== existing.coins) {
    const delta = rest.coins - existing.coins;
    await prisma.coinTxn.create({
      data: {
        userId: id,
        delta,
        kind: "admin",
        refKey: null,
        label: delta > 0 ? "Нарахування адміністратора" : "Коригування адміністратора",
      },
    });
  }

  if (rest.coins !== undefined && rest.coins > existing.coins) {
    const delta = rest.coins - existing.coins;
    void notifyUser(id, {
      kind: "system",
      title: "Монети нараховано",
      body: `Адмін нарахував +${delta.toLocaleString("uk-UA")} монет. Баланс: ${rest.coins.toLocaleString("uk-UA")}.`,
      url: "/shop",
      dedupeKey: null,
    }).catch(console.error);
  }

  // Пуш про блокування дійде лише на вже підписані пристрої й тільки якщо
  // юзер не в додатку — але це єдиний спосіб пояснити зникнення доступу тому,
  // хто зараз не дивиться на екран. Сам оверлей покаже причину при вході.
  if (rest.blocked === true && !wasBlocked) {
    void notifyUser(id, {
      kind: "system",
      title: "Доступ призупинено",
      body: rest.blockReason?.trim() || "Адмін тимчасово закрив доступ до акаунта.",
      url: "/",
      dedupeKey: null,
    }).catch(console.error);
  }

  if (rest.blocked === false && wasBlocked) {
    void notifyUser(id, {
      kind: "system",
      title: "Доступ відновлено",
      body: "Акаунт знову відкритий — можна вести щоденник далі.",
      url: "/",
      dedupeKey: null,
    }).catch(console.error);
  }

  if (rest.approved === true && !wasApproved) {
    void notifyUser(id, {
      kind: "system",
      title: "Акаунт підтверджено",
      body: "Адмін відкрив доступ — можна користуватись додатком.",
      url: "/",
      dedupeKey: null,
    }).catch(console.error);
  }

  return NextResponse.json(toUserDTO(user));
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Потрібен id" }, { status: 400 });
  }
  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Юзера не знайдено" }, { status: 404 });
  }
}
