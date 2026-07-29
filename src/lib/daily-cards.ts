import { prisma } from "@/lib/prisma";
import { kyivMinutesOf, shiftYMD, todayYMD, weekStartYMD } from "@/lib/date";
import { calcMacroTargets } from "@/lib/calories";
import { grant, type GrantedReward } from "@/lib/reward-grant";
import {
  DAILY_CARDS_PER_DAY,
  DAILY_CARD_REWARDS,
  SETTLE_LOOKBACK_DAYS,
  STREAK_CARDS_COMBO_COINS,
  STREAK_CARDS_COMBO_MIN_STREAK,
} from "@/lib/economy";
import { CARD_REROLL_ITEM_ID } from "@/lib/items";
import { computeStreak } from "@/lib/streak";

/**
 * Щоденні картки — змінний шар, якого досі бракувало.
 *
 * Єдина щоденна дія раніше була «запиши їжу → 5 монет». Незмінна нагорода
 * перестає працювати десь за два тижні (габітуація), і саме тут гравці
 * втрачали інтерес. Дві різні картки щодня повертають непередбачуваність.
 *
 * Картки генеруються детерміновано з (userId + date), як seededPick у
 * quests.ts, тож у БД не потрібна жодна таблиця згенерованого контенту —
 * зберігаємо тільки факт нарахування в RewardClaim.
 */

export type CardKind =
  | "protein_morning"
  | "meal_count"
  | "early_finish"
  | "activity_minutes"
  | "clean_deficit"
  | "protein_goal"
  | "burn_amount"
  | "photo_proof"
  | "move_after_meal"
  | "early_start"
  | "macro_trio"
  | "two_meals_spread";

export interface DailyCardDef {
  code: string;
  kind: CardKind;
  titleUk: string;
  /** Коротко й із характером — це не медичний припис, а виклик дня. */
  description: string;
  icon: string;
  /** Поріг: грами, хвилини, кількість, ккал або хвилини від опівночі. */
  target: number;
}

export const DAILY_CARD_POOL: DailyCardDef[] = [
  {
    code: "protein_morning",
    kind: "protein_morning",
    titleUk: "Білковий старт",
    description: "Дай тілу паливо до полудня: 30 г білка",
    icon: "🌅",
    target: 30,
  },
  {
    code: "meal_count",
    kind: "meal_count",
    titleUk: "Повна розвідка",
    description: "Три окремі записи їжі — жодних білих плям",
    icon: "🍽",
    target: 3,
  },
  {
    code: "early_finish",
    kind: "early_finish",
    titleUk: "Ранній фініш",
    description: "Закрий кухню до 20:00",
    icon: "🌙",
    target: 20 * 60,
  },
  {
    code: "activity_20",
    kind: "activity_minutes",
    titleUk: "Ноги в руки",
    description: "20 хвилин руху — будь-якого",
    icon: "👟",
    target: 20,
  },
  {
    code: "clean_deficit",
    kind: "clean_deficit",
    titleUk: "Чистий дефіцит",
    description: "Нижче норми, але не голодуючи (до −300 ккал)",
    icon: "⚖️",
    target: 300,
  },
  {
    code: "protein_goal",
    kind: "protein_goal",
    titleUk: "Білкова ціль",
    description: "Добери денну норму білка повністю",
    icon: "💪",
    target: 0,
  },
  {
    code: "burn_250",
    kind: "burn_amount",
    titleUk: "Спалити 250",
    description: "250 ккал активністю. Один рішучий вихід",
    icon: "🔥",
    target: 250,
  },
  {
    code: "photo_proof",
    kind: "photo_proof",
    titleUk: "Доказ",
    description: "Один запис із фото — очі не брешуть",
    icon: "📸",
    target: 1,
  },
  {
    code: "move_after_meal",
    kind: "move_after_meal",
    titleUk: "Після трапези",
    description: "Рух після останнього прийому їжі",
    icon: "🚶",
    target: 1,
  },
  {
    code: "early_start",
    kind: "early_start",
    titleUk: "Дисципліна ранку",
    description: "Перший запис до 10:00",
    icon: "⏰",
    target: 10 * 60,
  },
  {
    code: "macro_trio",
    kind: "macro_trio",
    titleUk: "Повна тарілка",
    description: "Один запис із білком, жирами й вуглеводами",
    icon: "🥗",
    target: 1,
  },
  {
    code: "two_meals_spread",
    kind: "two_meals_spread",
    titleUk: "Дві хвилі",
    description: "Два записи з паузою ≥3 години між ними",
    icon: "⏳",
    target: 2,
  },
];

