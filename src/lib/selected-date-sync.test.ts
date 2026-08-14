import { describe, expect, it } from "vitest";
import { selectedDateAfterCalendarDayChange } from "@/lib/selected-date-sync";

describe("selectedDateAfterCalendarDayChange", () => {
  it("оновлює «сьогодні» після зміни календарного дня", () => {
    expect(
      selectedDateAfterCalendarDayChange("2026-08-13", "2026-08-13", "2026-08-14"),
    ).toBe("2026-08-14");
  });

  it("не чіпає дату, якщо день не змінився", () => {
    expect(
      selectedDateAfterCalendarDayChange("2026-08-14", "2026-08-14", "2026-08-14"),
    ).toBeNull();
  });

  it("не чіпає архів, якщо користувач дивився минулий день", () => {
    expect(
      selectedDateAfterCalendarDayChange("2026-08-12", "2026-08-13", "2026-08-14"),
    ).toBeNull();
  });

  it("не чіпає, якщо користувач вручну перейшов на інший день того ж дня", () => {
    expect(
      selectedDateAfterCalendarDayChange("2026-08-12", "2026-08-13", "2026-08-13"),
    ).toBeNull();
  });
});
