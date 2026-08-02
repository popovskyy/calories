import { prisma } from "@/lib/prisma";
import {
  shiftYMD,
  todayYMD,
  weekDays,
  weekIndex,
  weekStartYMD,
} from "@/lib/date";
import { dayNetCalories } from "@/lib/day-totals";
import { calcMacroTargets } from "@/lib/calories";
import { grant, type GrantedReward } from "@/lib/reward-grant";
import { BLOWOUT_OVER, QUEST_TARGET_TOLERANCE, isInTargetFor } from "@/lib/economy";
import { isGoal, type Goal } from "@/lib/calories";
import { QUEST_REROLL_ITEM_ID } from "@/lib/items";

export { BLOWOUT_OVER, QUEST_TARGET_TOLERANCE };

/**
 * Єдине джерело правди «день у цілі»: і для квестів, і для денної монети.
 * Зона асиметрична й залежить від цілі — див. isInTargetFor в economy.ts.
 */
export function isInTarget(
  net: number,
  targetCalories: number,
  goal: Goal,
): boolean {
  return isInTargetFor(net, targetCalories, goal);
}

export type QuestKind =
  | "in_target_days"
  | "log_days"
  | "activity_days"
  | "dual_days"
  | "no_blowout"
  | "weekend_clean"
  | "week_balance"
  | "activity_minutes"
  | "burn_total"
  | "protein_days";

export interface QuestTemplate {
  code: string;
  titleUk: string;
  description: string;
  kind: QuestKind;
  target: number;
  rewardCoins: number;
  sortOrder: number;
}

/**
 * Пул квестів тижня — щотижня беремо 3 за ротацією.
 *
 * Ціни зведені в діапазон 60–200 (було 70–320): разом із новими джерелами
 * доходу старі 320 за один квест ламали баланс і дозволяли викупити
 * косметику швидше, ніж вона встигала стати бажаною.
 */
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
    rewardCoins: 200,
    sortOrder: 20,
  },
  {
    code: "log_6",
    titleUk: "Не пропускай",
    description: "Запиши їжу щонайменше 6 днів цього тижня",
    kind: "log_days",
    target: 6,
    rewardCoins: 60,
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
    description: "4 будь-які дні тижня: і їжа, і активність",
    kind: "dual_days",
    target: 4,
    rewardCoins: 120,
    sortOrder: 50,
  },
  {
    code: "no_chaos",
    titleUk: "Тримати оборону",
    description: "Жодного дня з перебором понад +15% від цілі (потрібні логи)",
    kind: "no_blowout",
    target: 5,
    rewardCoins: 110,
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
  {
    // Найважливіший новий тип: важлива СУМА за тиждень, а не кожен день окремо.
    // Дозволяє свідомо «витратити» суботу й компенсувати в неділю — саме те,
    // що рятує гравців, для яких щоденний ±5% нездоланний.
    code: "week_balance",
    titleUk: "Тижневий баланс",
    description: "Сума за тиждень не вища за суму норм. Один день можна витратити",
    kind: "week_balance",
    target: 6,
    rewardCoins: 160,
    sortOrder: 25,
  },
  {
    code: "marathon_150",
    titleUk: "Марафонець",
    description: "150 хвилин руху за тиждень",
    kind: "activity_minutes",
    target: 150,
    rewardCoins: 140,
    sortOrder: 45,
  },
  {
    code: "furnace_2500",
    titleUk: "Піч",
    description: "Спалити 2 500 ккал активністю за тиждень",
    kind: "burn_total",
    target: 2500,
    rewardCoins: 150,
    sortOrder: 47,
  },
  {
    code: "protein_5",
    titleUk: "Білковий тиждень",
    description: "5 днів із виконаною нормою білка",
    kind: "protein_days",
    target: 5,
    rewardCoins: 130,
    sortOrder: 55,
  },
];

/**
 * mulberry32 — маленький seeded PRNG із пристойним розподілом.
 *
 * Попередня формула shuffle була `j = (idx * 17 + i * 31) % (i + 1)`. Оскільки
 * `i ≡ −1 (mod i+1)`, вона згорталась до `j = (17·idx − 31) mod (i+1)`, тобто
 * до ОДНОГО числа, поділеного з остачею на різні модулі. Останні свопи (i=1..3),
 * які й формують початок масиву, майже не рухались — а `picked` бере саме
 * звідти. Наслідок: за 2 роки sniper_5 випадав 60 разів, а protein_5 і
 * marathon_150 — по 4. Половина пулу була мертвим контентом.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Детермінований набір квестів на тиждень. Експортовано заради тестів:
 * чесність ротації на око не перевіряється — саме так баг вище й прожив.
 */
