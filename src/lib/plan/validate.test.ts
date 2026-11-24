import { describe, expect, it } from "vitest";
import type { AiDay, AiExercise, AiWeek } from "@/lib/gemini/schemas";
import { gearIssues, qualityDay, qualityWeek, validateDay, validateExercise, validateWeek } from "./validate";

const ex = (over: Partial<AiExercise> = {}): AiExercise => ({
  name: "Підтягування",
  type: "strength",
  equipmentIds: ["E1"],
  sets: 4,
  reps: "8–10",
  durationSec: null,
  tempo: null,
  load: null,
  restSec: 90,
  tip: "Візьміться за перекладину, підтягніться до підборіддя.",
  videoQuery: "pull up proper form",
  ...over,
});

const day = (over: Partial<AiDay> = {}): AiDay => ({
  type: "strength",
  focus: "Верх тіла",
  title: "Тяга + жим",
  durationMin: 45,
  caloriesEst: 400,
  rpe: 7,
  warmup: [ex({ equipmentIds: [] })],
  main: [ex(), ex({ name: "Бруси", equipmentIds: ["E2"] })],
  cooldown: [ex({ equipmentIds: [], reps: null, durationSec: 60 })],
  ...over,
});

const allowed = new Set(["E1", "E2"]);

describe("validateExercise", () => {
  it("ок для коректної вправи", () => {
    expect(validateExercise(ex(), allowed, "x")).toEqual([]);
  });
  it("відхиляє інвентар, якого немає в атлета", () => {
    const issues = validateExercise(ex({ equipmentIds: ["E9"] }), allowed, "x");
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("E9");
  });
  it("порожній інвентар — це власна вага, не помилка", () => {
    expect(validateExercise(ex({ equipmentIds: [] }), new Set(), "x")).toEqual([]);
  });
  it("вимагає повтори або час", () => {
    expect(validateExercise(ex({ reps: null, durationSec: null }), allowed, "x")).toHaveLength(1);
    expect(validateExercise(ex({ reps: "  ", durationSec: null }), allowed, "x")).toHaveLength(1);
    expect(validateExercise(ex({ reps: null, durationSec: 30 }), allowed, "x")).toEqual([]);
  });
});

describe("validateDay / validateWeek", () => {
  it("збирає порушення з усіх блоків", () => {
    const bad = day({ main: [ex({ equipmentIds: ["E7"] })], cooldown: [ex({ reps: null })] });
    expect(validateDay(bad, allowed)).toHaveLength(2);
  });

  const week = (weekdays: number[]): AiWeek => ({
    summary: "Чергування силових, кардіо і мобіліті.",
    days: weekdays.map((weekday) => ({ ...day(), weekday })),
  });

  it("тиждень з weekday 0..4 валідний", () => {
    expect(validateWeek(week([0, 1, 2, 3, 4]), allowed)).toEqual([]);
  });
  it("дублікати/пропуски днів — порушення", () => {
    expect(validateWeek(week([0, 1, 2, 3, 3]), allowed).length).toBeGreaterThan(0);
  });
});

