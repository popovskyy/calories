import { describe, expect, it } from "vitest";
import type { DashboardDay } from "@/lib/types";
import { weekFilledStats } from "@/lib/week-stats";

const TARGET = 2000;

function day(over: Partial<DashboardDay> & { date: string }): DashboardDay {
  return {
    totalCalories: 0,
    consumedCalories: 0,
    burnedCalories: 0,
    targetCalories: TARGET,
    protein: 0,
    fats: 0,
    carbs: 0,
    ...over,
  } as DashboardDay;
}

/** Ці цифри показує картка цілі — «середнє» тут ділиться на дні З ЇЖЕЮ. */
describe("weekFilledStats", () => {
  it("порожній тиждень — null, а не нулі", () => {
    expect(weekFilledStats([], TARGET)).toBeNull();
    expect(
      weekFilledStats([day({ date: "2026-08-03" }), day({ date: "2026-08-04" })], TARGET),
    ).toBeNull();
  });

  it("порожні дні не розмивають середнє", () => {
    const days = [
      day({ date: "2026-08-03", consumedCalories: 2100, totalCalories: 2100 }),
      day({ date: "2026-08-04" }),
      day({ date: "2026-08-05", consumedCalories: 1900, totalCalories: 1900 }),
      day({ date: "2026-08-06" }),
    ];
    const s = weekFilledStats(days, TARGET)!;
    expect(s.loggedDays).toBe(2);
    expect(s.avgNetKcal).toBe(2000);
    expect(s.sumNetKcal).toBe(4000);
  });

  it("баланс рахується проти норми лише за заповнені дні", () => {
    const days = [
      day({ date: "2026-08-03", consumedCalories: 2300, totalCalories: 2300 }),
      day({ date: "2026-08-04" }),
      day({ date: "2026-08-05", consumedCalories: 2100, totalCalories: 2100 }),
    ];
    // 4400 з'їдено проти 4000 бюджету за два дні → +400, а не −1600 за три.
    expect(weekFilledStats(days, TARGET)!.balanceVsTargetKcal).toBe(400);
  });

  it("дефіцит дає відʼємний баланс", () => {
    const days = [day({ date: "2026-08-03", consumedCalories: 1700, totalCalories: 1700 })];
    expect(weekFilledStats(days, TARGET)!.balanceVsTargetKcal).toBe(-300);
  });

  it("день, з'їдений у нуль активністю, усе одно рахується заповненим", () => {
    // consumedCalories > 0, але net = 0 після тренування — це реальний день,
    // а не порожній: інакше він тихо випав би із середнього.
    const days = [
      day({
        date: "2026-08-03",
        consumedCalories: 1800,
        burnedCalories: 1800,
        totalCalories: 0,
      }),
    ];
    const s = weekFilledStats(days, TARGET)!;
    expect(s.loggedDays).toBe(1);
    expect(s.avgNetKcal).toBe(0);
  });

  it("net може бути відʼємним, якщо спалено більше, ніж з'їдено", () => {
    const days = [
      day({
        date: "2026-08-03",
        consumedCalories: 1500,
        burnedCalories: 1900,
        totalCalories: -400,
      }),
    ];
    expect(weekFilledStats(days, TARGET)!.sumNetKcal).toBe(-400);
  });
});
