import { describe, expect, it } from "vitest";
import type { DaySnap } from "@/lib/quests";
import { progressFor, questOutcome } from "@/lib/quests";

const WEEK_START = "2026-08-03"; // Пн
const TARGET_KCAL = 2000;

function snap(over: Partial<DaySnap> & { date: string }): DaySnap {
  return {
    mealCount: 0,
    activityCount: 0,
    net: 0,
    inTarget: false,
    blowout: false,
    hasMeal: false,
    activityMinutes: 0,
    burned: 0,
    proteinHit: false,
    targetCalories: TARGET_KCAL,
    final: true,
    ...over,
  };
}

/** Закритий день, у межах цілі, з їжею. */
function closedInTarget(date: string, net = 1900): DaySnap {
  return snap({ date, mealCount: 1, hasMeal: true, net, inTarget: true, final: true });
}

/** "Сьогодні": трохи зʼїдено, день ще не закритий (final: false). */
function liveDay(date: string, net: number, extra: Partial<DaySnap> = {}): DaySnap {
  return snap({ date, mealCount: 1, hasMeal: true, net, final: false, ...extra });
}

describe("questOutcome — монотонні квести (не FINAL_DAY_KINDS)", () => {
  it("живе й закрите завжди збігається, pendingClose завжди false", () => {
    const snaps = [closedInTarget("2026-08-03"), liveDay("2026-08-04", 400)];
    const finalSnaps = snaps.filter((s) => s.final);
    const o = questOutcome("log_days", 2, snaps, finalSnaps, WEEK_START);
    expect(o.progress).toBe(2);
    expect(o.done).toBe(true);
    expect(o.pendingClose).toBe(false);
  });
});

