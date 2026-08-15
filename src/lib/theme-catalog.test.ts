import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  THEMES,
  getTheme,
  isThemeId,
} from "@/lib/theme-catalog";

describe("theme-catalog", () => {
  it("має рівно три активні теми", () => {
    expect(THEMES.map((t) => t.id).sort()).toEqual(
      ["forest", "minecraft", "nocturne"].sort(),
    );
    expect(THEMES.every((t) => t.tier === "free")).toBe(true);
  });

  it("відхиляє зняті теми", () => {
    expect(isThemeId("lighthouse")).toBe(false);
    expect(isThemeId("polonyna")).toBe(false);
    expect(isThemeId("abyss")).toBe(false);
  });

  it("невідома тема → nocturne", () => {
    expect(DEFAULT_THEME).toBe("nocturne");
    expect(getTheme("nope").id).toBe("nocturne");
  });
});
