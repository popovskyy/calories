import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateLong,
  relativeDayLabel,
  defaultWeekStart,
  formatWeekRange,
  isISODate,
  isMonday,
  mondayOf,
  todayISO,
  weekdayIndex,
} from "./dates";

describe("dates", () => {
  it("weekdayIndex: Пн=0 … Нд=6", () => {
    expect(weekdayIndex("2026-11-23")).toBe(0); // понеділок
    expect(weekdayIndex("2026-11-27")).toBe(4); // п’ятниця
    expect(weekdayIndex("2026-11-29")).toBe(6); // неділя
  });

  it("mondayOf повертає понеділок того ж тижня", () => {
    expect(mondayOf("2026-11-23")).toBe("2026-11-23");
    expect(mondayOf("2026-11-26")).toBe("2026-11-23");
    expect(mondayOf("2026-11-29")).toBe("2026-11-23");
    expect(isMonday(mondayOf("2026-12-02"))).toBe(true);
  });

  it("addDays переходить через межу місяця й року", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("addDays не ламається на переході на літній час (DST)", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("defaultWeekStart: будні → цей тиждень, вихідні → наступний", () => {
    expect(defaultWeekStart("2026-11-23")).toBe("2026-11-23"); // Пн
    expect(defaultWeekStart("2026-11-27")).toBe("2026-11-23"); // Пт
    expect(defaultWeekStart("2026-11-28")).toBe("2026-11-30"); // Сб
    expect(defaultWeekStart("2026-11-29")).toBe("2026-11-30"); // Нд
  });

  it("isISODate відсікає неіснуючі дати та сміття", () => {
    expect(isISODate("2026-11-23")).toBe(true);
    expect(isISODate("2026-02-31")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
    expect(isISODate("23.11.2026")).toBe(false);
    expect(isISODate(20261123)).toBe(false);
  });

  it("todayISO використовує локальні компоненти, а не UTC", () => {
    // 23:30 локально — дата лишається локальною, незалежно від зсуву пояса
    expect(todayISO(new Date(2026, 10, 23, 23, 30))).toBe("2026-11-23");
    expect(todayISO(new Date(2026, 10, 24, 0, 5))).toBe("2026-11-24");
  });

  it("formatWeekRange: у межах місяця й через місяць", () => {
    expect(formatWeekRange("2026-11-23")).toBe("23–27 лис");
    expect(formatWeekRange("2026-11-30")).toBe("30 лис – 4 гру");
  });

  it("formatDateLong: повна назва дня + дата, у т.ч. вихідні", () => {
    expect(formatDateLong("2026-11-23")).toBe("Понеділок, 23 лис");
    expect(formatDateLong("2026-11-28")).toBe("Субота, 28 лис");
  });

  it("relativeDayLabel: сьогодні/завтра/вчора, далі — null", () => {
    expect(relativeDayLabel("2026-11-23", "2026-11-23")).toBe("Сьогодні");
    expect(relativeDayLabel("2026-11-24", "2026-11-23")).toBe("Завтра");
    expect(relativeDayLabel("2026-11-22", "2026-11-23")).toBe("Вчора");
    expect(relativeDayLabel("2026-11-26", "2026-11-23")).toBeNull();
  });
});
