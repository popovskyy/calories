import { describe, expect, it } from "vitest";
import type { DashboardDay } from "@/lib/types";
import { weekFilledStats } from "@/lib/week-stats";

const TARGET = 2000;
/** Усі фікстури нижче — до цієї дати; вона сама в жодному тесті не закрита. */
const TODAY = "2026-08-10";

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

/**
 * Ці цифри показує картка цілі — «середнє» тут ділиться на ЗАКРИТІ дні з
 * їжею (до `today`). Сьогодні свідомо виключений: інакше ранковий запис на
 * 400 ккал при цілі 1900 виглядав би як «−1500 від цілі» замість ще не
 * дописаної цифри, яка сама собою зміниться до вечора.
 */
describe("weekFilledStats", () => {
  it("порожній тиждень — null, а не нулі", () => {
    expect(weekFilledStats([], TARGET, TODAY)).toBeNull();
    expect(
      weekFilledStats(
        [day({ date: "2026-08-03" }), day({ date: "2026-08-04" })],
        TARGET,
        TODAY,
      ),
    ).toBeNull();
  });

  it("порожні дні не розмивають середнє", () => {
    const days = [
      day({ date: "2026-08-03", consumedCalories: 2100, totalCalories: 2100 }),
      day({ date: "2026-08-04" }),
      day({ date: "2026-08-05", consumedCalories: 1900, totalCalories: 1900 }),
      day({ date: "2026-08-06" }),
    ];
    const s = weekFilledStats(days, TARGET, TODAY)!;
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
    expect(weekFilledStats(days, TARGET, TODAY)!.balanceVsTargetKcal).toBe(400);
  });

  it("дефіцит дає відʼємний баланс", () => {
    const days = [
      day({ date: "2026-08-03", consumedCalories: 1700, totalCalories: 1700 }),
    ];
    expect(weekFilledStats(days, TARGET, TODAY)!.balanceVsTargetKcal).toBe(-300);
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
    const s = weekFilledStats(days, TARGET, TODAY)!;
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
    expect(weekFilledStats(days, TARGET, TODAY)!.sumNetKcal).toBe(-400);
  });

  /**
   * Регресія на скаргу користувача: «зранку написав що зʼїв 400 калорій, а
   * воно думає що дефіцит 1500 сьогодні — день же ще не закрився».
   */
  it("сьогоднішній ранковий запис не створює тижневий дефіцит", () => {
    const days = [day({ date: TODAY, consumedCalories: 400, totalCalories: 400 })];
    expect(weekFilledStats(days, TARGET, TODAY)).toBeNull();
  });

  it("сьогодні не входить ні в середнє, ні в суму разом із закритими днями", () => {
    const days = [
      day({ date: "2026-08-09", consumedCalories: 1900, totalCalories: 1900 }),
      day({ date: TODAY, consumedCalories: 400, totalCalories: 400 }),
    ];
    const s = weekFilledStats(days, TARGET, TODAY)!;
    expect(s.loggedDays).toBe(1);
    expect(s.sumNetKcal).toBe(1900);
    expect(s.avgNetKcal).toBe(1900);
  });

  it("дата, старша за today (минулий тиждень через ?date=), рахується як закрита", () => {
    const days = [day({ date: "2026-08-03", consumedCalories: 1900, totalCalories: 1900 })];
    expect(weekFilledStats(days, TARGET, "2026-08-04")!.loggedDays).toBe(1);
  });
});
