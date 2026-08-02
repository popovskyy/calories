import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  fromYMD,
  humanDate,
  kyivHourNow,
  shiftYMD,
  shortDate,
  todayYMD,
  weekDays,
  weekStartYMD,
} from "@/lib/date";
import {
  generateDayAdvice,
  generateWeekAdvice,
  type AdviceMood,
  type WeekJourneyContext,
} from "@/lib/gemini-advice";
import { AiError } from "@/lib/ai-error";
import {
  GOAL_LABELS,
  calcMacroTargets,
  calcMaintenanceCalories,
  isGoal,
  isSex,
} from "@/lib/calories";
import { computeStreak } from "@/lib/streak";
import { computeForecast } from "@/lib/forecast";
import type { AdviceResponse } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Денний звіт (Пн–Сб) відкривається після 18:00 за Києвом. */
const UNLOCK_HOUR = 18;
/** Тижневий фідбек (неділя) — після 15:00; до того — «збір інфи». */
const WEEKLY_UNLOCK_HOUR = 15;

/**
 * Замок від паралельних генерацій.
 *
 * `upsert` дедуплікує вже ПІСЛЯ виклику моделі, тож два швидкі тапи на
 * «Дізнатись вердикт» (або подвійний запит із флакі-мережі) давали дві платні
 * генерації. Тепер рядок створюється ДО звернення до ШІ й позначається
 * `mood = "generating"`: другий запит натикається на unique-конфлікт і просто
 * чекає. Якщо процес помер, не дописавши текст, замок протухає за LOCK_TTL_MS.
 */
const GENERATING_MOOD = "generating";
const LOCK_TTL_MS = 2 * 60 * 1000;

/** Порожній рядок-заглушка: текст допишеться після відповіді моделі. */
function lockRow(mealCount: number) {
  return {
    headline: "",
    body: "",
    tip: "",
    mood: GENERATING_MOOD,
    mealCount,
  };
}

function isLocked(row: { mood: string }): boolean {
  return row.mood === GENERATING_MOOD;
}

/** Замок, який ніхто не дописав — попередній запит упав, можна перехопити. */
function isStaleLock(row: { mood: string; updatedAt: Date }): boolean {
  return isLocked(row) && Date.now() - row.updatedAt.getTime() > LOCK_TTL_MS;
}

/** Prisma P2002 — порушення unique-констрейнта, тобто хтось нас випередив. */
function isUniqueConflict(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "P2002"
  );
}

/** mood зберігається рядком — звужуємо на читанні з БД. */
function toMood(v: string): AdviceMood {
  return v === "good" || v === "over" ? v : "mixed";
}

/** morning | day | evening — на якому зрізі дня писався текст (діагностика). */
function dayPartNow(): string {
  const h = kyivHourNow();
  if (h < 12) return "morning";
  if (h < 18) return "day";
  return "evening";
}

function isSunday(ymd: string): boolean {
  return fromYMD(ymd).getUTCDay() === 0;
}

/**
 * GET /api/advice — звіт від ШІ, один раз на період, за запитом користувача.
 *
 * Пн–Сб: денний звіт після 18:00 (DailyAdvice за сьогодні).
 * Неділя: спершу тижневий фідбек після 15:00 (WeeklyAdvice за weekStart), а
 * коли він уже зібраний і настав вечір — звичайний денний звіт за неділю.
 *
 * Раніше неділя була сліпою плямою з обох боків: денний звіт за неділю не
 * генерувався ніколи, а тижневий писався о 15:00 разом із незакритим
 * недільним днем і назавжди осідав у кеші — недільна вечеря не потрапляла
 * нікуди. Тепер тижневий підбиває лише ЗАКРИТІ дні (Пн–Сб), а неділя
 * отримує свій денний звіт як будь-який інший день.
 *
 * До unlock — "locked". Після — якщо є їжа за період: "requestable", поки
 * користувач не натисне (`?force=1`). Результат кешується.
 */
export async function GET(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const force = new URL(request.url).searchParams.get("force") === "1";
  const userId = auth.session.userId;
  const date = todayYMD();

  if (isSunday(date)) {
    const weekly = await handleWeekly(userId, date, force);
    // Тижневий звіт має пріоритет, поки його не зібрано. Щойно він є —
    // ввечері неділя переходить у звичайний денний режим.
    if (!weekly.done || kyivHourNow() < UNLOCK_HOUR) return weekly.response;
  }
  return handleDaily(userId, date, force);
}