describe("qualityDay", () => {
  const four = [ex(), ex({ name: "Віджимання" }), ex({ name: "Присідання" }), ex({ name: "Планка" })];
  const mob = (name: string) => ex({ name, type: "mobility", equipmentIds: [] });

  it("нормальний день без зауважень", () => {
    expect(qualityDay(day({ main: four }), "d")).toEqual([]);
  });
  it("мало вправ в основному блоці", () => {
    expect(qualityDay(day(), "d")).toHaveLength(1); // fixture: main = 2
  });
  it("довга розминка й заминка", () => {
    const issues = qualityDay(day({ main: four, warmup: [mob("a"), mob("b"), mob("c")], cooldown: [mob("d"), mob("e"), mob("f")] }), "d");
    expect(issues.some((i) => i.includes("розминка"))).toBe(true);
    expect(issues.some((i) => i.includes("заминка"))).toBe(true);
  });
  it("забагато мобіліті в тренувальному дні, але не у mobility-дні", () => {
    const heavy = { main: [...four, mob("x"), mob("y")], warmup: [mob("a")], cooldown: [mob("b")] };
    expect(qualityDay(day(heavy), "d").some((i) => i.includes("mobility"))).toBe(true);
    expect(qualityDay(day({ ...heavy, type: "mobility" }), "d").some((i) => i.includes("mobility"))).toBe(false);
  });
  it("short_time: жорсткіші ліміти розминки/заминки, менше основних", () => {
    const short = day({ main: four.slice(0, 3), warmup: [mob("a"), mob("b")], cooldown: [mob("c")] });
    expect(qualityDay(short, "d", "short_time").some((i) => i.includes("розминка"))).toBe(true);
    expect(qualityDay(short, "d")).toHaveLength(1); // у звичайному режимі: лише «мало основних»
  });
  it("fatigued: мобіліті — це норма", () => {
    const rest = day({ type: "mixed", main: [mob("a"), mob("b"), mob("c")], warmup: [mob("d")], cooldown: [mob("e")] });
    expect(qualityDay(rest, "d", "fatigued")).toEqual([]);
  });
});

