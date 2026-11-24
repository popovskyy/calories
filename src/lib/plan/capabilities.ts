/**
 * Що реально вміє інвентар, коли це написано не в назві, а в описі. Приклад із життя: «Шведська стінка …
 * з пластиковими перекладинами», detail = «турнік брусья». Модель бачила це, але вважала її драбиною й ставила
 * лише австралійські підтягування — ні справжніх підтягувань, ні віджимань на брусах.
 */
export interface Capabilities {
  /** Є турнік (повні підтягування, вис). */
  pullBar: boolean;
  /** Є паралельні бруси (віджимання на брусах, підйоми ніг в упорі). */
  dipBars: boolean;
}

export function detectCapabilities(ownedText: string): Capabilities {
  return {
    pullBar: /турні[кч]|турник|pull[- ]?up bar|horizontal bar/iu.test(ownedText),
    dipBars: /(^|[^\p{L}])брус|parallel bars|dip (bars|station)/iu.test(ownedText),
  };
}

/** У власних заняттях атлета є кардіо (велотренажер, біг тощо) — тоді воно має з'явитись у плані. */
export function routineMentionsCardio(routine: string): boolean {
  return /кардіо|велотренаж|велосипед|(^|[^\p{L}])вело([^\p{L}]|$)|(^|[^\p{L}])біг|бігов|ходьб|плав(ан|аю|анн)|еліпс|орбітрек|скакалк|кросфіт|hiit/iu.test(routine);
}

/** Назва вправи — справжнє підтягування (не австралійське / горизонтальне / негативне). */
export function isFullPullUp(name: string): boolean {
  return /(^|[^\p{L}])підтягуван/iu.test(name) && !/австралійськ|горизонтальн|під кутом|низьк|негатив|стрибк/iu.test(name);
}

/** Назва вправи — віджимання/робота саме на брусах. */
export function isDipExercise(name: string): boolean {
  return /віджиман\p{L}*\s+(на|від)\s+брус|(^|[^\p{L}])dips?([^\p{L}]|$)|на\s+брус/iu.test(name);
}
