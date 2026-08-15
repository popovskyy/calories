import { describe, expect, it } from "vitest";
import { KCAL_PER_KG } from "@/lib/calories";
import { shiftYMD } from "@/lib/date";
import { buildWeightChartModel } from "@/lib/weight-chart";

const TODAY = "2026-08-15";
const START = "2026-06-01";

/** Плановий темп кг/день із калорій: (ціль − підтримка) / 7700. */
function rateFromKcal(targetKcal: number, maintenanceKcal: number) {
  return (targetKcal - maintenanceKcal) / KCAL_PER_KG;
}

describe("графік прогнозу ваги (кг)", () => {
  it("без зважувань — лише старт, підпис «Зараз» не дублює старт", () => {
    const m = buildWeightChartModel({
      points: [],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: -0.05,
      todayYmd: TODAY,
    });
    expect(m.fact).toHaveLength(1);
    expect(m.fact[0]).toMatchObject({ date: START, weight: 90 });
    expect(m.showNow).toBe(false);
  });

  it("відкидає зважування до дати старту цілі", () => {
    const m = buildWeightChartModel({
      points: [
        { date: "2026-05-01", weight: 95 },
        { date: "2026-07-01", weight: 87 },
      ],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: -0.05,
      todayYmd: TODAY,
    });
    expect(m.fact.map((f) => f.date)).toEqual([START, "2026-07-01"]);
    expect(m.fact[0]?.weight).toBe(90);
    expect(m.showNow).toBe(true);
  });

  it("підставляє старт, якщо на ту дату немає запису", () => {
    const m = buildWeightChartModel({
      points: [{ date: "2026-07-01", weight: 87 }],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: null,
      todayYmd: TODAY,
    });
    expect(m.fact[0]?.date).toBe(START);
    expect(m.fact[0]?.weight).toBe(90);
  });

  it("дефіцит і ціль схуднути — є планова пряма старт → ціль", () => {
    const planRate = rateFromKcal(2000, 2385); // ≈ −0.05 кг/день
    const m = buildWeightChartModel({
      points: [{ date: START, weight: 90 }],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: planRate,
      todayYmd: TODAY,
    });
    expect(m.hasPlan).toBe(true);
    expect(m.tPlanTarget).not.toBeNull();
    const days = (m.tPlanTarget! - m.t0) / 86_400_000;
    expect(days).toBeCloseTo(10 / Math.abs(planRate), 6);
    expect(m.fact[0]?.plan).toBeCloseTo(90, 6);
  });

  it("план не проскакує ціль після дати прибуття", () => {
    const m = buildWeightChartModel({
      points: [{ date: shiftYMD(START, 400), weight: 79 }],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: -0.05,
      todayYmd: shiftYMD(START, 400),
    });
    const last = m.fact[m.fact.length - 1]!;
    expect(last.plan).toBe(80);
  });

  it("профіцит при цілі схуднути — лінії плану немає", () => {
    const m = buildWeightChartModel({
      points: [],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: +0.04,
      todayYmd: TODAY,
    });
    expect(m.hasPlan).toBe(false);
    expect(m.tPlanTarget).toBeNull();
    expect(m.fact[0]?.plan).toBeNull();
  });

  it("набір ваги: додатний план і ціль вище старту", () => {
    const m = buildWeightChartModel({
      points: [{ date: shiftYMD(START, 20), weight: 63 }],
      startWeight: 60,
      startWeightDate: START,
      targetWeight: 70,
      planRateKgPerDay: +0.05,
      todayYmd: TODAY,
    });
    expect(m.hasPlan).toBe(true);
    expect(m.fact[0]?.plan).toBeCloseTo(60, 6);
    const last = m.fact[m.fact.length - 1]!;
    expect(last.plan).toBeCloseTo(61, 6);
  });

  it("на схудненні вага нижче плану — попереду плану", () => {
    const m = buildWeightChartModel({
      points: [{ date: shiftYMD(START, 20), weight: 88 }],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: -0.05,
      todayYmd: TODAY,
    });
    const last = m.fact[m.fact.length - 1]!;
    expect(last.plan).toBeCloseTo(89, 6);
    expect(last.aheadOfPlan).toBe(true);
    expect(last.planGap).toBeCloseTo(1, 6);
  });

  it("на схудненні вага вище плану — позаду плану", () => {
    const m = buildWeightChartModel({
      points: [{ date: shiftYMD(START, 20), weight: 90 }],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: -0.05,
      todayYmd: TODAY,
    });
    const last = m.fact[m.fact.length - 1]!;
    expect(last.aheadOfPlan).toBe(false);
    expect(last.planGap).toBeCloseTo(1, 6);
  });

  it("на наборі вага вище плану — попереду", () => {
    const m = buildWeightChartModel({
      points: [{ date: shiftYMD(START, 20), weight: 62 }],
      startWeight: 60,
      startWeightDate: START,
      targetWeight: 70,
      planRateKgPerDay: +0.05,
      todayYmd: TODAY,
    });
    const last = m.fact[m.fact.length - 1]!;
    expect(last.plan).toBeCloseTo(61, 6);
    expect(last.aheadOfPlan).toBe(true);
  });

  it("старт = ціль — плану немає (немає напрямку)", () => {
    const m = buildWeightChartModel({
      points: [],
      startWeight: 80,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: -0.05,
      todayYmd: TODAY,
    });
    expect(m.hasPlan).toBe(false);
  });

  it("нульовий калорійний темп — плану немає", () => {
    const m = buildWeightChartModel({
      points: [],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: 0,
      todayYmd: TODAY,
    });
    expect(m.hasPlan).toBe(false);
  });

  it("вісь Y завжди вміщує старт і ціль", () => {
    const m = buildWeightChartModel({
      points: [{ date: TODAY, weight: 85.2 }],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: -0.05,
      todayYmd: TODAY,
    });
    expect(m.yMin).toBeLessThanOrEqual(80);
    expect(m.yMax).toBeGreaterThanOrEqual(90);
  });

  it("права межа осі не раніше сьогодні й останнього зважування", () => {
    const lastWeigh = "2026-08-10";
    const m = buildWeightChartModel({
      points: [{ date: lastWeigh, weight: 86 }],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: null,
      todayYmd: TODAY,
    });
    expect(m.tEnd).toBeGreaterThanOrEqual(m.fact[m.fact.length - 1]!.t);
    expect(m.tEnd).toBeGreaterThanOrEqual(Date.UTC(2026, 7, 15));
  });

  it("ранній шлях — без заливки, щоб не виглядало стовпчиком", () => {
    const m = buildWeightChartModel({
      points: [{ date: shiftYMD(START, 2), weight: 89.8 }],
      startWeight: 90,
      startWeightDate: START,
      targetWeight: 80,
      planRateKgPerDay: -0.05,
      todayYmd: shiftYMD(START, 2),
    });
    expect(m.showArea).toBe(false);
  });
});
