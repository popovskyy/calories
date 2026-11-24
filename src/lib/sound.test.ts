import { describe, expect, it } from "vitest";
import { SOUND_MODES, stepThresholds } from "./sound";

describe("sound steps", () => {
  it.each(["notes", "pulse"] as const)("%s: пороги зростають у межах 0…1, перший — одразу, проміжки скорочуються", (mode) => {
    const p = stepThresholds(mode);
    expect(p.length).toBeGreaterThanOrEqual(8);
    expect(p[0]).toBe(0);
    expect(p.at(-1)!).toBeLessThan(1);
    const gaps = p.slice(1).map((v, i) => v - p[i]);
    expect(gaps.every((g) => g > 0.03)).toBe(true); // кроки не злипаються
    expect(gaps.at(-1)!).toBeLessThan(gaps[0]); // пришвидшення до фіналу
  });
  it("finale й off не мають кроків під час утримання", () => {
    expect(stepThresholds("finale")).toEqual([]);
    expect(stepThresholds("off")).toEqual([]);
  });
  it("усі режими описані для екрана вибору", () => {
    expect(SOUND_MODES.map((m) => m.id).sort()).toEqual(["finale", "notes", "off", "pulse"]);
  });
});