/** Простий детермінований хеш рядка (FNV-1a). */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Дві картки дня. Детерміновано з (userId, date, rerolls) — тому й перезапуск
 * сервера, і паралельні запити дають однаковий набір.
 */
export function pickDailyCards(
  userId: string,
  date: string,
  rerolls = 0,
): DailyCardDef[] {
  const seed = hashString(`${userId}|${date}|${rerolls}`);
  const order = [...DAILY_CARD_POOL];
  for (let i = order.length - 1; i > 0; i--) {
    const j = (seed + i * 2654435761) % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.slice(0, DAILY_CARDS_PER_DAY);
}

/** Нагорода за слотом: перша картка легша, друга — вагоміша. */
export function cardReward(slot: number): number {
  return DAILY_CARD_REWARDS[slot] ?? DAILY_CARD_REWARDS[0]!;
}

interface DayRaw {
  meals: {
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
    imageUrl: string | null;
    createdAt: Date;
  }[];
  activities: { caloriesBurned: number; durationMin: number | null; createdAt: Date }[];
  targetCalories: number;
  weight: number;
}

/**
 * Сирі записи дня з часом створення.
 *
 * Навмисно не через dayNetCalories: тамтешній DayTotals — це агрегати без
 * createdAt, а половині карток потрібен саме час («до 12:00», «після їжі»).
 */
async function loadDayRaw(userId: string, date: string): Promise<DayRaw | null> {
  const [user, meals, activities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { targetCalories: true, weight: true },
    }),
    prisma.mealLog.findMany({
      where: { userId, date, status: { not: "cancelled" } },
      select: { calories: true, protein: true, fats: true, carbs: true, imageUrl: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activityLog.findMany({
      where: { userId, date, status: { not: "cancelled" } },
      select: { caloriesBurned: true, durationMin: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!user) return null;
  return {
    meals,
    activities,
    targetCalories: user.targetCalories,
    weight: user.weight,
  };
}

/** Прогрес по картці: скільки набрано з потрібного. */
export function evaluateCard(
  def: DailyCardDef,
  day: DayRaw,
): { progress: number; target: number; done: boolean } {
  const net =
    day.meals.reduce((s, m) => s + m.calories, 0) -
    day.activities.reduce((s, a) => s + a.caloriesBurned, 0);

  switch (def.kind) {
    case "protein_morning": {
      const p = day.meals
        .filter((m) => kyivMinutesOf(m.createdAt) < 12 * 60)
        .reduce((s, m) => s + m.protein, 0);
      return { progress: p, target: def.target, done: p >= def.target };
    }
    case "meal_count": {
      const n = day.meals.length;
      return { progress: n, target: def.target, done: n >= def.target };
    }
    case "early_finish": {
      // Виконано лише за наявності їжі: порожній день не є «раннім фінішем».
      if (day.meals.length === 0) return { progress: 0, target: 1, done: false };
      const last = Math.max(...day.meals.map((m) => kyivMinutesOf(m.createdAt)));
      const ok = last < def.target;
      return { progress: ok ? 1 : 0, target: 1, done: ok };
    }
    case "activity_minutes": {
      const mins = day.activities.reduce((s, a) => s + (a.durationMin ?? 0), 0);
      return { progress: mins, target: def.target, done: mins >= def.target };
    }
    case "clean_deficit": {
      if (day.meals.length === 0 || day.targetCalories <= 0) {
        return { progress: 0, target: 1, done: false };
      }
      const gap = day.targetCalories - net;
      const ok = gap > 0 && gap <= def.target;
      return { progress: ok ? 1 : 0, target: 1, done: ok };
    }
    case "protein_goal": {
      const goal = calcMacroTargets(day.targetCalories, day.weight).protein;
      const p = day.meals.reduce((s, m) => s + m.protein, 0);
      return { progress: p, target: goal, done: goal > 0 && p >= goal };
    }
    case "burn_amount": {
      const burned = day.activities.reduce((s, a) => s + a.caloriesBurned, 0);
      return { progress: burned, target: def.target, done: burned >= def.target };
    }
    case "photo_proof": {
      const n = day.meals.filter((m) => !!m.imageUrl).length;
      return { progress: n, target: def.target, done: n >= def.target };
    }
    case "move_after_meal": {
      if (day.meals.length === 0 || day.activities.length === 0) {
        return { progress: 0, target: 1, done: false };
      }
      const lastMeal = Math.max(...day.meals.map((m) => m.createdAt.getTime()));
      const ok = day.activities.some((a) => a.createdAt.getTime() > lastMeal);
      return { progress: ok ? 1 : 0, target: 1, done: ok };
    }
    case "early_start": {
      if (day.meals.length === 0) return { progress: 0, target: 1, done: false };
      const first = Math.min(...day.meals.map((m) => kyivMinutesOf(m.createdAt)));
      const ok = first < def.target;
      return { progress: ok ? 1 : 0, target: 1, done: ok };
    }
    case "macro_trio": {
      const ok = day.meals.some(
        (m) => m.protein > 0 && m.fats > 0 && m.carbs > 0,
      );
      return { progress: ok ? 1 : 0, target: 1, done: ok };
    }
    case "two_meals_spread": {
      if (day.meals.length < 2) {
        return { progress: day.meals.length, target: 2, done: false };
      }
      const times = day.meals.map((m) => m.createdAt.getTime()).sort((a, b) => a - b);
      const gapOk = times.some((t, i) => i > 0 && t - times[i - 1]! >= 3 * 60 * 60 * 1000);
      return {
        progress: gapOk ? 2 : 1,
        target: 2,
        done: gapOk,
      };
    }
    default:
      return { progress: 0, target: def.target, done: false };
  }
}

export interface DailyCardDTO {
  code: string;
  titleUk: string;
  description: string;
  icon: string;
  slot: number;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
  rewardCoins: number;
}

/** Скільки разів гравець уже перетягував картки цього дня. */
async function rerollCount(userId: string, date: string): Promise<number> {
  return prisma.itemUse.count({
    where: { userId, itemId: CARD_REROLL_ITEM_ID, date },
  });
}

/**
 * Картки дня зі статусом. Нараховує одразу при читанні — так само, як це
 * робить listQuestStatus, тож окремої кнопки «забрати» не потрібно.
 *
 * Картки безпечно платити «наживо», без правила закритого дня: усі умови
 * монотонні (з'їв білок — з'їв, пройшов 20 хв — пройшов) і доїданням
 * увечері їх не скасувати. Винятки — clean_deficit / early_finish /
 * move_after_meal: їх можна «скасувати» пізнішим записом, тому платимо
 * лише за закритим днем.
 */
const FINAL_DAY_KINDS: ReadonlySet<CardKind> = new Set<CardKind>([
  "clean_deficit",
  "early_finish",
  "move_after_meal",
]);

/** Ключ RewardClaim: дата + reroll-індекс + код — інакше ре-рол дає повторну виплату. */
export function dailyCardClaimKey(
  date: string,
  rerolls: number,
  code: string,
): string {
  return `dc:${date}:r${rerolls}:${code}`;
}

export async function listDailyCards(
  userId: string,
  date: string = todayYMD(),
  opts: { grant?: boolean } = {},
): Promise<{ date: string; cards: DailyCardDTO[]; granted: GrantedReward[] }> {
  const allowGrant = opts.grant !== false;
  const rerolls = await rerollCount(userId, date);
  const defs = pickDailyCards(userId, date, rerolls);
  const day = await loadDayRaw(userId, date);
  const granted: GrantedReward[] = [];

  if (!day) return { date, cards: [], granted };

  const keys = defs.map((d) => dailyCardClaimKey(date, rerolls, d.code));
  // Старий формат `dc:date:code` — щоб після деплою не виплатити вдруге.
  const legacyKeys = defs.map((d) => `dc:${date}:${d.code}`);
  const claims = await prisma.rewardClaim.findMany({
    where: { userId, key: { in: [...keys, ...legacyKeys] } },
    select: { key: true, coins: true },
  });
  const claimedCoins = new Map(claims.map((c) => [c.key, c.coins]));

  const isClosed = date < todayYMD();
  const cards: DailyCardDTO[] = [];

  for (const [slot, def] of defs.entries()) {
    const { progress, target, done } = evaluateCard(def, day);
    const key = keys[slot]!;
    const legacyKey = legacyKeys[slot]!;
    const baseCoins = cardReward(slot);
    const isFinalKind = FINAL_DAY_KINDS.has(def.kind);
    const showFinalState = !isFinalKind || isClosed;
    const payable = done && showFinalState;

    const priorCoins = claimedCoins.get(key) ?? claimedCoins.get(legacyKey);
    let isClaimed = priorCoins !== undefined;
    let rewardCoins = priorCoins ?? baseCoins;
    if (allowGrant && payable && !isClaimed) {
      const before = granted.length;
      await grant(userId, key, baseCoins, `Картка дня: ${def.titleUk}`, granted);
      isClaimed = true;
      const just = granted[granted.length - 1];
      if (just && granted.length > before) rewardCoins = just.coins;
    }

    cards.push({
      code: def.code,
      titleUk: def.titleUk,
      description: def.description,
      icon: def.icon,
      slot,
      // Для "final day" карток показуємо прогрес/галочку лише після закриття дня,
      // інакше UI виглядає як "зараховано" ще до 20:00/закриття кухні.
      progress: Math.min(showFinalState ? progress : 0, target),
      target,
      done: payable,
      claimed: isClaimed,
      rewardCoins,
    });
  }

  return { date, cards, granted };
}

/** Добиває картки за сьогодні й останні закриті дні (виклик після запису їжі). */
export async function settleDailyCards(userId: string): Promise<GrantedReward[]> {
  const today = todayYMD();
  const out: GrantedReward[] = [];
  for (let i = 0; i <= SETTLE_LOOKBACK_DAYS; i++) {
    const { granted } = await listDailyCards(userId, shiftYMD(today, -i));
    out.push(...granted);
  }
  out.push(...(await settleStreakCardsCombo(userId, today)));
  return out;
}

/**
 * Стрік × обидві картки дня — рідкісний тижневий бонус (не щоденний spam).
 */
async function settleStreakCardsCombo(
  userId: string,
  today: string,
): Promise<GrantedReward[]> {
  const out: GrantedReward[] = [];
  const { streak } = await computeStreak(userId);
  if (streak < STREAK_CARDS_COMBO_MIN_STREAK) return out;

  const { cards } = await listDailyCards(userId, today);
  if (cards.length < DAILY_CARDS_PER_DAY) return out;
  if (!cards.every((c) => c.claimed)) return out;

  const week = weekStartYMD(today);
  await grant(
    userId,
    `streak_cards:${week}`,
    STREAK_CARDS_COMBO_COINS,
    "Комбо: стрік × картки дня",
    out,
  );
  return out;
}
