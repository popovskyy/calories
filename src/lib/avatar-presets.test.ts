import { describe, expect, it } from "vitest";
import {
  mascotAssetPath,
  parsePresetId,
  toPresetUrl,
} from "@/lib/avatar-presets";

describe("аватари", () => {
  it("парсить preset:id", () => {
    expect(parsePresetId(toPresetUrl("kiwi"))).toBe("kiwi");
    expect(parsePresetId(toPresetUrl("pepa_pig"))).toBe("pepa_pig");
    expect(parsePresetId("/mascots/fish.svg")).toBeNull();
  });

  it("builtin малює сам SVG, без мережевого ассета", () => {
    expect(mascotAssetPath("kiwi", "builtin")).toBeNull();
  });

  it("file-скіни беруть файл з /mascots", () => {
    expect(mascotAssetPath("fish", "file")).toBe("/mascots/fish.svg");
  });

  it("inline (Пепа) не ходить у видалений /api/skins, а вбудовує SVG", () => {
    const src = mascotAssetPath("pepa_pig", "inline");
    expect(src).toMatch(/^data:image\/svg\+xml/);
    expect(src).not.toContain("/api/skins");
    expect(decodeURIComponent(src!.split(",")[1] ?? "")).toContain("<svg");
  });
});
