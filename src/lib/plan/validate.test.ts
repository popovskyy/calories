import { describe, expect, it } from "vitest";
import type { AiDay, AiExercise, AiWeek } from "@/lib/gemini/schemas";
import { validateDay, validateExercise, validateWeek } from "./validate";

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
  tip: "Без ривків",
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