async function handleDaily(
  userId: string,
  date: string,
  force: boolean,
): Promise<NextResponse> {
  const cached = await prisma.dailyAdvice.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (cached && !isLocked(cached)) {
    return NextResponse.json({
      state: "ready",
      kind: "daily",
      date,
      headline: cached.headline,
      body: cached.body,
      tip: cached.tip,
      mood: toMood(cached.mood),
    } satisfies AdviceResponse);
  }
  if (cached && !isStaleLock(cached)) {
    // Паралельний запит уже генерує — клієнт опитує "locked" раз на хвилину
    // і підхопить готовий текст без повторного платного виклику.
    return NextResponse.json({
      state: "locked",
      kind: "daily",
    } satisfies AdviceResponse);
  }

  if (kyivHourNow() < UNLOCK_HOUR) {
    return NextResponse.json({
      state: "locked",
      kind: "daily",
    } satisfies AdviceResponse);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      goal: true,
      weight: true,
      height: true,
      birthYear: true,
      birthMonth: true,
      sex: true,
      targetCalories: true,
      meals: {
        where: { date, status: { not: "cancelled" } },
        orderBy: { createdAt: "asc" },
        select: {
          description: true,
          calories: true,
          protein: true,
          fats: true,
          carbs: true,
        },
      },
      activities: {
        where: { date, status: { not: "cancelled" } },
        select: { description: true, caloriesBurned: true },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }

  if (user.meals.length === 0) {
    return NextResponse.json({
      state: "no_meals",
      kind: "daily",
    } satisfies AdviceResponse);
  }

  if (!force) {
    return NextResponse.json({
      state: "requestable",
      kind: "daily",
    } satisfies AdviceResponse);
  }

  const totals = user.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fats: acc.fats + m.fats,
      carbs: acc.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fats: 0, carbs: 0 },
  );
  const burned = user.activities.reduce((s, a) => s + a.caloriesBurned, 0);
  const goal = isGoal(user.goal) ? user.goal : "maintain";
  const macros = calcMacroTargets(user.targetCalories, user.weight);
  const maintenance = calcMaintenanceCalories({
    birthYear: user.birthYear,
    birthMonth: user.birthMonth,
    sex: isSex(user.sex) ? user.sex : "male",
    weightKg: user.weight,
    heightCm: user.height,
  });

  // Займаємо слот до виклику моделі. Протухлий замок перехоплюємо, свіжий —
  // поважаємо: там працює паралельний запит.
  const lock = lockRow(user.meals.length);
  if (cached) {
    await prisma.dailyAdvice.update({
      where: { userId_date: { userId, date } },
      data: lock,
    });
  } else {
    try {
      await prisma.dailyAdvice.create({
        data: { userId, date, dayPart: dayPartNow(), ...lock },
      });
    } catch (e) {
      if (!isUniqueConflict(e)) throw e;
      return NextResponse.json({
        state: "locked",
        kind: "daily",
      } satisfies AdviceResponse);
    }
  }

  try {
    const advice = await generateDayAdvice({
      meals: user.meals,
      activities: user.activities,
      targetCalories: user.targetCalories,
      maintenanceCalories: maintenance,
      goal,
      totals: { ...totals, calories: totals.calories - burned },
      proteinTarget: macros.protein,
      goalLabel: GOAL_LABELS[goal],
      name: user.name,
    });

    await prisma.dailyAdvice.update({
      where: { userId_date: { userId, date } },
      data: {
        headline: advice.headline,
        body: advice.body,
        tip: advice.tip,
        mood: advice.mood,
        mealCount: user.meals.length,
        dayPart: dayPartNow(),
      },
    });

    return NextResponse.json({
      state: "ready",
      kind: "daily",
      date,
      ...advice,
    } satisfies AdviceResponse);
  } catch (e) {
    const status = e instanceof AiError ? e.status : 502;
    console.error("[advice]", e);
    // Знімаємо замок, інакше картка залипне в "locked" до кінця дня.
    await prisma.dailyAdvice
      .deleteMany({ where: { userId, date, mood: GENERATING_MOOD } })
      .catch(() => {});
    return NextResponse.json(
      { error: "Не вдалося зібрати звіт дня" },
      { status },
    );
  }
}

/**
 * `done: true` — тижневий звіт уже лежить у кеші (користувач його бачив).
 * Тільки в цьому разі неділя ввечері віддає далі денний звіт.
 */
interface WeeklyOutcome {
  done: boolean;
  response: NextResponse;
}

