import { prisma } from "@/lib/prisma";
import {
  shiftYMD,
  todayYMD,
  weekDays,
  weekIndex,
  weekStartYMD,
} from "@/lib/date";
import { dayNetCalories } from "@/lib/day-totals";
import { grant, type GrantedReward } from "@/lib/reward-grant";

/** Жорстка зона «в цілі» для квестів і денної нагороди. */
export const QUEST_TARGET_TOLERANCE = 0.05;
/** «Вибух» калорій — день зіпсував дисципліну. */
export const BLOWOUT_OVER = 0.15;

export type QuestKind =
  | "in_target_days"
  | "log_days"
  | "activity_days"
  | "dual_days"
  | "no_blowout"
  | "weekend_clean";

export interface QuestTemplate {
  code: string;
  titleUk: string;
  description: string;
  kind: QuestKind;
  target: number;
  rewardCoins: number;
  sortOrder: number;
}

/** Пул цікавих квестів — щотижня беремо 3 за ротацією. */
export const QUEST_POOL: QuestTemplate[] = [
  {
    code: "sniper_5",
    titleUk: "Снайпер ×5",
    description: "5 днів тижня в межах ±5% від цілі (з їжею в журналі)",
    kind: "in_target_days",
    target: 5,
    rewardCoins: 150,
    sortOrder: 10,
  },
  {
    code: "iron_week",
    titleUk: "Залізна дисципліна",
    description: "Усі 7 днів у межах ±5% — легендарний тиждень",
    kind: "in_target_days",
    target: 7,
    rewardCoins: 320,
    sortOrder: 20,
  },
  {
    code: "log_6",
    titleUk: "Не пропускай",
    description: "Запиши їжу щонайменше 6 днів цього тижня",
    kind: "log_days",
    target: 6,
    rewardCoins: 70,
    sortOrder: 30,
  },
  {
    code: "move_4",
    titleUk: "Рух — сила",
    description: "4 дні з активністю (тренування / прогулянка)",
    kind: "activity_days",
    target: 4,
    rewardCoins: 100,
    sortOrder: 40,
  },
  {
    code: "dual_4",
    titleUk: "Повний день",
    description: "4 дні підряд або будь-які 4: і їжа, і активність",
    kind: "dual_days",
    target: 4,
    rewardCoins: 130,
    sortOrder: 50,
  },
  {
    code: "no_chaos",
    titleUk: "Без хаосу",
    description: "Жодного дня з перебором понад +15% від цілі (потрібні логи)",
    kind: "no_blowout",
    target: 5,
    rewardCoins: 120,
    sortOrder: 60,
  },
  {
    code: "weekend_clean",
    titleUk: "Чисті вихідні",
    description: "Субота і неділя обидві в межах ±5%",
    kind: "weekend_clean",
    target: 2,
    rewardCoins: 90,
    sortOrder: 70,
  },
  {
    code: "sniper_4",
    titleUk: "Точність ×4",
    description: "4 дні в зоні ±5% — база для магазину",
    kind: "in_target_days",
    target: 4,
    rewardCoins: 100,
    sortOrder: 15,
  },
];

function seededPick(weekStart: string, count: number): QuestTemplate[] {
  const idx = weekIndex(weekStart);
  const order = [...QUEST_POOL];
  // Детермінований shuffle
  for (let i = order.length - 1; i > 0; i--) {
    const j = (idx * 17 + i * 31) % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  // Завжди хоча б один «в цілі»
  const picked: QuestTemplate[] = [];
  const sniper = order.find((q) => q.kind === "in_target_days");
  if (sniper) picked.push(sniper);
  for (const q of order) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.code === q.code)) picked.push(q);
  }
  return picked.slice(0, count).map((q, i) => ({ ...q, sortOrder: (i + 1) * 10 }));
}

/** Створює 3 квести тижня, якщо їх ще немає. */
export async function ensureWeekQuests(weekStart?: string): Promise<void> {
  const ws = weekStart ?? weekStartYMD();
  const existing = await prisma.weeklyQuest.count({ where: { weekStart: ws } });
  if (existing > 0) return;

  const picked = seededPick(ws, 3);
  await prisma.weeklyQuest.createMany({
    data: picked.map((q) => ({
      weekStart: ws,
      code: q.code,
      titleUk: q.titleUk,
      description: q.description,
      kind: q.kind,
      target: q.target,
      rewardCoins: q.rewardCoins,
      sortOrder: q.sortOrder,
      active: true,
    })),
    skipDuplicates: true,
  });
}

export interface DaySnap {
  date: string;
  mealCount: number;
  activityCount: number;
  net: number;
  inTarget: boolean;
  blowout: boolean;
  hasMeal: boolean;
}

