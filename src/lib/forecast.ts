/**
 * Прогноз ваги з журналу: maintenance − net за дні з їжею (без сьогодні),
 * плюс ETA до цілі за фактичним темпом зважувань (без декларованого плану).
 */

import { prisma } from "@/lib/prisma";
import {
  calcMaintenanceCalories,
  isSex,
  KCAL_PER_KG,
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

  const maintenance = calcMaintenanceCalories({
    birthYear: user.birthYear,
    birthMonth: user.birthMonth,
    sex: isSex(user.sex) ? user.sex : "male",
    weightKg: user.weight,
    heightCm: user.height,
  });

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
  for (const g of mealGroups) {
    const consumed = g._sum.calories ?? 0;
    const burned = burnedByDate.get(g.date) ?? 0;
    const net = consumed - burned;
    deficitSum += maintenance - net;
  }

  const loggedDays = mealGroups.length;
  const totalDays = Math.max(0, daysBetween(startWeightDate, today));
  const expectedWeight =
    Math.round((startWeight - deficitSum / KCAL_PER_KG) * 10) / 10;
  /** Фактична зміна ваги від старту: <0 — схудли, >0 — набрали. */
  const deltaActual = Math.round((currentWeight - startWeight) * 10) / 10;

  // ETA до цілі за фактичним темпом зважувань (не за декларованим планом):
  // якщо напрямок зважувань веде до targetWeight, екстраполюємо дату.
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
  };
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00Z").getTime();
  const b = new Date(toYmd + "T00:00:00Z").getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
