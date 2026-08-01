/**
 * Прогноз ваги з журналу: maintenance − net за дні з їжею (без сьогодні),
 * плюс ETA до цілі за фактичним темпом зважувань.
 *
 * Важливо:
 * - `expectedWeight` — вага ЗА КАЛОРІЯМИ від старту, не «завтрашній прогноз».
 * - Вердикт темпу (`calorieStance`) — за СУМОЮ vs денна ціль і підтримка,
 *   щоб дні з перебором не маскувались середнім %.
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
} from "@/lib/calories";
import { shiftYMD, todayYMD } from "@/lib/date";
import type { ForecastResponse } from "@/lib/types";

const DEAD_ZONE_KG = 0.3;
/** Мінімум днів історії, щоб довіряти фактичному темпу зважувань. */
const MIN_DAYS_FOR_PROJECTION = 3;

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
  const sex = isSex(user.sex) ? user.sex : "male";
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

  const [mealGroups, activityGroups] = await Promise.all([
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
  ]);

  const burnedByDate = new Map(
    activityGroups.map((g) => [g.date, g._sum.caloriesBurned ?? 0]),
  );

  let deficitSum = 0;
  let netSum = 0;
  let balanceVsTarget = 0;
  let balanceVsMaintenance = 0;
  let daysOverTarget = 0;
  let daysOverMaintenance = 0;

  for (const g of mealGroups) {
    const consumed = g._sum.calories ?? 0;
    const burned = burnedByDate.get(g.date) ?? 0;
    const net = consumed - burned;
    // Фізика ваги — відносно підтримки (TDEE), не денної цілі.
    deficitSum += maintenance - net;
    netSum += net;
    balanceVsTarget += net - target;
    balanceVsMaintenance += net - maintenance;
    if (net > target) daysOverTarget += 1;
    if (net > maintenance) daysOverMaintenance += 1;
  }

  const loggedDays = mealGroups.length;
  const totalDays = Math.max(0, daysBetween(startWeightDate, today));
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
  let projectedDate: string | null = null;
  let daysLeft: number | null = null;
  let paceStatus: ForecastResponse["paceStatus"] = "unknown";

  const remainingKg = Math.round((targetWeight - currentWeight) * 10) / 10;
  if (Math.abs(remainingKg) <= DEAD_ZONE_KG) {
    projectedDate = today;
    daysLeft = 0;
    paceStatus = "progressing";
  } else if (totalDays >= MIN_DAYS_FOR_PROJECTION) {
    const ratePerDay = deltaActual / totalDays;
    const progressing =
      ratePerDay !== 0 && Math.sign(ratePerDay) === Math.sign(remainingKg);
    if (progressing) {
      const daysToGoal = Math.round(remainingKg / ratePerDay);
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
    paceStatus,
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
    paceStatus: "unknown",
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

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00Z").getTime();
  const b = new Date(toYmd + "T00:00:00Z").getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
