import { describe, expect, it } from "vitest";
import { noTrendReason } from "@/components/WeightGoalCard";
import {
  MIN_TREND_SAMPLES,
  MIN_TREND_SPAN_DAYS,
  weightTrend,
} from "@/lib/weight-trend";
import type { ForecastResponse } from "@/lib/types";

function forecast(over: Partial<ForecastResponse>): ForecastResponse {
  return {
    configured: true,
    startWeight: 99,
    startWeightDate: "2026-08-01",
    currentWeight: 93.6,
    targetWeight: 88,
    expectedWeight: 93.8,
    deltaActual: -5.4,
    projectedDate: null,
    daysLeft: null,
    loggedDays: 6,
    totalDays: 6,
    skippedDays: 0,
    paceStatus: "unknown",
    trendKgPerWeek: null,
    lastWeighInDate: "2026-08-06",
    weighInCount: 0,
    trendSpanDays: 0,
    maintenanceKcal: 2300,
    targetKcal: 1968,
    avgNetKcal: 2028,
    balanceVsTargetKcal: 362,
    balanceVsMaintenanceKcal: -1632,
    daysOverTarget: 3,
    daysOverMaintenance: 0,
    avgDeficitPct: -12,
    plannedDeficitPct: 15,
    calorieStance: "shallow",
    ...over,
  };
}

/**
 * Скарга користувача: «мало зважувань для дати», хоча зважувань було 5–6.
 * Кількість була достатня — бракувало розкиду в часі, і повідомлення про це
 * мовчало, називаючи натомість неправдиву причину.
 */
describe("noTrendReason", () => {
  it("5 зважувань за 4 дні — це НЕ «мало зважувань»", () => {
    const r = noTrendReason(forecast({ weighInCount: 5, trendSpanDays: 4 }));
    expect(r).not.toContain("мало зважувань");
    expect(r).toContain("тренд ще формується");
  });

  it("підказує, скільки днів ще бракує до тренду", () => {
    const spanDays = 4;
    const r = noTrendReason(forecast({ weighInCount: 5, trendSpanDays: spanDays }));
    expect(r).toContain(String(MIN_TREND_SPAN_DAYS - spanDays));
  });

  it("менше за поріг кількості — чесно каже «мало зважувань»", () => {
    const r = noTrendReason(
      forecast({ weighInCount: MIN_TREND_SAMPLES - 1, trendSpanDays: 10 }),
    );
    expect(r).toContain("мало зважувань");
  });

  it("жодного зважування — просить стати на ваги", () => {
    expect(noTrendReason(forecast({ weighInCount: 0 }))).toContain("запиши вагу");
  });

  it("застарілі дані мають власне повідомлення, не «мало зважувань»", () => {
    const r = noTrendReason(
      forecast({ paceStatus: "stale", weighInCount: 9, trendSpanDays: 30 }),
    );
    expect(r).toContain("давно не зважувався");
    expect(r).not.toContain("мало зважувань");
  });

  it("розкид уже достатній — не обіцяє неіснуючих днів очікування", () => {
    const r = noTrendReason(
      forecast({ weighInCount: 5, trendSpanDays: MIN_TREND_SPAN_DAYS }),
    );
    expect(r).toBe("тренд ще формується");
  });
});

/**
 * Другий бік тієї самої скарги: раніше зважування бралися лише від
 * startWeightDate, тож свіжопоставлена ціль обнуляла всю історію ваги.
 */
describe("тренд не залежить від того, коли поставлено ціль", () => {
  const daily = Array.from({ length: 12 }, (_, i) => ({
    date: `2026-07-${String(20 + i).padStart(2, "0")}`,
    weight: 95 - i * 0.1,
  }));

  it("місяць зважувань дає темп, навіть якщо ціль поставили щойно", () => {
    const t = weightTrend(daily, "2026-07-31");
    expect(t.samples).toBeGreaterThanOrEqual(MIN_TREND_SAMPLES);
    expect(t.spanDays).toBeGreaterThanOrEqual(MIN_TREND_SPAN_DAYS);
    expect(t.ratePerDay).not.toBeNull();
  });

  it("а обрізання історії до останніх днів темп прибирає — саме це й був баг", () => {
    const onlyRecent = daily.slice(-4); // ніби ціль поставлено 4 дні тому
    const t = weightTrend(onlyRecent, "2026-07-31");
    expect(t.samples).toBeGreaterThanOrEqual(MIN_TREND_SAMPLES);
    expect(t.spanDays).toBeLessThan(MIN_TREND_SPAN_DAYS);
    expect(t.ratePerDay).toBeNull();
  });
});
