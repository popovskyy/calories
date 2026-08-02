/**
 * Прогноз ваги з журналу: maintenance − net за дні з їжею (без сьогодні),
 * плюс ETA до цілі за фактичним темпом зважувань.
 *
 * Важливо:
 * - `expectedWeight` — вага ЗА КАЛОРІЯМИ від старту, не «завтрашній прогноз».
 * - Вердикт темпу (`calorieStance`) — за СУМОЮ vs денна ціль і підтримка,
 *   щоб дні з перебором не маскувались середнім %.
 * - ETA рахується нахилом усіх зважувань у вікні (`weightTrend`), а не двома
 *   точками на календарі: інакше пауза в зважуваннях сама собою відсувала дату.
 */

import { prisma } from "@/lib/prisma";
import {
  calcMaintenanceCalories,
  calcTargetCalories,
  classifyLedgerStance,
  isGoal,
  isSex,
  pctVsMaintenance,
  plannedDeficitPctFromTargets,
  KCAL_PER_KG,
  type CalorieStance,
  type Sex,
} from "@/lib/calories";
import { shiftYMD, todayYMD } from "@/lib/date";
import {
  TREND_WINDOW_DAYS,
  daysBetweenYMD,
  weightTrend,
} from "@/lib/weight-trend";
import type { ForecastResponse } from "@/lib/types";

const DEAD_ZONE_KG = 0.3;
/**
 * Нижче цієї частки підтримки день виглядає недозаписаним, а не голодним:
 * одне яблуко в журналі дало б ≈ −1900 ккал «дефіциту» і потягло б
 * expectedWeight у вигадану вагу. Такі дні не рахуємо взагалі.
 */
const MIN_PLAUSIBLE_LOG_RATIO = 0.35;
/** Далі за це ETA — вже не прогноз, а знущання; вважаємо, що темп не веде. */
const MAX_PROJECTION_DAYS = 3 * 365;