async function weekSnapshots(
  userId: string,
  weekStart: string,
  targetCalories: number,
): Promise<DaySnap[]> {
  const today = todayYMD();
  const days = weekDays(weekStart).filter((d) => d <= today);
  const tol = targetCalories * QUEST_TARGET_TOLERANCE;
  const blow = targetCalories * (1 + BLOWOUT_OVER);

  const snaps: DaySnap[] = [];
  for (const date of days) {
    const t = await dayNetCalories(userId, date);
    const hasMeal = t.mealCount > 0;
    const inTarget =
      hasMeal && targetCalories > 0 && Math.abs(t.net - targetCalories) <= tol;
    const blowout = hasMeal && t.net > blow;
    snaps.push({
      date,
      mealCount: t.mealCount,
      activityCount: t.activityCount,
      net: t.net,
      inTarget,
      blowout,
      hasMeal,
    });
  }
  return snaps;
}

function progressFor(
  kind: QuestKind,
  target: number,
  snaps: DaySnap[],
  weekStart: string,
): { progress: number; done: boolean } {
  switch (kind) {
    case "in_target_days": {
      const n = snaps.filter((s) => s.inTarget).length;
      return { progress: n, done: n >= target };
    }
    case "log_days": {
      const n = snaps.filter((s) => s.hasMeal).length;
      return { progress: n, done: n >= target };
    }
    case "activity_days": {
      const n = snaps.filter((s) => s.activityCount > 0).length;
      return { progress: n, done: n >= target };
    }
    case "dual_days": {
      const n = snaps.filter((s) => s.hasMeal && s.activityCount > 0).length;
      return { progress: n, done: n >= target };
    }
    case "no_blowout": {
      // Потрібно ≥ target днів з логом і жодного blowout серед усіх залогованих
      const logged = snaps.filter((s) => s.hasMeal);
      const ok = logged.length >= target && logged.every((s) => !s.blowout);
      return { progress: logged.filter((s) => !s.blowout).length, done: ok };
    }
    case "weekend_clean": {
      const sat = shiftYMD(weekStart, 5);
      const sun = shiftYMD(weekStart, 6);
      const n = snaps.filter((s) => (s.date === sat || s.date === sun) && s.inTarget).length;
      return { progress: n, done: n >= 2 };
    }
    default:
      return { progress: 0, done: false };
  }
}

export interface QuestStatusDTO {
  id: string;
  weekStart: string;
  code: string;
  titleUk: string;
  description: string;
  kind: string;
  target: number;
  rewardCoins: number;
  progress: number;
  done: boolean;
  claimed: boolean;
}

export async function listQuestStatus(
  userId: string,
  weekStart?: string,
): Promise<{ weekStart: string; weekEnd: string; quests: QuestStatusDTO[]; granted: GrantedReward[] }> {
  const ws = weekStart ?? weekStartYMD();
  await ensureWeekQuests(ws);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetCalories: true },
  });
  const target = user?.targetCalories ?? 0;

  const quests = await prisma.weeklyQuest.findMany({
    where: { weekStart: ws, active: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const snaps = await weekSnapshots(userId, ws, target);
  const granted: GrantedReward[] = [];

  const out: QuestStatusDTO[] = [];
  for (const q of quests) {
    const { progress, done } = progressFor(q.kind as QuestKind, q.target, snaps, ws);
    const key = `quest:${ws}:${q.code}`;
    const existing = await prisma.rewardClaim.findUnique({
      where: { userId_key: { userId, key } },
    });
    let claimed = !!existing;

    if (done && !claimed && q.rewardCoins > 0) {
      await grant(userId, key, q.rewardCoins, `Квест: ${q.titleUk}`, granted);
      const again = await prisma.rewardClaim.findUnique({
        where: { userId_key: { userId, key } },
      });
      claimed = !!again;
    }

    out.push({
      id: q.id,
      weekStart: ws,
      code: q.code,
      titleUk: q.titleUk,
      description: q.description,
      kind: q.kind,
      target: q.target,
      rewardCoins: q.rewardCoins,
      progress: Math.min(progress, q.target),
      done,
      claimed,
    });
  }

  return {
    weekStart: ws,
    weekEnd: shiftYMD(ws, 6),
    quests: out,
    granted,
  };
}

/** Добити квести минулого тижня (якщо ще не забрали). */
export async function settleRecentQuests(userId: string): Promise<GrantedReward[]> {
  const thisWeek = weekStartYMD();
  const lastWeek = shiftYMD(thisWeek, -7);
  const a = await listQuestStatus(userId, lastWeek);
  const b = await listQuestStatus(userId, thisWeek);
  return [...a.granted, ...b.granted];
}
