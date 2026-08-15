import { fromYMD } from "@/lib/date";

export interface WeightChartPoint {
  date: string;
  weight: number;
}

export interface WeightChartFact {
  t: number;
  date: string;
  weight: number;
  plan: number | null;
  planGap: number | null;
  aheadOfPlan: boolean;
}

export interface WeightChartModel {
  fact: WeightChartFact[];
  hasPlan: boolean;
  t0: number;
  tEnd: number;
  tPlanTarget: number | null;
  yMin: number;
  yMax: number;
  showNow: boolean;
  showArea: boolean;
  nowOnRight: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

export function msFromYmd(ymd: string): number {
  return fromYMD(ymd).getTime();
}

/**
 * Геометрія графіка ваги: факт, планова пряма з калорійного темпу, межі осей.
 * `todayYmd` передається явно, щоб тести не залежали від «сьогодні».
 */
export function buildWeightChartModel(input: {
  points: readonly WeightChartPoint[];
  startWeight: number;
  startWeightDate: string;
  targetWeight: number;
  planRateKgPerDay: number | null;
  todayYmd: string;
}): WeightChartModel {
  const { startWeight, startWeightDate, targetWeight, planRateKgPerDay } = input;
  const t0 = msFromYmd(startWeightDate);
  const tToday = msFromYmd(input.todayYmd);

  const dir = Math.sign(targetWeight - startWeight);
  const planRate = planRateKgPerDay;
  const hasPlan =
    dir !== 0 && planRate != null && planRate !== 0 && Math.sign(planRate) === dir;
  const planDays = hasPlan
    ? Math.abs((targetWeight - startWeight) / planRate!)
    : null;
  const tPlanTarget = planDays != null ? t0 + planDays * DAY : null;

  const planAt = (t: number): number | null => {
    if (!hasPlan) return null;
    const w = startWeight + planRate! * ((t - t0) / DAY);
    return dir < 0 ? Math.max(targetWeight, w) : Math.min(targetWeight, w);
  };

  const toFact = (t: number, date: string, weight: number): WeightChartFact => {
    const plan = planAt(t);
    return {
      t,
      date,
      weight,
      plan,
      planGap: plan == null ? null : Math.abs(weight - plan),
      aheadOfPlan: plan == null ? false : (weight - plan) * dir > 0,
    };
  };

  const fact: WeightChartFact[] = input.points
    .filter((p) => p.date >= startWeightDate)
    .map((p) => toFact(msFromYmd(p.date), p.date, p.weight));

  if (fact[0]?.date !== startWeightDate) {
    fact.unshift(toFact(t0, startWeightDate, startWeight));
  }

  const last = fact[fact.length - 1]!;
  const tEnd = Math.max(tPlanTarget ?? 0, last.t, tToday, t0 + DAY);

  const weights = fact.map((f) => f.weight);
  const lo = Math.min(targetWeight, startWeight, ...weights);
  const hi = Math.max(targetWeight, startWeight, ...weights);
  const padY = Math.max(0.5, (hi - lo) * 0.12);
  const yMin = Math.floor((lo - padY) * 2) / 2;
  const yMax = Math.ceil((hi + padY) * 2) / 2;

  const span = tEnd - t0;
  const nowOnRight = (last.t - t0) / span > 0.65;
  const showNow = fact.length > 1;
  const showArea = (last.t - t0) / span > 0.12;

  return {
    fact,
    hasPlan,
    t0,
    tEnd,
    tPlanTarget,
    yMin,
    yMax,
    showNow,
    showArea,
    nowOnRight,
  };
}