export async function computeForecast(userId: string): Promise<ForecastResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      weight: true,
      height: true,
      birthYear: true,
      birthMonth: true,
      sex: true,
      goal: true,
      targetCalories: true,
      targetWeight: true,
      startWeight: true,
      startWeightDate: true,
    },
  });

  if (!user) {
    return emptyForecast();
  }

  const configured =
    user.targetWeight != null &&
    user.startWeight != null &&
    !!user.startWeightDate;

  if (!configured) {
    return {
      ...emptyForecast(),
      configured: false,
      startWeight: user.startWeight,
      startWeightDate: user.startWeightDate,
      currentWeight: user.weight,
      targetWeight: user.targetWeight,
    };
  }

  const startWeight = user.startWeight!;
  const startWeightDate = user.startWeightDate!;
  const targetWeight = user.targetWeight!;
  const currentWeight = user.weight;
  const today = todayYMD();
  const sex: Sex = isSex(user.sex) ? user.sex : "male";
  const goal = isGoal(user.goal) ? user.goal : "maintain";

  const maintenance = calcMaintenanceCalories({
    birthYear: user.birthYear,
    birthMonth: user.birthMonth,
    sex,
    weightKg: user.weight,
    heightCm: user.height,
  });

  const target =
    user.targetCalories > 0
      ? user.targetCalories
      : calcTargetCalories({
          birthYear: user.birthYear,
          birthMonth: user.birthMonth,
          sex,
          weightKg: user.weight,
          heightCm: user.height,
          goal,
        }).targetCalories;

  // Найраніша дата, потрібна хоч комусь: опорам ваги — від старту цілі,
  // тренду — на всю глибину його вікна. YMD-рядки порівнюються лексикографічно.
  const trendFrom = shiftYMD(today, -TREND_WINDOW_DAYS);
  const weighInsFrom = startWeightDate < trendFrom ? startWeightDate : trendFrom;

  const [mealGroups, activityGroups, weighIns] = await Promise.all([
    prisma.mealLog.groupBy({
      by: ["date"],
      where: {
        userId,
        status: { not: "cancelled" },
        date: { gte: startWeightDate, lt: today },
      },
      _sum: { calories: true },
    }),
    prisma.activityLog.groupBy({
      by: ["date"],
      where: {
        userId,
        status: { not: "cancelled" },
        date: { gte: startWeightDate, lt: today },
      },
      _sum: { caloriesBurned: true },
    }),
    prisma.weightLog.findMany({
      // Ширше за startWeightDate: темп ваги — фізична властивість тіла, а не
      // цілі. Якщо ціль поставили вчора, а на ваги людина стає місяць, темп
      // усе одно відомий; обрізання по старту цілі вдавало б, що даних нема.
      where: { userId, date: { gte: weighInsFrom } },
      orderBy: { date: "asc" },
      select: { date: true, weight: true },
    }),
  ]);

  const burnedByDate = new Map(
    activityGroups.map((g) => [g.date, g._sum.caloriesBurned ?? 0]),
  );

  /**
   * Вага на дату — інтерполяція між зважуваннями. Потрібна, щоб підтримка в
   * калорійному треку рахувалась від ваги ТОГО дня: інакше в людини, яка
   * скинула 10 кг, увесь минулий період оцінювався б за сьогоднішнім (нижчим)
   * TDEE, і минулі дефіцити виглядали б меншими, ніж були.
   */
  const anchors = buildWeightAnchors(
    startWeightDate,
    startWeight,
    // Саме тут — лише від старту цілі: калорійний трек рахується від неї,
    // і зважування «до» не мають зсувати опори всередині періоду.
    weighIns.filter((w) => w.date >= startWeightDate),
    today,
    currentWeight,
  );
  const maintenanceAt = (date: string) =>
    calcMaintenanceCalories({
      birthYear: user.birthYear,
      birthMonth: user.birthMonth,
      sex,
      weightKg: weightAt(anchors, date),
      heightCm: user.height,
    });

  let deficitSum = 0;
  let netSum = 0;
  let balanceVsTarget = 0;
  let balanceVsMaintenance = 0;
  let daysOverTarget = 0;
  let daysOverMaintenance = 0;
  let loggedDays = 0;
  let skippedDays = 0;

  for (const g of mealGroups) {
    const consumed = g._sum.calories ?? 0;
    const dayMaintenance = maintenanceAt(g.date);

    if (consumed < dayMaintenance * MIN_PLAUSIBLE_LOG_RATIO) {
      skippedDays += 1;
      continue;
    }

    const burned = burnedByDate.get(g.date) ?? 0;
    const net = consumed - burned;
    loggedDays += 1;
    // Фізика ваги — відносно підтримки (TDEE) того дня, не денної цілі.
    deficitSum += dayMaintenance - net;
    netSum += net;
    // Вердикт темпу порівнюється з сьогоднішньою підтримкою — тією самою, що
    // потім піде в classifyLedgerStance і в промпт ШІ.
    balanceVsTarget += net - target;
    balanceVsMaintenance += net - maintenance;
    if (net > target) daysOverTarget += 1;
    if (net > maintenance) daysOverMaintenance += 1;
  }

  const totalDays = Math.max(0, daysBetweenYMD(startWeightDate, today));
  const expectedWeight =
    Math.round((startWeight - deficitSum / KCAL_PER_KG) * 10) / 10;
  /** Фактична зміна ваги від старту: <0 — схудли, >0 — набрали. */
  const deltaActual = Math.round((currentWeight - startWeight) * 10) / 10;

  let avgNetKcal: number | null = null;
  let avgDeficitPct: number | null = null;
  let calorieStance: ForecastResponse["calorieStance"] = "unknown";
  const planned = plannedDeficitPctFromTargets(maintenance, target);

  let balanceVsTargetKcal: number | null = null;
  let balanceVsMaintenanceKcal: number | null = null;

  if (loggedDays > 0) {
    avgNetKcal = Math.round(netSum / loggedDays);
    avgDeficitPct = pctVsMaintenance(avgNetKcal, maintenance);
    balanceVsTargetKcal = Math.round(balanceVsTarget);
    balanceVsMaintenanceKcal = Math.round(balanceVsMaintenance);
    calorieStance = classifyLedgerStance({
      balanceVsTarget,
      balanceVsMaintenance,
      loggedDays,
      daysOverTarget,
      target,
      maintenance,
      goal,
    }) satisfies CalorieStance;
  }

  // ETA до цілі за фактичним темпом зважувань (не за калорійним треком).
  const trend = weightTrend(weighIns, today);
  const trendKgPerWeek =
    trend.ratePerDay == null
      ? null
      : Math.round(trend.ratePerDay * 7 * 100) / 100;

  let projectedDate: string | null = null;
  let daysLeft: number | null = null;
  let paceStatus: ForecastResponse["paceStatus"] = "unknown";

  const remainingKg = Math.round((targetWeight - currentWeight) * 10) / 10;
  if (Math.abs(remainingKg) <= DEAD_ZONE_KG) {
    projectedDate = today;
    daysLeft = 0;
    paceStatus = "progressing";
  } else if (trend.stale) {
    // Не «повільний темп», а відсутні свіжі дані — це різні повідомлення.
    paceStatus = "stale";
  } else if (trend.ratePerDay == null) {
    paceStatus = "unknown";
  } else {
    const rate = trend.ratePerDay;
    const progressing = rate !== 0 && Math.sign(rate) === Math.sign(remainingKg);
    const daysToGoal = progressing ? Math.round(remainingKg / rate) : null;
    if (daysToGoal != null && daysToGoal <= MAX_PROJECTION_DAYS) {
      daysLeft = Math.max(0, daysToGoal);
      projectedDate = shiftYMD(today, daysLeft);
      paceStatus = "progressing";
    } else {
      paceStatus = "stalled";
    }
  }

  return {
    configured: true,
    startWeight,
    startWeightDate,
    currentWeight,
    targetWeight,
    expectedWeight,
    deltaActual,
    projectedDate,
    daysLeft,
    loggedDays,
    totalDays,
    skippedDays,
    paceStatus,
    trendKgPerWeek,
    lastWeighInDate: trend.lastDate,
    weighInCount: trend.samples,
    trendSpanDays: trend.spanDays,
    maintenanceKcal: maintenance,
    targetKcal: target,
    avgNetKcal,
    balanceVsTargetKcal,
    balanceVsMaintenanceKcal,
    daysOverTarget,
    daysOverMaintenance,
    avgDeficitPct,
    plannedDeficitPct: planned,
    calorieStance,
  };
}

