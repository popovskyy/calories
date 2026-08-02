import { describe, expect, it } from "vitest";
import { closedDaysUk, formatTargetBalance } from "@/components/WeightGoalCard";

const TARGET = 1968;

describe("formatTargetBalance", () => {
  it("без даних або без закритих днів — нічого не показуємо", () => {
    expect(formatTargetBalance(null, TARGET, 6)).toBeNull();
    expect(formatTargetBalance(362, TARGET, 0)).toBeNull();
  });

  /**
   * «Профіцит» і «дефіцит» у цьому застосунку означають відношення до
   * ПІДТРИМКИ (див. classifyLedgerStance і блок «дві шкали» в промптах).
   * Тут же йдеться про денну ціль, тож ці слова вживати не можна: людина,
   * що їсть трохи над ціллю, але під підтримкою, — худне, і називати це
   * «профіцитом» означало б суперечити сусідньому блоку «м'який дефіцит».
   */
  it("не називає перевищення денної цілі профіцитом", () => {
    const s = formatTargetBalance(362, TARGET, 6)!;
    expect(s).toContain("Над денною ціллю");
    expect(s.toLowerCase()).not.toContain("профіцит");
  });

  it("не називає недобір до денної цілі дефіцитом", () => {
    const s = formatTargetBalance(-800, TARGET, 6)!;
    expect(s).toContain("Під денною ціллю");
    expect(s.toLowerCase()).not.toContain("дефіцит");
  });

  it("показує знак і величину відхилення", () => {
    expect(formatTargetBalance(362, TARGET, 6)).toContain("+362");
    expect(formatTargetBalance(-800, TARGET, 6)).toContain("−800");
  });

  it("біля цілі — окреме формулювання без числа", () => {
    const s = formatTargetBalance(30, TARGET, 6)!;
    expect(s).toContain("Біля денної цілі");
    expect(s).not.toContain("≈ +");
  });

  it("кількість закритих днів у правильному відмінку і порядку слів", () => {
    // Раніше сусідній рядок давав «6 днів закритих» — калька з порядку полів.
    expect(formatTargetBalance(362, TARGET, 1)).toContain("1 закритий день");
    expect(formatTargetBalance(362, TARGET, 3)).toContain("3 закриті дні");
    expect(formatTargetBalance(362, TARGET, 6)).toContain("6 закритих днів");
  });
});

describe("closedDaysUk", () => {
  it("узгоджує прикметник разом з іменником", () => {
    expect(closedDaysUk(1)).toBe("1 закритий день");
    expect(closedDaysUk(2)).toBe("2 закриті дні");
    expect(closedDaysUk(4)).toBe("4 закриті дні");
    expect(closedDaysUk(5)).toBe("5 закритих днів");
  });

  it("підлітки 11–14 — виняток, а не «1 закритий день»", () => {
    expect(closedDaysUk(11)).toBe("11 закритих днів");
    expect(closedDaysUk(12)).toBe("12 закритих днів");
    expect(closedDaysUk(14)).toBe("14 закритих днів");
  });

  it("після сотні відмінок повертається за останньою цифрою", () => {
    expect(closedDaysUk(21)).toBe("21 закритий день");
    expect(closedDaysUk(22)).toBe("22 закриті дні");
    expect(closedDaysUk(25)).toBe("25 закритих днів");
    expect(closedDaysUk(111)).toBe("111 закритих днів");
  });
});
