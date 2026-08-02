import { describe, expect, it } from "vitest";
import { shiftYMD } from "@/lib/date";
import {
  SHIELDABLE_LOOKBACK_DAYS,
  STREAK_LOOKBACK_DAYS,
  coversDay,
  shieldableDays,
  streakFrom,
  type DayCoverage,
} from "@/lib/streak-core";

const TODAY = "2026-08-02";
const d = (back: number) => shiftYMD(TODAY, -back);

/** Покриття з переліку «скільки днів тому». */
function cov(loggedBack: number[], shieldedBack: number[] = []): DayCoverage {
  return {
    logged: new Set(loggedBack.map(d)),
    shielded: new Set(shieldedBack.map(d)),
  };
}

describe("streakFrom", () => {
  it("порожня історія — нуль", () => {
    const r = streakFrom(cov([]), TODAY);
    expect(r.streak).toBe(0);
    expect(r.todayLogged).toBe(false);
  });

  it("тільки сьогодні — серія 1", () => {
    const r = streakFrom(cov([0]), TODAY);
    expect(r.streak).toBe(1);
    expect(r.todayLogged).toBe(true);
  });

  it("рахує дні підряд від сьогодні", () => {
    expect(streakFrom(cov([0, 1, 2, 3, 4]), TODAY).streak).toBe(5);
  });

  it("зранку серія тримається на вчорашньому дні", () => {
    // Гравець ще нічого не записав сьогодні — лічильник не має обнулятись,
    // інакше кожен ранок виглядав би як зрив.
    const r = streakFrom(cov([1, 2, 3]), TODAY);
    expect(r.streak).toBe(3);
    expect(r.todayLogged).toBe(false);
  });

  it("порожні і сьогодні, і вчора — серії немає", () => {
    expect(streakFrom(cov([2, 3, 4]), TODAY).streak).toBe(0);
  });

  it("діра всередині обриває рахунок саме на ній", () => {
    // є 0,1,2, немає 3, є 4,5 — серія 3, а не 5
    expect(streakFrom(cov([0, 1, 2, 4, 5]), TODAY).streak).toBe(3);
  });

  it("щит закриває діру і серія триває наскрізь", () => {
    expect(streakFrom(cov([0, 1, 3, 4], [2]), TODAY).streak).toBe(5);
  });

  it("щит на сьогодні не робить день «залогованим»", () => {
    const r = streakFrom(cov([1], [0]), TODAY);
    expect(r.streak).toBe(2);
    expect(r.todayLogged).toBe(false);
  });

  it("щит зранку тримає серію так само, як їжа", () => {
    expect(streakFrom(cov([2, 3], [1]), TODAY).streak).toBe(3);
  });

  it("не зациклюється на суцільній історії і не пробиває стелю", () => {
    const all = Array.from({ length: STREAK_LOOKBACK_DAYS + 50 }, (_, i) => i);
    expect(streakFrom(cov(all), TODAY).streak).toBe(STREAK_LOOKBACK_DAYS);
  });
});

describe("coversDay", () => {
  it("їжа або щит — обидва закривають день", () => {
    const c = cov([1], [2]);
    expect(coversDay(c, d(1))).toBe(true);
    expect(coversDay(c, d(2))).toBe(true);
    expect(coversDay(c, d(3))).toBe(false);
  });
});

describe("shieldableDays", () => {
  it("без щитів нічого не витрачаємо", () => {
    expect(shieldableDays(cov([2, 3]), TODAY, 0)).toEqual([]);
  });

  it("латає вчорашню діру, якщо серія до неї була", () => {
    expect(shieldableDays(cov([2, 3, 4]), TODAY, 1)).toEqual([d(1)]);
  });

  it("не витрачає щит на день, який і так покритий", () => {
    expect(shieldableDays(cov([1, 2, 3]), TODAY, 2)).toEqual([]);
  });

  it("не витрачає щит, коли серії вже немає", () => {
    // Порожньо і позавчора, і перед ним — латати нічого, і щит має лишитись
    // в інвентарі: інакше гравець платить за те, що нічого не рятує.
    expect(shieldableDays(cov([]), TODAY, 2)).toEqual([]);
  });

  it("латає від найдавнішої діри до найновішої", () => {
    // Є день −3, порожні −2 і −1: обидва треба зшити, починаючи з давнішого.
    expect(shieldableDays(cov([3]), TODAY, 2)).toEqual([d(2), d(1)]);
  });

  it("зшивання каскадне: закритий позавчорашній день робить вчорашній латабельним", () => {
    // Якби порядок був зворотний, вчорашня діра відкинулась би як «серії
    // немає», і один щит згорів би намарне.
    const picked = shieldableDays(cov([3]), TODAY, 2);
    expect(picked[0]).toBe(d(2));
    expect(picked[1]).toBe(d(1));
  });

  it("не бере більше щитів, ніж є в інвентарі", () => {
    expect(shieldableDays(cov([3]), TODAY, 1)).toEqual([d(2)]);
  });

  it("не лізе глибше за дозволене вікно", () => {
    const picked = shieldableDays(cov([9]), TODAY, 5);
    expect(picked.length).toBeLessThanOrEqual(SHIELDABLE_LOOKBACK_DAYS);
    // Тиждень відсутності двома щитами не зшиєш — серія втрачена по суті.
    expect(picked).toEqual([]);
  });

  it("сьогоднішній день не латається — він ще не закритий", () => {
    expect(shieldableDays(cov([1, 2]), TODAY, 2)).toEqual([]);
  });

  it("після латання серія справді відновлюється", () => {
    const before = cov([3, 4, 5]);
    expect(streakFrom(before, TODAY).streak).toBe(0);

    const picked = shieldableDays(before, TODAY, 2);
    const after: DayCoverage = {
      logged: before.logged,
      shielded: new Set([...before.shielded, ...picked]),
    };
    // −2 і −1 закриті щитами, далі йдуть −3, −4, −5 → 5 днів поспіль.
    expect(streakFrom(after, TODAY).streak).toBe(5);
  });
});