interface WeightAnchor {
  date: string;
  weight: number;
}

/**
 * Опорні точки ваги: старт + усі зважування + сьогоднішня вага з профілю.
 * Дублікати дат схлопуються (пізніший запис перемагає).
 */
function buildWeightAnchors(
  startDate: string,
  startWeight: number,
  weighIns: readonly WeightAnchor[],
  today: string,
  currentWeight: number,
): WeightAnchor[] {
  const byDate = new Map<string, number>();
  byDate.set(startDate, startWeight);
  for (const w of weighIns) byDate.set(w.date, w.weight);
  if (!byDate.has(today)) byDate.set(today, currentWeight);

  return [...byDate.entries()]
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Лінійна інтерполяція між сусідніми опорами; поза межами — крайнє значення. */
function weightAt(anchors: readonly WeightAnchor[], date: string): number {
  const first = anchors[0]!;
  const last = anchors[anchors.length - 1]!;
  if (date <= first.date) return first.weight;
  if (date >= last.date) return last.weight;

  for (let i = 1; i < anchors.length; i++) {
    const hi = anchors[i]!;
    if (date > hi.date) continue;
    const lo = anchors[i - 1]!;
    const span = daysBetweenYMD(lo.date, hi.date);
    if (span <= 0) return hi.weight;
    const offset = daysBetweenYMD(lo.date, date);
    return lo.weight + ((hi.weight - lo.weight) * offset) / span;
  }
  return last.weight;
}

function emptyForecast(): ForecastResponse {
  return {
    configured: false,
    startWeight: null,
    startWeightDate: null,
    currentWeight: null,
    targetWeight: null,
    expectedWeight: null,
    deltaActual: null,
    projectedDate: null,
    daysLeft: null,
    loggedDays: 0,
    totalDays: 0,
    skippedDays: 0,
    paceStatus: "unknown",
    trendKgPerWeek: null,
    lastWeighInDate: null,
    weighInCount: 0,
    trendSpanDays: 0,
    maintenanceKcal: null,
    targetKcal: null,
    avgNetKcal: null,
    balanceVsTargetKcal: null,
    balanceVsMaintenanceKcal: null,
    daysOverTarget: 0,
    daysOverMaintenance: 0,
    avgDeficitPct: null,
    plannedDeficitPct: null,
    calorieStance: "unknown",
  };
}
