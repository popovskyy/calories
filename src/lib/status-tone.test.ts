import { describe, expect, it } from "vitest";
import type { CalorieStance } from "@/lib/calories";
import type { DayStatus } from "@/lib/types";
import {
  dayStatusTone,
  liveDayTone,
  stanceTone,
  toneBg,
  toneColor,
  type StatusTone,
} from "@/lib/status-tone";

const TARGET = 1968;
const MAINTENANCE = 2300;

describe("toneColor / toneBg", () => {
  it("кожен тон має свою змінну, теми міняють значення — не мапінг", () => {
    expect(toneColor("good")).toBe("var(--color-green)");
    expect(toneColor("edge")).toBe("var(--color-amber)");
    expect(toneColor("bad")).toBe("var(--color-red)");
  });

  it("тони не збігаються між собою", () => {
    const tones: StatusTone[] = ["good", "edge", "bad", "neutral"];
    expect(new Set(tones.map(toneColor)).size).toBe(tones.length);
  });

  it("підкладка — той самий колір, лише прозоріший", () => {
    expect(toneBg("edge")).toContain("var(--color-amber)");
    expect(toneBg("edge")).toContain("18%");
    expect(toneBg("edge", 30)).toContain("30%");
  });
});

describe("dayStatusTone", () => {
  it("покриває всі значення DayStatus", () => {
    const all: DayStatus[] = ["green", "amber", "red"];
    expect(all.map(dayStatusTone)).toEqual(["good", "edge", "bad"]);
  });
});

describe("stanceTone — ціль «схуднути»", () => {
  it("у плані — зелений", () => {
    expect(stanceTone("on_plan", "deficit")).toBe("good");
  });

  /**
   * Суть шкали цього застосунку: між денною ціллю і підтримкою дефіцит ще Є.
   * Фарбувати це червоним означало б лякати людину, яка насправді худне —
   * саме від цієї плутанини стереже окремий абзац у промптах ШІ.
   */
  it("м'який дефіцит і близько-до-підтримки — бурштин, не червоний", () => {
    expect(stanceTone("shallow", "deficit")).toBe("edge");
    expect(stanceTone("maintenance", "deficit")).toBe("edge");
  });

  it("глибший за план дефіцит теж бурштин — це не «краще за зелене»", () => {
    expect(stanceTone("deep", "deficit")).toBe("edge");
  });

  it("червоний лишається за профіцитом НАД ПІДТРИМКОЮ", () => {
    expect(stanceTone("surplus", "deficit")).toBe("bad");
  });

  it("без даних — нейтральний, а не зелений", () => {
    expect(stanceTone("unknown", "deficit")).toBe("neutral");
  });
});

describe("stanceTone — ціль «тримати вагу»", () => {
  it("біля норми — зелений, профіцит — червоний, решта — межа", () => {
    expect(stanceTone("on_plan", "maintain")).toBe("good");
    expect(stanceTone("surplus", "maintain")).toBe("bad");
    expect(stanceTone("deep", "maintain")).toBe("edge");
  });
});

describe("stanceTone — повнота", () => {
  it("жоден темп не лишається без тону", () => {
    const all: CalorieStance[] = [
      "on_plan",
      "shallow",
      "maintenance",
      "surplus",
      "deep",
    ];
    for (const goal of ["deficit", "maintain"] as const) {
      for (const s of all) {
        expect(stanceTone(s, goal), `${goal}/${s}`).toBeTruthy();
      }
    }
  });
});

describe("liveDayTone", () => {
  it("під ціллю — зелений", () => {
    expect(liveDayTone(400, TARGET, MAINTENANCE, "deficit")).toBe("good");
    expect(liveDayTone(TARGET, TARGET, MAINTENANCE, "deficit")).toBe("good");
  });

  it("між ціллю і підтримкою на дефіциті — бурштин", () => {
    expect(liveDayTone(TARGET + 1, TARGET, MAINTENANCE, "deficit")).toBe("edge");
    expect(liveDayTone(MAINTENANCE, TARGET, MAINTENANCE, "deficit")).toBe("edge");
  });

  it("над підтримкою — червоний", () => {
    expect(liveDayTone(MAINTENANCE + 1, TARGET, MAINTENANCE, "deficit")).toBe("bad");
  });

  it("на цілі «тримати вагу» бурштинової зони немає — одразу червоний", () => {
    expect(liveDayTone(TARGET + 1, TARGET, MAINTENANCE, "maintain")).toBe("bad");
  });

  it("без підтримки не вигадує бурштин", () => {
    expect(liveDayTone(TARGET + 1, TARGET, null, "deficit")).toBe("bad");
  });

  it("без норми — нейтральний, а не зелений", () => {
    expect(liveDayTone(0, 0, MAINTENANCE, "deficit")).toBe("neutral");
  });

  it("та сама межа, що й у денного стовпчика (плашка й бар не сперечаються)", () => {
    // dashboard/route.ts: green ≤ ціль, amber ≤ підтримка на дефіциті, далі red
    expect(liveDayTone(TARGET, TARGET, MAINTENANCE, "deficit")).toBe(
      dayStatusTone("green"),
    );
    expect(liveDayTone(MAINTENANCE, TARGET, MAINTENANCE, "deficit")).toBe(
      dayStatusTone("amber"),
    );
    expect(liveDayTone(MAINTENANCE + 500, TARGET, MAINTENANCE, "deficit")).toBe(
      dayStatusTone("red"),
    );
  });
});
