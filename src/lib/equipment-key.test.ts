import { describe, expect, it } from "vitest";
import { equipmentKey } from "./equipment-key";

describe("equipmentKey", () => {
  it("ігнорує регістр, дужки та порядок слів", () => {
    expect(equipmentKey("Гантеля розбірна (до 13 кг)")).toBe(equipmentKey("розбірна гантеля"));
  });
  it("різні предмети мають різні ключі", () => {
    expect(equipmentKey("Турнік")).not.toBe(equipmentKey("Бруси"));
  });
  it("пунктуація й подвійні пробіли не впливають", () => {
    expect(equipmentKey("М’які  мати / килимок")).toBe(equipmentKey("мати килимок м’які"));
  });
  it("порожній ввід → порожній ключ", () => {
    expect(equipmentKey("  (…)  ")).toBe("");
  });
});
