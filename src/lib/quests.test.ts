import { describe, expect, it } from "vitest";
import { shiftYMD, weekStartYMD } from "@/lib/date";
import { QUEST_POOL, seededPick } from "@/lib/quests";

const MONDAY = weekStartYMD("2026-01-05");
/** Два роки — достатньо, щоб побачити, чи весь пул реально крутиться. */
const WEEKS = 104;

function weeks(count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftYMD(MONDAY, i * 7));
}

describe("QUEST_POOL", () => {
  it("коди унікальні", () => {
    const codes = QUEST_POOL.map((q) => q.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("у кожного квеста додатні ціль і нагорода", () => {
    for (const q of QUEST_POOL) {
      expect(q.target, q.code).toBeGreaterThan(0);
      expect(q.rewardCoins, q.code).toBeGreaterThan(0);
    }
  });

  it("є щонайменше один квест «в цілі» — інакше seededPick нічого не гарантує", () => {
    expect(QUEST_POOL.some((q) => q.kind === "in_target_days")).toBe(true);
  });
});

describe("seededPick", () => {
  it("завжди рівно стільки квестів, скільки просили", () => {
    for (const ws of weeks(20)) {
      expect(seededPick(ws, 3)).toHaveLength(3);
    }
  });

  it("без дублів у межах тижня", () => {
    for (const ws of weeks(WEEKS)) {
      const codes = seededPick(ws, 3).map((q) => q.code);
      expect(new Set(codes).size, ws).toBe(codes.length);
    }
  });

  it("щотижня є квест «в цілі»", () => {
    for (const ws of weeks(WEEKS)) {
      const picked = seededPick(ws, 3);
      expect(picked.some((q) => q.kind === "in_target_days"), ws).toBe(true);
    }
  });

  it("детермінований: той самий тиждень — той самий набір", () => {
    const ws = weeks(1)[0]!;
    expect(seededPick(ws, 3)).toEqual(seededPick(ws, 3));
  });

  /**
   * Контракт: на вхід іде саме weekStart (так кличе ensureWeekQuests).
   * `weekIndex` рахує тижні від епохи, а 1970-01-01 був четвергом — тож сітка
   * індексів ріже по четвергах, і довільна дата всередині тижня дала б інший
   * набір. Нормалізація через weekStartYMD обовʼязкова.
   */
  it("будь-який день тижня, зведений до weekStart, дає той самий набір", () => {
    const monday = MONDAY;
    for (let i = 0; i < 7; i++) {
      const someDay = shiftYMD(monday, i);
      expect(seededPick(weekStartYMD(someDay), 3), someDay).toEqual(
        seededPick(monday, 3),
      );
    }
  });

  it("sortOrder проставляється по порядку", () => {
    expect(seededPick(MONDAY, 3).map((q) => q.sortOrder)).toEqual([10, 20, 30]);
  });

  /**
   * Регресія на реальний баг: shuffle був `j = (idx*17 + i*31) % (i+1)`, що
   * згорталось до одного числа за різними модулями. За два роки sniper_5
   * випадав 60 разів, а protein_5 і marathon_150 — по 4, тобто половина пулу
   * була мертвим контентом. На око це не видно: щотижня «якісь інші квести».
   */
  it("крутить ВЕСЬ пул, а не лише його початок", () => {
    const freq = new Map<string, number>(QUEST_POOL.map((q) => [q.code, 0]));
    for (const ws of weeks(WEEKS)) {
      for (const q of seededPick(ws, 3)) {
        freq.set(q.code, (freq.get(q.code) ?? 0) + 1);
      }
    }
    const counts = [...freq.values()];
    const rarest = Math.min(...counts);
    const rarestCode = [...freq.entries()].find(([, n]) => n === rarest)?.[0];
    // Стара формула давала тут 4. Поріг із запасом: важливо, щоб жоден квест
    // не був фактично недосяжним.
    expect(rarest, `найрідший квест: ${rarestCode}`).toBeGreaterThanOrEqual(10);
  });

  it("не залипає на одному наборі з тижня в тиждень", () => {
    const sets = new Set(
      weeks(WEEKS).map((ws) =>
        seededPick(ws, 3)
          .map((q) => q.code)
          .sort()
          .join(","),
      ),
    );
    expect(sets.size).toBeGreaterThan(WEEKS / 3);
  });

  it("сусідні тижні майже завжди різні", () => {
    const all = weeks(WEEKS).map((ws) => seededPick(ws, 3).map((q) => q.code).join(","));
    const repeats = all.filter((s, i) => i > 0 && s === all[i - 1]).length;
    expect(repeats).toBeLessThanOrEqual(WEEKS / 20);
  });
});
