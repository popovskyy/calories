import { describe, expect, it } from "vitest";
import {
  DEFAULT_AVATAR_ID,
  isAllowedAvatarUrl,
  mascotAssetPath,
  normalizeAvatarUrl,
  parsePresetId,
  toPresetUrl,
} from "@/lib/avatar-presets";

describe("аватари", () => {
  it("парсить preset:id", () => {
    expect(parsePresetId(toPresetUrl("kiwi"))).toBe("kiwi");
    expect(parsePresetId("/mascots/fish.svg")).toBeNull();
  });

  it("builtin малює сам SVG, без мережевого ассета", () => {
    expect(mascotAssetPath("kiwi", "builtin")).toBeNull();
  });

  it("file-скіни беруть файл з /mascots", () => {
    expect(mascotAssetPath("fish", "file")).toBe("/mascots/fish.svg");
  });

  it("прибрану Пепу замінює на дефолт і не дозволяє обрати", () => {
    expect(normalizeAvatarUrl("preset:pepa_pig")).toBe(toPresetUrl(DEFAULT_AVATAR_ID));
    expect(isAllowedAvatarUrl("preset:pepa_pig")).toBe(false);
    expect(isAllowedAvatarUrl("preset:kiwi")).toBe(true);
  });
});