describe("questOutcome — FINAL_DAY_KINDS: in_target_days, no_blowout, weekend_clean, week_balance", () => {
  /**
   * Регресія на скаргу користувача: «зранку зʼїв 400 ккал, а воно думає, що
   * тиждень уже вкладається в бюджет». Два закриті дні реально over budget
   * (2100 при цілі 2000 кожен) — квест НЕ мав би зарахуватись. Але "живий"
   * рахунок додає сьогоднішні 400 ккал у чисельник і повний денний бюджет
   * today у знаменник, тож сума виглядає вкладеною.
   */
  it("week_balance: сьогоднішній сніданок маскує реальний перебір закритих днів", () => {
    const target = 2;
    const closedOverBudget = [
      snap({ date: "2026-08-03", mealCount: 1, hasMeal: true, net: 2100, final: true }),
      snap({ date: "2026-08-04", mealCount: 1, hasMeal: true, net: 2100, final: true }),
    ];
    const today = liveDay("2026-08-05", 400);
    const snaps = [...closedOverBudget, today];
    const finalSnaps = snaps.filter((s) => s.final);

    const live = progressFor("week_balance", target, snaps, WEEK_START);
    const o = questOutcome("week_balance", target, snaps, finalSnaps, WEEK_START);

    expect(live.done).toBe(true); // саме цю неправду показувала стара картка
    expect(o.done).toBe(false);
    expect(o.pendingClose).toBe(true);
  });

  it("week_balance: закритий підсумок реально over budget — не done і без pendingClose", () => {
    const snaps = [
      closedInTarget("2026-08-03", 2400),
      closedInTarget("2026-08-04", 2400),
      closedInTarget("2026-08-05", 2400),
    ];
    const finalSnaps = snaps.filter((s) => s.final);
    const o = questOutcome("week_balance", 3, snaps, finalSnaps, WEEK_START);
    expect(o.done).toBe(false);
    expect(o.pendingClose).toBe(false);
  });

  it("week_balance: щойно день реально закрився (ті самі числа) — done стає true", () => {
    const closedDays = [closedInTarget("2026-08-03", 1900), closedInTarget("2026-08-04", 1900)];
    // Учорашнє "сьогодні" з 400 ккал тепер закрите тим самим числом.
    const nowClosed = snap({ date: "2026-08-05", mealCount: 1, hasMeal: true, net: 400, final: true });
    const snaps = [...closedDays, nowClosed];
    const finalSnaps = snaps.filter((s) => s.final);
    const o = questOutcome("week_balance", 3, snaps, finalSnaps, WEEK_START);
    expect(o.done).toBe(true);
    expect(o.pendingClose).toBe(false);
  });

  it("in_target_days: живий 'у цілі' сьогодні не рахується як закритий день у цілі", () => {
    const closed = [closedInTarget("2026-08-03"), closedInTarget("2026-08-04")];
    // 1700 — усередині асиметричної зони (−24%/+5% від 2000), тож live inTarget.
    const todaySoFar = liveDay("2026-08-05", 1700, { inTarget: true });
    const snaps = [...closed, todaySoFar];
    const finalSnaps = snaps.filter((s) => s.final);

    const target = 3;
    const live = progressFor("in_target_days", target, snaps, WEEK_START);
    const o = questOutcome("in_target_days", target, snaps, finalSnaps, WEEK_START);

    expect(live.done).toBe(true); // 2 закритих + "сьогодні" вважається живо в цілі
    expect(o.done).toBe(false); // а закритих усього 2 з 3
    expect(o.progress).toBe(3); // прогрес-бар лишається живим, не ховаємо його
    expect(o.pendingClose).toBe(true);
  });

  it("no_blowout: сьогоднішній зрив не псує вже закритий чистий тиждень і не дає done завчасно", () => {
    const closed = [closedInTarget("2026-08-03"), closedInTarget("2026-08-04")];
    const todayBlowout = liveDay("2026-08-05", 3000, { blowout: true });
    const snaps = [...closed, todayBlowout];
    const finalSnaps = snaps.filter((s) => s.final);
    const o = questOutcome("no_blowout", 2, snaps, finalSnaps, WEEK_START);
    // Закритих чистих днів рівно 2 — done істинний, бо він рахується лише
    // за finalSnaps і сьогоднішній зрив (final: false) туди не потрапляє.
    expect(o.done).toBe(true);
  });

  it("weekend_clean: неділя рахується в цілі лише коли вона сама закрита", () => {
    const sat = closedInTarget("2026-08-08"); // субота
    // 1600 — усередині зони, тож ЖИВЕ inTarget true, але день не закритий.
    const sunLive = liveDay("2026-08-09", 1600, { inTarget: true });
    const snaps = [sat, sunLive];
    const finalSnaps = snaps.filter((s) => s.final);
    const o = questOutcome("weekend_clean", 2, snaps, finalSnaps, WEEK_START);
    expect(o.done).toBe(false);
    expect(o.pendingClose).toBe(true);
  });
});

describe("progressFor — базові інваріанти для кожного виду", () => {
  const days = [
    snap({
      date: "2026-08-03",
      mealCount: 1,
      hasMeal: true,
      net: 1900,
      inTarget: true,
      activityCount: 1,
      activityMinutes: 30,
      burned: 200,
      proteinHit: true,
    }),
    snap({ date: "2026-08-04", mealCount: 1, hasMeal: true, net: 2500, inTarget: false, blowout: true }),
  ];

  it("activity_minutes і burn_total сумують по всіх днях", () => {
    expect(progressFor("activity_minutes", 30, days, WEEK_START)).toEqual({ progress: 30, done: true });
    expect(progressFor("burn_total", 200, days, WEEK_START)).toEqual({ progress: 200, done: true });
  });

  it("protein_days рахує лише дні з виконаною нормою", () => {
    expect(progressFor("protein_days", 1, days, WEEK_START).progress).toBe(1);
  });

  it("dual_days вимагає їжу І активність в один день", () => {
    expect(progressFor("dual_days", 1, days, WEEK_START).progress).toBe(1);
  });

  it("невідомий вид не ламається, повертає нульовий прогрес", () => {
    // @ts-expect-error — навмисно невалідний kind для перевірки default-гілки
    expect(progressFor("unknown_kind", 1, days, WEEK_START)).toEqual({ progress: 0, done: false });
  });
});