async function handleWeekly(
  userId: string,
  today: string,
  force: boolean,
): Promise<WeeklyOutcome> {
  const weekStart = weekStartYMD(today);

  const cached = await prisma.weeklyAdvice.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
  });
  if (cached && !isLocked(cached)) {
    return {
      done: true,
      response: NextResponse.json({
        state: "ready",
        kind: "weekly",
        date: weekStart,
        headline: cached.headline,
        body: cached.body,
        tip: cached.tip,
        mood: toMood(cached.mood),
      } satisfies AdviceResponse),
    };
  }
  if (cached && !isStaleLock(cached)) {
    return {
      done: false,
      response: NextResponse.json({
        state: "locked",
        kind: "weekly",
      } satisfies AdviceResponse),
    };
  }

  if (kyivHourNow() < WEEKLY_UNLOCK_HOUR) {
    return {
      done: false,
      response: NextResponse.json({
        state: "locked",
        kind: "weekly",
      } satisfies AdviceResponse),
    };
  }

  // Тільки ЗАКРИТІ дні: неділя ще триває, а звіт кешується назавжди — тягнути
  // в нього напівдень означало б заморозити недороблену цифру.
  const days = weekDays(weekStart).filter((d) => d < today);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      goal: true,
      weight: true,
      height: true,
      birthYear: true,
      birthMonth: true,
      sex: true,
      targetCalories: true,
      startWeight: true,
      targetWeight: true,
      startWeightDate: true,
      maxStreak: true,
      totalInTargetDays: true,
      meals: {
        where: { date: { in: days }, status: { not: "cancelled" } },
        orderBy: { createdAt: "asc" },
        select: {
          date: true,
          description: true,
          calories: true,
          protein: true,
          fats: true,
          carbs: true,
        },
      },
      activities: {
        where: { date: { in: days }, status: { not: "cancelled" } },
        select: { date: true, caloriesBurned: true },
      },
    },
  });
  if (!user) {
    return {
      done: false,
      response: NextResponse.json(
        { error: "Користувача не знайдено" },
        { status: 404 },
      ),
    };
  }

  if (user.meals.length === 0) {
    return {
      done: false,
      response: NextResponse.json({
        state: "no_meals",
        kind: "weekly",
      } satisfies AdviceResponse),
    };
  }

  if (!force) {
    return {
      done: false,
      response: NextResponse.json({
        state: "requestable",
        kind: "weekly",
      } satisfies AdviceResponse),
    };
  }

  const priorWeekStart = shiftYMD(weekStart, -7);
  const priorWeekDays = weekDays(priorWeekStart);

  const [
    { streak },
    loggedDayGroups,
    recentWeights,
    priorRows,
    priorMeals,
    priorActs,
    forecast,
  ] = await Promise.all([
    computeStreak(userId),
    prisma.mealLog.groupBy({
      by: ["date"],
      where: { userId, status: { not: "cancelled" } },
    }),
    prisma.weightLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 6,
      select: { date: true, weight: true },
    }),
    prisma.weeklyAdvice.findMany({
      // Недописані заглушки-замки в памʼять не тягнемо: порожній headline
      // у промпті виглядав би як «попередній вердикт був ніякий».
      where: { userId, weekStart: { lt: weekStart }, mood: { not: GENERATING_MOOD } },
      orderBy: { weekStart: "desc" },
      take: 3,
      select: {
        weekStart: true,
        headline: true,
        mood: true,
        tip: true,
      },
    }),
    prisma.mealLog.groupBy({
      by: ["date"],
      where: {
        userId,
        status: { not: "cancelled" },
        date: { in: priorWeekDays },
      },
      _sum: { calories: true },
    }),
    prisma.activityLog.groupBy({
      by: ["date"],
      where: {
        userId,
        status: { not: "cancelled" },
        date: { in: priorWeekDays },
      },
      _sum: { caloriesBurned: true },
    }),
    // Той самий прогноз, що бачить користувач на картці цілі — щоб ШІ не
    // виводив темп на око і не суперечив UI.
    computeForecast(userId),
  ]);

  let priorWeekAvgNet: number | null = null;
  if (priorMeals.length > 0) {
    const burnedByDate = new Map(
      priorActs.map((g) => [g.date, g._sum.caloriesBurned ?? 0]),
    );
    const sum = priorMeals.reduce((s, g) => {
      const net = (g._sum.calories ?? 0) - (burnedByDate.get(g.date) ?? 0);
      return s + net;
    }, 0);
    priorWeekAvgNet = Math.round(sum / priorMeals.length);
  }

  const journey: WeekJourneyContext = {
    currentWeight: user.weight,
    startWeight: user.startWeight,
    targetWeight: user.targetWeight,
    startWeightDate: user.startWeightDate,
    streak,
    maxStreak: user.maxStreak,
    inTargetDays: user.totalInTargetDays,
    daysLoggedTotal: loggedDayGroups.length,
    recentWeights,
    priorWeeks: priorRows.map((p) => ({
      weekStart: p.weekStart,
      headline: p.headline,
      mood: toMood(p.mood),
      tip: p.tip,
    })),
    priorWeekAvgNet,
    forecast: forecast.configured
      ? {
          paceStatus: forecast.paceStatus,
          projectedDate: forecast.projectedDate,
          daysLeft: forecast.daysLeft,
          trendKgPerWeek: forecast.trendKgPerWeek,
          expectedWeight: forecast.expectedWeight,
          lastWeighInDate: forecast.lastWeighInDate,
        }
      : null,
  };

  const byDay = new Map<
    string,
    {
      calories: number;
      protein: number;
      fats: number;
      carbs: number;
      mealsCount: number;
      burned: number;
      mealHints: string[];
    }
  >();
  for (const d of days) {
    byDay.set(d, {
      calories: 0,
      protein: 0,
      fats: 0,
      carbs: 0,
      mealsCount: 0,
      burned: 0,
      mealHints: [],
    });
  }
  for (const m of user.meals) {
    const row = byDay.get(m.date);
    if (!row) continue;
    row.calories += m.calories;
    row.protein += m.protein;
    row.fats += m.fats;
    row.carbs += m.carbs;
    row.mealsCount += 1;
    if (row.mealHints.length < 4) row.mealHints.push(m.description);
  }
  for (const a of user.activities) {
    const row = byDay.get(a.date);
    if (!row) continue;
    row.burned += a.caloriesBurned;
  }

  const goal = isGoal(user.goal) ? user.goal : "maintain";
  const macros = calcMacroTargets(user.targetCalories, user.weight);
  const maintenance = calcMaintenanceCalories({
    birthYear: user.birthYear,
    birthMonth: user.birthMonth,
    sex: isSex(user.sex) ? user.sex : "male",
    weightKg: user.weight,
    heightCm: user.height,
  });
  const weekEnd = days[days.length - 1] ?? today;
  const weekLabel = `${shortDate(weekStart)} – ${shortDate(weekEnd)}`;

  const lock = lockRow(user.meals.length);
  if (cached) {
    await prisma.weeklyAdvice.update({
      where: { userId_weekStart: { userId, weekStart } },
      data: lock,
    });
  } else {
    try {
      await prisma.weeklyAdvice.create({ data: { userId, weekStart, ...lock } });
    } catch (e) {
      if (!isUniqueConflict(e)) throw e;
      return {
        done: false,
        response: NextResponse.json({
          state: "locked",
          kind: "weekly",
        } satisfies AdviceResponse),
      };
    }
  }

  try {
    const advice = await generateWeekAdvice({
      days: days.map((d) => {
        const row = byDay.get(d)!;
        return {
          date: d,
          label: humanDate(d),
          calories: row.calories - row.burned,
          protein: Math.round(row.protein),
          fats: Math.round(row.fats),
          carbs: Math.round(row.carbs),
          mealsCount: row.mealsCount,
          burned: row.burned,
          mealHints: row.mealHints,
        };
      }),
      targetCalories: user.targetCalories,
      maintenanceCalories: maintenance,
      goal,
      proteinTarget: macros.protein,
      goalLabel: GOAL_LABELS[goal],
      name: user.name,
      weekLabel,
      journey,
    });

    await prisma.weeklyAdvice.update({
      where: { userId_weekStart: { userId, weekStart } },
      data: {
        headline: advice.headline,
        body: advice.body,
        tip: advice.tip,
        mood: advice.mood,
        mealCount: user.meals.length,
      },
    });

    return {
      done: false,
      response: NextResponse.json({
        state: "ready",
        kind: "weekly",
        date: weekStart,
        ...advice,
      } satisfies AdviceResponse),
    };
  } catch (e) {
    const status = e instanceof AiError ? e.status : 502;
    console.error("[advice:week]", e);
    await prisma.weeklyAdvice
      .deleteMany({ where: { userId, weekStart, mood: GENERATING_MOOD } })
      .catch(() => {});
    return {
      done: false,
      response: NextResponse.json(
        { error: "Не вдалося зібрати тижневий фідбек" },
        { status },
      ),
    };
  }
}