describe("qualityWeek", () => {
  const four = [ex(), ex({ name: "Віджимання", equipmentIds: [] }), ex({ name: "Присідання", equipmentIds: [] }), ex({ name: "Планка", equipmentIds: [] })];
  const full = (over: Partial<AiDay> = {}) => day({ main: four, ...over });
  const week = (days: AiDay[]): AiWeek => ({
    summary: "Тиждень з упором на силу.",
    days: days.map((d, weekday) => ({ ...d, weekday })),
  });

  it("не більше одного mobility-дня", () => {
    const w = week([full(), full(), full({ type: "mobility" }), full({ type: "mobility" }), full()]);
    expect(qualityWeek(w).some((i) => i.includes("mobility"))).toBe(true);
    const ok = week([full(), full(), full({ type: "mobility" }), full(), full()]);
    expect(qualityWeek(ok)).toEqual([]);
  });
  it("кожен силовий предмет має бути в основному блоці тижня", () => {
    const w = week([full(), full(), full(), full(), full()]); // тільки E1
    const issues = qualityWeek(w, {
      required: [
        { alias: "E1", name: "Турнік" },
        { alias: "E2", name: "Бруси" },
      ],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("Бруси");
  });
  it("предмет лише в розминці не рахується", () => {
    const w = week([full({ warmup: [ex({ equipmentIds: ["E2"] })] }), full(), full(), full(), full()]);
    expect(qualityWeek(w, { required: [{ alias: "E2", name: "Бруси" }] })).toHaveLength(1);
  });
});

describe("gearIssues (вигаданий інвентар)", () => {
  const owned = "Турнік настінний Гантеля розбірна";
  it("ловить бруси, штангу, лаву, гирю, якщо їх немає", () => {
    expect(gearIssues(ex({ name: "Підйом ніг на брусах" }), owned, "x")).toHaveLength(1);
    expect(gearIssues(ex({ tip: "Ляжте на лавку і візьміть штангу" }), owned, "x")).toHaveLength(2);
    expect(gearIssues(ex({ name: "Мах гирі" }), owned, "x")).toHaveLength(1);
  });
  it("не чіпає наявні предмети та схожі слова", () => {
    expect(gearIssues(ex({ name: "Віджимання від брусів" }), "Бруси паралельні", "x")).toEqual([]);
    // «плавні» містить «лав», але це не лава
    expect(gearIssues(ex({ name: "Плавні випади", tip: "Рухайтесь плавно, не кваптесь, спина рівна." }), owned, "x")).toEqual([]);
  });
  it("qualityDay перевіряє, лише коли передано перелік наявного", () => {
    const withBars = day({ main: [ex({ name: "Віджимання на брусах" }), ex(), ex(), ex()] });
    expect(qualityDay(withBars, "d").length).toBe(0);
    expect(qualityDay(withBars, "d", undefined, owned).length).toBe(1);
  });
});

describe("qualityWeek: рівень, турнік і бруси", () => {
  const mk = (name: string, sets: number) => ex({ name, sets, equipmentIds: [] });
  const wk = (mainNames: [string, number][]): AiWeek => ({
    summary: "Тиждень з упором на силу.",
    days: [0, 1, 2, 3, 4].map((weekday) => ({
      ...day({ main: mainNames.map(([n, s]) => mk(n, s)) }),
      weekday,
    })),
  });
  const wall = "Шведська стінка з пластиковими перекладинами турнік брусья";

  it("середній рівень із самими 3 підходами — зауваження; з 4 — ні", () => {
    const flat = wk([["Присідання", 3], ["Віджимання", 3], ["Планка", 3], ["Випади", 3]]);
    expect(qualityWeek(flat, { level: "intermediate" }).some((i) => i.includes("4+ підходи"))).toBe(true);
    expect(qualityWeek(flat, { level: "beginner" })).toEqual([]);
    const heavy = wk([["Присідання", 4], ["Віджимання", 4], ["Планка", 3], ["Випади", 3]]);
    expect(qualityWeek(heavy, { level: "intermediate" })).toEqual([]);
  });
  it("є турнік і бруси — потрібні повні підтягування й віджимання на брусах", () => {
    const w = wk([["Австралійські підтягування", 4], ["Горизонтальні підтягування", 4], ["Присідання", 4], ["Планка", 4]]);
    const issues = qualityWeek(w, { level: "intermediate", ownedText: wall });
    expect(issues.some((i) => i.includes("підтягування"))).toBe(true);
    expect(issues.some((i) => i.includes("бруси") || i.includes("брусах"))).toBe(true);
    const ok = wk([["Підтягування середнім хватом", 4], ["Віджимання на брусах", 4], ["Присідання", 4], ["Планка", 4]]);
    expect(qualityWeek(ok, { level: "intermediate", ownedText: wall })).toEqual([]);
  });
  it("новачку повні підтягування й бруси не нав'язуються", () => {
    const w = wk([["Австралійські підтягування", 3], ["Присідання", 3], ["Планка", 3], ["Випади", 3]]);
    expect(qualityWeek(w, { level: "beginner", ownedText: wall })).toEqual([]);
  });
  it("без турніка й брусів нічого не вимагається", () => {
    const w = wk([["Присідання", 4], ["Віджимання", 4], ["Планка", 4], ["Випади", 4]]);
    expect(qualityWeek(w, { level: "advanced", ownedText: "Гантеля" })).toEqual([]);
  });
});

describe("qualityWeek: власне кардіо атлета", () => {
  const cardio = ex({ name: "Велотренажер, рівний темп", type: "cardio", equipmentIds: [], sets: null, reps: null, durationSec: 2400 });
  const base = [ex({ equipmentIds: [] }), ex({ equipmentIds: [] }), ex({ equipmentIds: [] }), ex({ equipmentIds: [] })];
  const wk = (cardioDays: number): AiWeek => ({
    summary: "Тиждень.",
    days: [0, 1, 2, 3, 4].map((weekday) => ({ ...day({ main: weekday < cardioDays ? [...base, cardio] : base }), weekday })),
  });
  it("вимагає кардіо в плані, якщо атлет його робить", () => {
    expect(qualityWeek(wk(1), { routine: "щодня 45 хв велотренажер" }).some((i) => i.includes("кардіо"))).toBe(true);
    // 3 дні × 40 хв = 120 хв: днів досить, хвилин замало
    const mins = qualityWeek(wk(3), { routine: "щодня 45 хв велотренажер" });
    expect(mins).toHaveLength(1);
    expect(mins[0]).toContain("150 хв");
  });
  it("кардіо 4 × 40 хв проходить", () => {
    expect(qualityWeek(wk(4), { routine: "щодня 45 хв велотренажер" })).toEqual([]);
  });
  it("не вимагає, якщо кардіо у звичках немає", () => {
    expect(qualityWeek(wk(0), { routine: "підтягування на турніку" })).toEqual([]);
    expect(qualityWeek(wk(0), { routine: "" })).toEqual([]);
  });
});
