import { prisma } from "@/lib/prisma";
import { todayYMD, toYMD } from "@/lib/date";
import { computeStreak, countInTargetDays } from "@/lib/streak";
import { grant, type GrantedReward } from "@/lib/reward-grant";
import {
  EPICS,
  getEpic,
  parseClaimed,
  reachedNodes,
  serializeClaimed,
  toProgressValue,
  type EpicDef,
} from "@/lib/epics";

/**
 * Обрахунок прогресу епіків і виплата вузлів.
 *
 * Прогрес не зберігається — він завжди перераховується з журналів. Для 2–5
 * гравців це один агрегувальний запит, зате немає класу багів «лічильник
 * розійшовся з реальністю» після скасування запису адміном.
 */

export interface EpicStatusDTO {
  epicId: string;
  nameUk: string;
  tagline: string;
  icon: string;
  unit: string;
  total: number;
  progress: number;
  /** Скільки лишилось — саме це показуємо в UI (ефект градієнта цілі). */
  remaining: number;
  active: boolean;
  background: boolean;
  started: boolean;
  completed: boolean;
  nodes: {
    at: number;
    nameUk: string;
    loreUk: string;
    coins: number;
    reached: boolean;
    claimed: boolean;
  }[];
}

/** Сирий показник для епіка від дати старту. */
async function rawProgress(
  userId: string,
  def: EpicDef,
  startDate: string,
): Promise<number> {
  switch (def.kind) {
    case "burn_distance":
    case "burn_vertical": {
      const agg = await prisma.activityLog.aggregate({
        where: {
          userId,
          date: { gte: startDate },
          status: { not: "cancelled" },
        },
        _sum: { caloriesBurned: true },
      });
      return agg._sum.caloriesBurned ?? 0;
    }
    case "streak": {
      const { streak } = await computeStreak(userId);
      return streak;
    }
    case "in_target_total": {
      // Лічильник за все життя, а не від старту епіка: «100 точних днів» —
      // це визнання накопиченого, інакше епік знецінює всю попередню роботу.
      return countInTargetDays(userId);
    }
    case "weight_loss": {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { startWeight: true, weight: true },
      });
      if (!user?.startWeight) return 0;
      return Math.max(0, user.startWeight - user.weight);
    }
    case "plateau": {
      // Днів із записом їжі від старту епіка — дисципліна під час плато.
      const rows = await prisma.mealLog.findMany({
        where: { userId, date: { gte: startDate }, status: { not: "cancelled" } },
        select: { date: true },
        distinct: ["date"],
      });
      return rows.length;
    }
    default:
      return 0;
  }
}

/**
 * Чи впало плато: вага не змінюється ≥14 днів попри дисципліну.
 * Саме тут гравці кидають найчастіше, тож перетворюємо цей момент на квест.
 */
export async function detectPlateau(userId: string): Promise<boolean> {
  const rows = await prisma.weightLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
    select: { date: true, weight: true },
  });
  if (rows.length < 2) return false;

  const newest = rows[0]!;
  const cutoff = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const old = rows.find((r) => r.date <= toYMD(cutoff));
  if (!old) return false;

  return Math.abs(newest.weight - old.weight) < 0.3;
}

/** Стартує епік (або повертає наявний). Контекстні стартують самі. */
export async function startEpic(userId: string, epicId: string) {
  const def = getEpic(epicId);
  if (!def) return null;

  const existing = await prisma.userEpic.findUnique({
    where: { userId_epicId: { userId, epicId } },
  });
  if (existing) return existing;

  // Активним може бути лише один обираний епік — решту знімаємо.
  if (!def.background) {
    await prisma.userEpic.updateMany({
      where: { userId, active: true, epicId: { not: epicId } },
      data: { active: false },
    });
  }

  return prisma.userEpic.create({
    data: { userId, epicId, startDate: todayYMD(), active: true },
  });
}

/** Прогрес + виплата досягнутих вузлів. */
export async function listEpics(
  userId: string,
): Promise<{ epics: EpicStatusDTO[]; granted: GrantedReward[] }> {
  const rows = await prisma.userEpic.findMany({ where: { userId } });
  const byId = new Map(rows.map((r) => [r.epicId, r]));
  const granted: GrantedReward[] = [];

  // Фонові епіки стартують самі, щойно для них є сенс.
  for (const def of EPICS.filter((e) => e.background && !e.contextual)) {
    if (!byId.has(def.id)) {
      const created = await startEpic(userId, def.id);
      if (created) byId.set(def.id, created);
    }
  }
  if (!byId.has("plateau") && (await detectPlateau(userId))) {
    const created = await startEpic(userId, "plateau");
    if (created) byId.set("plateau", created);
  }

  const out: EpicStatusDTO[] = [];

  for (const def of EPICS) {
    const row = byId.get(def.id);
    // Контекстні показуємо лише коли вони справді запущені.
    if (!row && def.contextual) continue;

    const startDate = row?.startDate ?? todayYMD();
    const raw = row ? await rawProgress(userId, def, startDate) : 0;
    const progress = row
      ? Math.min(def.total, toProgressValue(def.kind, raw) + def.endowed)
      : def.endowed;

    const claimed = parseClaimed(row?.nodesClaimed ?? "");
    const reached = row ? reachedNodes(def, progress) : [];

    // Виплата нових вузлів
    const fresh = reached.filter((i) => !claimed.has(i));
    if (row && fresh.length > 0) {
      for (const i of fresh) {
        const node = def.nodes[i]!;
        await grant(
          userId,
          `epic:${def.id}:${i}`,
          node.coins,
          `${def.nameUk}: ${node.nameUk}`,
          granted,
        );
        claimed.add(i);
      }
      const allDone = claimed.size >= def.nodes.length;
      await prisma.userEpic.update({
        where: { id: row.id },
        data: {
          nodesClaimed: serializeClaimed(claimed),
          completedAt: allDone ? (row.completedAt ?? new Date()) : row.completedAt,
        },
      });
    }

    out.push({
      epicId: def.id,
      nameUk: def.nameUk,
      tagline: def.tagline,
      icon: def.icon,
      unit: def.unit,
      total: def.total,
      progress: Math.round(progress * 10) / 10,
      remaining: Math.max(0, Math.round((def.total - progress) * 10) / 10),
      active: row?.active ?? false,
      background: def.background,
      started: !!row,
      completed: claimed.size >= def.nodes.length,
      nodes: def.nodes.map((n, i) => ({
        at: n.at,
        nameUk: n.nameUk,
        loreUk: n.loreUk,
        coins: n.coins,
        reached: reached.includes(i),
        claimed: claimed.has(i),
      })),
    });
  }

  return { epics: out, granted };
}

/** id завершених епіків — потрібні для заслуженої косметики. */
export async function completedEpicIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.userEpic.findMany({
    where: { userId, completedAt: { not: null } },
    select: { epicId: true },
  });
  return new Set(rows.map((r) => r.epicId));
}
