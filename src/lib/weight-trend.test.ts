import { describe, expect, it } from "vitest";
import { shiftYMD } from "@/lib/date";
import {
  WEIGH_IN_STALE_DAYS,
  daysBetweenYMD,
  weightTrend,
} from "@/lib/weight-trend";

const START = "2026-06-01";

/** Зважування раз на `everyDays` днів із заданим темпом кг/день. */
function series(
  startWeight: number,
  kgPerDay: number,
  count: number,
  everyDays = 3,
  noise: number[] = [],
) {
  return Array.from({ length: count }, (_, i) => ({
    date: shiftYMD(START, i * everyDays),
    weight:
      startWeight + kgPerDay * i * everyDays + (noise[i % noise.length] ?? 0),
  }));
}

describe("daysBetweenYMD", () => {
  it("рахує календарні дні через межу місяця", () => {
    expect(daysBetweenYMD("2026-06-28", "2026-07-02")).toBe(4);
  });

  it("дає відʼємне для зворотного напрямку", () => {
    expect(daysBetweenYMD("2026-07-02", "2026-06-28")).toBe(-4);
  });

  it("не спотикається на переході на літній час", () => {
    // Kyiv переводить годинники 2026-03-29; YMD парситься як UTC-північ.
    expect(daysBetweenYMD("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("weightTrend", () => {
  it("порожня історія — темпу немає", () => {
    const t = weightTrend([], "2026-07-01");
    expect(t.ratePerDay).toBeNull();
    expect(t.samples).toBe(0);
    expect(t.lastDate).toBeNull();
    expect(t.stale).toBe(false);
  });

  it("менше 3 зважувань — темпу немає", () => {
    const t = weightTrend(series(80, -0.05, 2, 10), "2026-06-21");
    expect(t.samples).toBe(2);
    expect(t.ratePerDay).toBeNull();
  });

  it("розкид дат менший за тиждень — темпу немає", () => {
    // 4 зважування за 3 дні: це коливання води, а не тренд.
    const t = weightTrend(series(80, -0.2, 4, 1), "2026-06-04");
    expect(t.samples).toBe(4);
    expect(t.spanDays).toBe(3);
    expect(t.ratePerDay).toBeNull();
  });

  it("чисте схуднення дає точний відʼємний нахил", () => {
    const t = weightTrend(series(85, -0.05, 8, 3), "2026-07-01");
    expect(t.ratePerDay).toBeCloseTo(-0.05, 6);
    expect(t.spanDays).toBe(21);
  });

  it("чистий набір дає точний додатний нахил", () => {
    const t = weightTrend(series(60, 0.03, 8, 3), "2026-07-01");
    expect(t.ratePerDay).toBeCloseTo(0.03, 6);
  });

  it("плато дає нахил ≈ 0, а не null", () => {
    const t = weightTrend(series(80, 0, 8, 3), "2026-07-01");
    expect(t.ratePerDay).toBeCloseTo(0, 6);
  });

  it("одне «водяне» зважування не перекидає тренд", () => {
    const clean = series(85, -0.05, 10, 3);
    const spiked = clean.map((p, i) =>
      i === 5 ? { ...p, weight: p.weight + 1.8 } : p,
    );
    const t = weightTrend(spiked, "2026-07-01");
    // Сплеск +1.8 кг посеред ряду зсуває нахил, але не міняє знак і не робить
    // із схуднення набір — саме це ламала стара оцінка по двох точках.
    expect(t.ratePerDay).toBeLessThan(0);
    expect(t.ratePerDay).toBeCloseTo(-0.05, 1);
  });

  it("останнє зважування-сплеск не визначає темп сам по собі", () => {
    const clean = series(85, -0.05, 10, 3);
    const spikedLast = [...clean];
    const last = spikedLast[spikedLast.length - 1]!;
    spikedLast[spikedLast.length - 1] = { ...last, weight: last.weight + 2 };
    const t = weightTrend(spikedLast, "2026-07-01");
    expect(t.ratePerDay).toBeLessThan(0);
  });

  it("темп не залежить від того, скільки минуло від останньої ваги", () => {
    const pts = series(85, -0.05, 8, 3);
    const soon = weightTrend(pts, "2026-06-23");
    const muchLater = weightTrend(pts, "2026-09-23");
    // Саме це робила стара формула: без нових зважувань темп танув сам собою.
    expect(muchLater.ratePerDay).toBeCloseTo(soon.ratePerDay!, 10);
  });

  it("позначає застарілі дані замість тихого сповільнення", () => {
    const pts = series(85, -0.05, 8, 3);
    const last = pts[pts.length - 1]!.date;
    const fresh = weightTrend(pts, shiftYMD(last, WEIGH_IN_STALE_DAYS));
    const stale = weightTrend(pts, shiftYMD(last, WEIGH_IN_STALE_DAYS + 1));
    expect(fresh.stale).toBe(false);
    expect(stale.stale).toBe(true);
    expect(stale.staleDays).toBe(WEIGH_IN_STALE_DAYS + 1);
  });

  it("ігнорує зважування, старші за вікно", () => {
    const old = { date: "2026-01-01", weight: 120 };
    const recent = series(85, -0.05, 8, 3);
    const t = weightTrend([old, ...recent], "2026-07-01");
    expect(t.samples).toBe(recent.length);
    expect(t.ratePerDay).toBeCloseTo(-0.05, 6);
  });

  it("не залежить від порядку точок і схлопує дублікати дат", () => {
    const pts = series(85, -0.05, 8, 3);
    const shuffled = [...pts].reverse();
    const withDupe = [...shuffled, { ...pts[3]!, weight: pts[3]!.weight }];
    expect(weightTrend(withDupe, "2026-07-01").samples).toBe(pts.length);
    expect(weightTrend(shuffled, "2026-07-01").ratePerDay).toBeCloseTo(
      weightTrend(pts, "2026-07-01").ratePerDay!,
      10,
    );
  });

  it("відкидає нечислові ваги", () => {
    const pts = [
      ...series(85, -0.05, 8, 3),
      { date: "2026-07-01", weight: Number.NaN },
    ];
    const t = weightTrend(pts, "2026-07-02");
    expect(t.samples).toBe(8);
    expect(Number.isFinite(t.ratePerDay!)).toBe(true);
  });

  it("бере не більше MAX_SAMPLES останніх точок", () => {
    const t = weightTrend(series(90, -0.02, 60, 1), "2026-08-01");
    expect(t.samples).toBe(30);
  });
});