export function seededPick(weekStart: string, count: number): QuestTemplate[] {
  const idx = weekIndex(weekStart);
  const rand = mulberry32(idx * 2654435761);
  const order = [...QUEST_POOL];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
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
  /** Хвилини активності за день — для марафонних квестів. */
  activityMinutes: number;
  /** Спалено ккал за день. */
  burned: number;
  /** Норма білка виконана. */
  proteinHit: boolean;
  /** Норма калорій цього гравця — щоб рахувати тижневий баланс. */
  targetCalories: number;
  /** День закритий — цифри вже не зміняться доїданням. */
  final: boolean;
}

/**
 * Квести, де важлива точність: нараховуємо лише за закритими днями.
 * Інакше можна «пройти крізь» ±5% зранку, зафіксувати прогрес і доїсти —
 * RewardClaim незворотний, тож нагороду вже не забрати назад.
 *
 * week_balance теж тут: сума за тиждень зростає з кожним прийомом їжі,
 * тож «зарахувати» її можна було б зранку, поки бюджет ще не витрачено.
 */
const FINAL_DAY_KINDS: ReadonlySet<QuestKind> = new Set<QuestKind>([
  "in_target_days",
  "no_blowout",
  "weekend_clean",
  "week_balance",
]);

async function weekSnapshots(
  userId: string,
  weekStart: string,
  targetCalories: number,
  proteinTarget: number,
  goal: Goal,
): Promise<DaySnap[]> {
  const today = todayYMD();
  const days = weekDays(weekStart).filter((d) => d <= today);
  const blow = targetCalories * (1 + BLOWOUT_OVER);

  const [totals, activities] = await Promise.all([
    Promise.all(days.map((d) => dayNetCalories(userId, d))),
    // Хвилини й ккал по днях одним запитом замість семи.
    prisma.activityLog.groupBy({
      by: ["date"],
      where: {
        userId,
        date: { in: days },
        status: { not: "cancelled" },
      },
      _sum: { durationMin: true, caloriesBurned: true },
    }),
  ]);

  const byDate = new Map(
    activities.map((a) => [
      a.date,
      { mins: a._sum.durationMin ?? 0, burned: a._sum.caloriesBurned ?? 0 },
    ]),
  );

  const snaps: DaySnap[] = [];
  for (const [i, date] of days.entries()) {
    const t = totals[i]!;
    const act = byDate.get(date) ?? { mins: 0, burned: 0 };
    const hasMeal = t.mealCount > 0;
    const inTarget = hasMeal && isInTarget(t.net, targetCalories, goal);
    const blowout = hasMeal && t.net > blow;
    snaps.push({
      date,
      mealCount: t.mealCount,
      activityCount: t.activityCount,
      net: t.net,
      inTarget,
      blowout,
      hasMeal,
      activityMinutes: act.mins,
      burned: act.burned,
      proteinHit: hasMeal && proteinTarget > 0 && t.protein >= proteinTarget,
      targetCalories,
      final: date < today,
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
      return { progress: n, done: n >= target };
    }
    case "week_balance": {
      // Сума net ≤ сума норм за залоговані дні. Гнучкість замість щоденної
      // точності: перебір у суботу можна компенсувати в неділю.
      const logged = snaps.filter((s) => s.hasMeal);
      const net = logged.reduce((s, d) => s + d.net, 0);
      const budget = logged.reduce((s, d) => s + d.targetCalories, 0);
      const ok = logged.length >= target && budget > 0 && net <= budget;
      return { progress: logged.length, done: ok };
    }
    case "activity_minutes": {
      const mins = snaps.reduce((s, d) => s + d.activityMinutes, 0);
      return { progress: mins, done: mins >= target };
    }
    case "burn_total": {
      const burned = snaps.reduce((s, d) => s + d.burned, 0);
      return { progress: burned, done: burned >= target };
    }
    case "protein_days": {
      const n = snaps.filter((s) => s.proteinHit).length;
      return { progress: n, done: n >= target };
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
  /** Квест замінено ре-ролом — назад уже не повернути. */
  rerolled: boolean;
}

/** Форма квеста, з якою працює listQuestStatus: рядок БД або підміна з пулу. */
type QuestLike = {
  id: string;
  code: string;
  titleUk: string;
  description: string;
  kind: string;
  target: number;
  rewardCoins: number;
  sortOrder: number;
  rerolled?: boolean;
};

/** meta ре-ролу: "<weekStart>:<oldCode>:<newCode>" */
function parseRerollMeta(meta: string | null): { old: string; next: string } | null {
  if (!meta) return null;
  const parts = meta.split(":");
  if (parts.length !== 3) return null;
  return { old: parts[1]!, next: parts[2]! };
}

/** Підставляє персональні заміни гравця замість спільних квестів тижня. */
async function applyRerolls(
  userId: string,
  weekStart: string,
  rows: QuestLike[],
): Promise<QuestLike[]> {
  const uses = await prisma.itemUse.findMany({
    where: { userId, itemId: QUEST_REROLL_ITEM_ID, meta: { startsWith: `${weekStart}:` } },
    select: { meta: true },
    orderBy: { createdAt: "asc" },
  });
  if (uses.length === 0) return rows;

  const swaps = new Map<string, string>();
  for (const u of uses) {
    const p = parseRerollMeta(u.meta);
    if (p) swaps.set(p.old, p.next);
  }

  return rows.map((q) => {
    // Ланцюжок замін: квест могли перекотити двічі.
    let code = q.code;
    const seen = new Set<string>();
    while (swaps.has(code) && !seen.has(code)) {
      seen.add(code);
      code = swaps.get(code)!;
    }
    if (code === q.code) return q;

    const tpl = QUEST_POOL.find((t) => t.code === code);
    if (!tpl) return q;
    return {
      id: q.id,
      code: tpl.code,
      titleUk: tpl.titleUk,
      description: tpl.description,
      kind: tpl.kind,
      target: tpl.target,
      rewardCoins: tpl.rewardCoins,
      sortOrder: q.sortOrder,
      rerolled: true,
    };
  });
}

/**
 * Обирає заміну для квеста: будь-який шаблон із пулу, якого немає серед
 * поточних. Детерміновано від (userId, weekStart, code), щоб повторний
 * запит не давав інший результат.
 */
export function pickReplacementQuest(
  userId: string,
  weekStart: string,
  oldCode: string,
  activeCodes: string[],
): QuestTemplate | null {
  const pool = QUEST_POOL.filter((t) => !activeCodes.includes(t.code));
  if (pool.length === 0) return null;

  let h = 0x811c9dc5;
  for (const ch of `${userId}|${weekStart}|${oldCode}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return pool[h % pool.length]!;
}

export async function listQuestStatus(
  userId: string,
  weekStart?: string,
): Promise<{ weekStart: string; weekEnd: string; quests: QuestStatusDTO[]; granted: GrantedReward[] }> {
  const ws = weekStart ?? weekStartYMD();
  await ensureWeekQuests(ws);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetCalories: true, weight: true, goal: true },
  });
  const target = user?.targetCalories ?? 0;
  const goal: Goal = isGoal(user?.goal ?? "") ? (user!.goal as Goal) : "maintain";
  const proteinTarget = user ? calcMacroTargets(target, user.weight).protein : 0;

  const rows = await prisma.weeklyQuest.findMany({
    where: { weekStart: ws, active: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  // WeeklyQuest спільний для всіх (його редагує адмінка), тож персональна
  // заміна живе окремо — у застосуваннях ре-ролу цього гравця.
  const quests = await applyRerolls(userId, ws, rows);

  const snaps = await weekSnapshots(userId, ws, target, proteinTarget, goal);
  const finalSnaps = snaps.filter((s) => s.final);
  const granted: GrantedReward[] = [];

  const keys = quests.map((q) => `quest:${ws}:${q.code}`);
  const claims = await prisma.rewardClaim.findMany({
    where: { userId, key: { in: keys } },
    select: { key: true },
  });
  const claimedKeys = new Set(claims.map((c) => c.key));

  const out: QuestStatusDTO[] = [];
  for (const [i, q] of quests.entries()) {
    const kind = q.kind as QuestKind;
    const key = keys[i]!;
    // Прогрес показуємо «живий» (з сьогоднішнім днем), платимо — за закритими.
    const { progress, done } = progressFor(kind, q.target, snaps, ws);
    // target <= 0 зробив би квест «виконаним» одразу — не платимо за таке.
    const payable =
      q.target > 0 &&
      (FINAL_DAY_KINDS.has(kind)
        ? progressFor(kind, q.target, finalSnaps, ws).done
        : done);

    let claimed = claimedKeys.has(key);

    if (payable && !claimed && q.rewardCoins > 0) {
      await grant(userId, key, q.rewardCoins, `Квест: ${q.titleUk}`, granted);
      claimed = true;
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
      rerolled: q.rerolled ?? false,
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
