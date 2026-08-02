import { describe, expect, it } from "vitest";
import { formatPacePercents } from "@/components/WeightGoalCard";
import { pctVsMaintenance, plannedDeficitPctFromTargets } from "@/lib/calories";

const MAINTENANCE = 2300;
const TARGET = 1968;

describe("formatPacePercents", () => {
  it("без факту нічого не показуємо", () => {
    expect(formatPacePercents(null, 15)).toBeNull();
    expect(formatPacePercents(undefined, 15)).toBeNull();
  });

  /**
   * Головна пастка: у джерелах цих двох чисел ПРОТИЛЕЖНІ знаки.
   *   pctVsMaintenance → дефіцит відʼємний (−12)
   *   plannedDeficitPctFromTargets → дефіцит додатний (+15)
   * Якби ми вивели їх як є, вийшло б «−12% / 15%», ніби факт і план
   * дивляться в різні боки, хоча обидва означають дефіцит.
   */
  it("зводить протилежні знаки джерел до одного «дефіцит N%»", () => {
    const fact = pctVsMaintenance(2028, MAINTENANCE); // ≈ −12
    const plan = plannedDeficitPctFromTargets(MAINTENANCE, TARGET); // ≈ +14
    expect(fact).toBeLessThan(0);
    expect(plan).toBeGreaterThan(0);

    const s = formatPacePercents(fact, plan)!;
    expect(s).toContain(`дефіцит ${Math.abs(fact)}%`);
    expect(s).toContain(`план ${plan}%`);
    expect(s).not.toContain("-");
    expect(s).not.toContain("−");
  });

  it("дає звірити вердикт «слабший за план» очима", () => {
    // Факт −12% проти плану 15% — менший дефіцит, тобто справді слабший.
    const s = formatPacePercents(-12, 15)!;
    expect(s).toBe("факт: дефіцит 12% від підтримки · план 15%");
  });

  it("глибший за план дефіцит теж читається однозначно", () => {
    expect(formatPacePercents(-20, 15)).toBe(
      "факт: дефіцит 20% від підтримки · план 15%",
    );
  });

  it("їжа над підтримкою — це профіцит, і слово вживається саме тут", () => {
    const s = formatPacePercents(6, 15)!;
    expect(s).toContain("профіцит 6% над підтримкою");
  });

  it("рівно підтримка — без відсотків і без знаків", () => {
    expect(formatPacePercents(0, 15)).toBe("факт: рівно підтримка · план 15%");
  });

  it("ціль «тримати вагу»: плану дефіциту немає, тож і не згадуємо його", () => {
    const s = formatPacePercents(-2, 0)!;
    expect(s).toBe("факт: дефіцит 2% від підтримки");
    expect(s).not.toContain("план");
  });

  it("план відсутній (null) — так само без згадки", () => {
    expect(formatPacePercents(-2, null)).toBe("факт: дефіцит 2% від підтримки");
  });
});
