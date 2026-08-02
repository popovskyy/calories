import { describe, expect, it } from "vitest";
import {
  ARENA_MAX_OVER,
  ARENA_MAX_UNDER,
  EVOLUTION_STAGES,
  TARGET_OVER_TOLERANCE,
  TARGET_UNDER_TOLERANCE,
  computeEvolutionStage,
  inTargetBand,
  isArenaPayable,
  isInTargetFor,
} from "@/lib/economy";

const TARGET = 2000;

describe("inTargetBand / isInTargetFor", () => {
  it("зона навмисно асиметрична: недобрати можна помітно, перебрати — ні", () => {
    const band = inTargetBand(TARGET, "deficit");
    expect(band.max - TARGET).toBeLessThan(TARGET - band.min);
    expect(band.max).toBe(TARGET * (1 + TARGET_OVER_TOLERANCE));
    expect(band.min).toBe(TARGET * (1 - TARGET_UNDER_TOLERANCE.deficit));
  });

  it("рівно в ціль і на обох межах — у цілі", () => {
    const { min, max } = inTargetBand(TARGET, "deficit");
    expect(isInTargetFor(TARGET, TARGET, "deficit")).toBe(true);
    expect(isInTargetFor(min, TARGET, "deficit")).toBe(true);
    expect(isInTargetFor(max, TARGET, "deficit")).toBe(true);
  });

  it("за межами — не в цілі", () => {
    const { min, max } = inTargetBand(TARGET, "deficit");
    expect(isInTargetFor(max + 1, TARGET, "deficit")).toBe(false);
    expect(isInTargetFor(min - 1, TARGET, "deficit")).toBe(false);
  });

  it("чесний день на дефіциті (−15%) зараховується", () => {
    // Саме заради цього зону й зробили асиметричною: 1700 із 2000 — це план,
    // а не провал, і монету за такий день гравець має отримати.
    expect(isInTargetFor(1700, TARGET, "deficit")).toBe(true);
  });

  it("перебір на ті самі 300 ккал — не зараховується", () => {
    expect(isInTargetFor(2300, TARGET, "deficit")).toBe(false);
  });

  it("голодування не вважається успіхом", () => {
    expect(isInTargetFor(1000, 1900, "deficit")).toBe(false);
  });

  it("зона однакова для обох цілей, поки TARGET_UNDER_TOLERANCE рівні", () => {
    expect(inTargetBand(TARGET, "deficit")).toEqual(inTargetBand(TARGET, "maintain"));
  });

  it("нульова або відʼємна ціль ніколи не «в цілі»", () => {
    expect(isInTargetFor(0, 0, "deficit")).toBe(false);
    expect(isInTargetFor(1500, -100, "maintain")).toBe(false);
  });
});

describe("isArenaPayable", () => {
  it("зона арени ширша за «день у цілі», але так само асиметрична", () => {
    expect(ARENA_MAX_UNDER).toBeGreaterThan(ARENA_MAX_OVER);
    expect(isArenaPayable(TARGET * (1 - ARENA_MAX_UNDER), TARGET)).toBe(true);
    expect(isArenaPayable(TARGET * (1 + ARENA_MAX_OVER), TARGET)).toBe(true);
    expect(isArenaPayable(TARGET * (1 + ARENA_MAX_OVER) + 1, TARGET)).toBe(false);
  });

  it("без норми приз не платиться", () => {
    expect(isArenaPayable(1800, 0)).toBe(false);
  });
});

describe("computeEvolutionStage", () => {
  it("новачок без історії — перша стадія", () => {
    expect(computeEvolutionStage(0, 0)).toBe(1);
  });

  it("досить будь-якої з двох умов", () => {
    const s2 = EVOLUTION_STAGES[1]!;
    expect(computeEvolutionStage(s2.inTargetDays, 0)).toBe(2);
    expect(computeEvolutionStage(0, s2.streak)).toBe(2);
  });

  it("кожна віха відкриває саме свою стадію", () => {
    for (const s of EVOLUTION_STAGES) {
      expect(computeEvolutionStage(s.inTargetDays, s.streak)).toBe(s.stage);
    }
  });

  it("не перескакує через стадію на один день недобору", () => {
    const s3 = EVOLUTION_STAGES[2]!;
    expect(computeEvolutionStage(s3.inTargetDays - 1, s3.streak - 1)).toBe(2);
  });

  it("стадія не падає від зростання показників (монотонна)", () => {
    let prev = 0;
    for (let d = 0; d <= 300; d += 10) {
      const stage = computeEvolutionStage(d, 0);
      expect(stage).toBeGreaterThanOrEqual(prev);
      prev = stage;
    }
  });

  it("рекордна серія дає легенду навіть без днів у цілі", () => {
    expect(computeEvolutionStage(0, 400)).toBe(4);
  });
});
