import { describe, expect, it } from "vitest";
import {
  DEFICIT_FACTOR,
  calcMacroTargets,
  calcTargetCalories,
  classifyLedgerStance,
  deficitFloor,
  pctVsMaintenance,
  plannedDeficitPctFromTargets,
} from "@/lib/calories";

const MAINT = 2400;
const TARGET = Math.round(MAINT * DEFICIT_FACTOR); // 2040, план −15%

/** Зібрати вхід ledger-вердикту з середнього відхилення від підтримки. */
function ledger(opts: {
  loggedDays: number;
  avgVsMaintenance: number;
  daysOverTarget?: number;
}) {
  const { loggedDays, avgVsMaintenance } = opts;
  const balanceVsMaintenance = avgVsMaintenance * loggedDays;
  return {
    balanceVsMaintenance,
    balanceVsTarget: balanceVsMaintenance + loggedDays * (MAINT - TARGET),
    loggedDays,
    daysOverTarget: opts.daysOverTarget ?? 0,
    target: TARGET,
    maintenance: MAINT,
    goal: "deficit" as const,
  };
}

describe("plannedDeficitPctFromTargets", () => {
  it("виводить план із цілі й підтримки, а не з хардкоду", () => {
    expect(plannedDeficitPctFromTargets(MAINT, TARGET)).toBe(15);
    expect(plannedDeficitPctFromTargets(MAINT, MAINT)).toBe(0);
  });

  it("не ділить на нуль", () => {
    expect(plannedDeficitPctFromTargets(0, 2000)).toBe(0);
  });
});

describe("pctVsMaintenance", () => {
  it("відʼємне — дефіцит, додатне — профіцит", () => {
    expect(pctVsMaintenance(2040, MAINT)).toBe(-15);
    expect(pctVsMaintenance(2640, MAINT)).toBe(10);
    expect(pctVsMaintenance(MAINT, MAINT)).toBe(0);
  });
});

describe("classifyLedgerStance", () => {
  it("тримання плану = on_plan", () => {
    expect(classifyLedgerStance(ledger({ loggedDays: 7, avgVsMaintenance: -360 })))
      .toBe("on_plan");
  });

  it("помітно глибше за план = deep", () => {
    expect(classifyLedgerStance(ledger({ loggedDays: 7, avgVsMaintenance: -700 })))
      .toBe("deep");
  });

  it("справжній профіцит над підтримкою = surplus", () => {
    expect(classifyLedgerStance(ledger({ loggedDays: 7, avgVsMaintenance: 500 })))
      .toBe("surplus");
  });

  it("мʼякий дефіцит слабший за план = shallow", () => {
    // Факт ≈ −7% при плані −15%: дефіцит є, але темп нижчий за задуманий.
    expect(classifyLedgerStance(ledger({ loggedDays: 7, avgVsMaintenance: -170 })))
      .toBe("shallow");
  });

  it("шум на довгому періоді не вважається профіцитом", () => {
    // 25 ккал/день над підтримкою за 60 днів. Старий поріг порівнював СУМУ
    // (+1500) із половиною одного дня TDEE (1200) і кричав «профіцит».
    const long = ledger({ loggedDays: 60, avgVsMaintenance: 25 });
    expect(long.balanceVsMaintenance).toBeGreaterThan(MAINT * 0.5);
    expect(classifyLedgerStance(long)).toBe("maintenance");
  });

  it("однакове середнє дає однаковий вердикт на 7 і на 60 днях", () => {
    const short = classifyLedgerStance(ledger({ loggedDays: 7, avgVsMaintenance: 25 }));
    const long = classifyLedgerStance(ledger({ loggedDays: 60, avgVsMaintenance: 25 }));
    expect(long).toBe(short);
  });

  it("сталий профіцит на довгому періоді все одно surplus", () => {
    expect(classifyLedgerStance(ledger({ loggedDays: 60, avgVsMaintenance: 400 })))
      .toBe("surplus");
  });

  it("без записів — не вигадує вердикт", () => {
    expect(classifyLedgerStance(ledger({ loggedDays: 0, avgVsMaintenance: 0 })))
      .toBe("maintenance");
  });

  it("на цілі «підтримка» біля цілі = on_plan, вище = surplus", () => {
    const base = {
      loggedDays: 7,
      daysOverTarget: 0,
      target: MAINT,
      maintenance: MAINT,
      goal: "maintain" as const,
    };
    expect(
      classifyLedgerStance({ ...base, balanceVsTarget: 7 * 40, balanceVsMaintenance: 7 * 40 }),
    ).toBe("on_plan");
    expect(
      classifyLedgerStance({ ...base, balanceVsTarget: 7 * 400, balanceVsMaintenance: 7 * 400 }),
    ).toBe("surplus");
  });
});

describe("calcTargetCalories", () => {
  const base = {
    birthYear: 1995,
    birthMonth: 1,
    heightCm: 180,
    weightKg: 80,
    now: new Date("2026-08-02T00:00:00Z"),
  };

  it("на підтримці ціль = TDEE", () => {
    const r = calcTargetCalories({ ...base, sex: "male", goal: "maintain" });
    expect(r.targetCalories).toBe(r.tdee);
  });

  it("на дефіциті ціль = TDEE × 0.85", () => {
    const r = calcTargetCalories({ ...base, sex: "male", goal: "deficit" });
    expect(r.targetCalories).toBe(Math.round(r.tdee * DEFICIT_FACTOR));
  });

  it("не опускає ціль нижче підлоги", () => {
    const tiny = calcTargetCalories({
      ...base,
      weightKg: 40,
      heightCm: 150,
      sex: "female",
      goal: "deficit",
    });
    expect(tiny.targetCalories).toBe(deficitFloor("female"));
  });
});

describe("calcMacroTargets", () => {
  it("білки 1.8 г/кг, жири 0.9 г/кг, вуглеводи — решта", () => {
    const m = calcMacroTargets(2040, 80);
    expect(m.protein).toBe(144);
    expect(m.fats).toBe(72);
    expect(m.carbs).toBe(Math.round((2040 - 144 * 4 - 72 * 9) / 4));
  });

  it("не дає відʼємних вуглеводів при низькій цілі", () => {
    expect(calcMacroTargets(600, 90).carbs).toBe(0);
  });
});
