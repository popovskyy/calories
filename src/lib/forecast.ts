/**
 * Прогноз ваги з журналу: maintenance − net за дні з їжею (без сьогодні).
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
      targetWeeks: true,
      startWeight: true,
      startWeightDate: true,
    },
  });

  if (!user) {
    return emptyForecast();
  }

  const configured =
    user.targetWeight != null &&
    user.targetWeeks != null &&
    user.startWeight != null &&
    !!user.startWeightDate;

  if (!configured) {
    return {
      ...emptyForecast(),
      configured: false,
      startWeight: user.startWeight,
      currentWeight: user.weight,
      targetWeight: user.targetWeight,
    };
  }

  const startWeight = user.startWeight!;
  const startWeightDate = user.startWeightDate!;
  const targetWeight = user.targetWeight!;
  const targetWeeks = user.targetWeeks!;
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
  const deltaActual = Math.round((currentWeight - expectedWeight) * 10) / 10;

  const targetDate = shiftYMD(startWeightDate, targetWeeks * 7);
  const daysLeft = Math.max(0, daysBetween(today, targetDate));

  const plannedFrac =
    totalDays + daysLeft > 0 ? totalDays / (totalDays + daysLeft) : 0;
  const plannedWeightToday =
    Math.round((startWeight + (targetWeight - startWeight) * plannedFrac) * 10) /
    10;

  let scheduleStatus: ForecastResponse["scheduleStatus"] = "unknown";
  if (loggedDays > 0) {
    const diff = currentWeight - plannedWeightToday;
    // Для схуднення: менше ваги = ahead; для набору — навпаки
    const losing = targetWeight < startWeight;
    const aheadBy = losing ? -diff : diff;
    if (Math.abs(diff) <= DEAD_ZONE_KG) scheduleStatus = "on";
    else if (aheadBy > 0) scheduleStatus = "ahead";
    else scheduleStatus = "behind";
  }

  return {
    configured: true,
    startWeight,
    currentWeight,
    targetWeight,
    expectedWeight,
    deltaActual,
    plannedWeightToday,
    targetDate,
    daysLeft,
    loggedDays,
    totalDays,
    scheduleStatus,
  };
}

function emptyForecast(): ForecastResponse {
  return {
    configured: false,
    startWeight: null,
    currentWeight: null,
    targetWeight: null,
    expectedWeight: null,
    deltaActual: null,
    plannedWeightToday: null,
    targetDate: null,
    daysLeft: null,
    loggedDays: 0,
    totalDays: 0,
    scheduleStatus: "unknown",
  };
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00Z").getTime();
  const b = new Date(toYmd + "T00:00:00Z").getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
