/**
 * Епічні квести — «Хроніки». Довгий горизонт, якого в грі не було зовсім:
 * був тільки тиждень, а після третього тижня попереду не лишалось нічого.
 *
 * Кожен епік має проміжні вузли, і кожен платить окремо — дорога ніколи не
 * буває порожньою. Активним може бути лише один (гравець обирає сам —
 * це автономія, а не розклад), крім вагового й контекстних, які йдуть фоном.
 */

/** Скільки ккал коштує кілометр ходьби для ~70 кг. */
export const KCAL_PER_KM = 55;
/** Скільки ккал коштує метр набраної висоти. */
export const KCAL_PER_VERTICAL_M = 1.2;

export type EpicKind =
  | "burn_distance" // км, рахуються зі спалених ккал
  | "burn_vertical" // метри висоти
  | "streak" // безперервна серія
  | "in_target_total" // днів у ±5% за все життя
  | "weight_loss" // кг від стартової ваги
  | "plateau"; // днів дисципліни під час плато

export interface EpicNode {
  /** Значення прогресу, на якому вузол спрацьовує. */
  at: number;
  nameUk: string;
  /** Короткий лор — заради нього гравець і рухається. */
  loreUk: string;
  coins: number;
}

export interface EpicDef {
  id: string;
  nameUk: string;
  tagline: string;
  kind: EpicKind;
  /** Фінальне значення шкали. */
  total: number;
  unit: string;
  icon: string;
  /**
   * Подарований стартовий прогрес (endowed progress effect).
   * Картка «2 з 12» завершується майже вдвічі частіше за «0 з 10» при тому
   * самому обсязі роботи — тож даємо перші кроки безкоштовно.
   */
  endowed: number;
  nodes: EpicNode[];
  /** Фонові епіки не займають активний слот. */
  background: boolean;
  /** Контекстні з'являються самі за умовою, у списку вибору їх немає. */
  contextual: boolean;
}

export const EPICS: EpicDef[] = [
  {
    id: "dnipro",
    nameUk: "Стежка Дніпром",
    tagline: "Київ → Канів, 105 км уздовж великої води",
    kind: "burn_distance",
    total: 105,
    unit: "км",
    icon: "🌊",
    endowed: 8,
    background: false,
    contextual: false,
    nodes: [
      {
        at: 35,
        nameUk: "Трипілля",
        loreUk: "Тут за п'ять тисяч років до тебе вже палили вогнища.",
        coins: 100,
      },
      {
        at: 70,
        nameUk: "Ржищів",
        loreUk: "Місто над кручами. Половина шляху позаду.",
        coins: 150,
      },
      {
        at: 105,
        nameUk: "Тарасова гора",
        loreUk: "Канів. Ти дійшов туди, куди більшість не виходить.",
        coins: 400,
      },
    ],
  },
  {
    id: "hoverla",
    nameUk: "Сходження на Говерлу",
    tagline: "2 061 метр угору, крок за кроком",
    kind: "burn_vertical",
    total: 2061,
    unit: "м",
    icon: "⛰️",
    endowed: 150,
    background: false,
    contextual: false,
    nodes: [
      {
        at: 600,
        nameUk: "Перший табір",
        loreUk: "Ліс закінчився. Далі — тільки вітер.",
        coins: 120,
      },
      {
        at: 1300,
        nameUk: "Полонина",
        loreUk: "Звідси видно, скільки вже пройдено.",
        coins: 200,
      },
      {
        at: 2061,
        nameUk: "Вершина",
        loreUk: "Найвища точка країни. Титул «Підкорювач» твій.",
        coins: 500,
      },
    ],
  },
  {
    id: "hundred_days",
    nameUk: "100 днів Волі",
    tagline: "Сто днів поспіль. Найпрестижніша дорога в грі",
    kind: "streak",
    total: 100,
    unit: "днів",
    icon: "🛡️",
    endowed: 0,
    background: false,
    contextual: false,
    nodes: [
      { at: 25, nameUk: "Чверть шляху", loreUk: "Звичка вже сформована.", coins: 150 },
      { at: 50, nameUk: "Половина", loreUk: "Тепер це просто твоє життя.", coins: 250 },
      { at: 75, nameUk: "Останній ривок", loreUk: "Найважче позаду.", coins: 350 },
      {
        at: 100,
        nameUk: "Незламний",
        loreUk: "Сто днів. Титул, який неможливо купити.",
        coins: 1000,
      },
    ],
  },
  {
    id: "sniper_100",
    nameUk: "Снайперська сотня",
    tagline: "100 точних днів — не обов'язково поспіль",
    kind: "in_target_total",
    total: 100,
    unit: "днів",
    icon: "🎯",
    endowed: 0,
    background: false,
    contextual: false,
    nodes: [
      { at: 25, nameUk: "Рука набита", loreUk: "Око вже саме бачить порцію.", coins: 150 },
      { at: 50, nameUk: "Снайпер", loreUk: "Титул «Снайпер» відкрито.", coins: 300 },
      {
        at: 100,
        nameUk: "Золотий приціл",
        loreUk: "Сто влучань. Рамка твоя.",
        coins: 1200,
      },
    ],
  },
  {
    id: "weight_path",
    nameUk: "Ваговий шлях",
    tagline: "Головна дорога. Іде фоном завжди",
    kind: "weight_loss",
    total: 5,
    unit: "кг",
    icon: "📉",
    endowed: 0,
    background: true,
    contextual: false,
    nodes: [
      { at: 1, nameUk: "Перший кілограм", loreUk: "Найважчий із усіх.", coins: 200 },
      { at: 3, nameUk: "Мінус три", loreUk: "Це вже видно в дзеркалі.", coins: 500 },
      { at: 5, nameUk: "Мінус п'ять", loreUk: "Інший одяг, інша хода.", coins: 900 },
    ],
  },
  {
    id: "plateau",
    nameUk: "Плато",
    tagline: "Тіло перебудовується. Це найважча фаза",
    kind: "plateau",
    total: 10,
    unit: "днів",
    icon: "🧘",
    endowed: 2,
    background: true,
    contextual: true,
    nodes: [
      {
        at: 10,
        nameUk: "Пройдено",
        loreUk: "Плато — не поразка. Ти не зупинився, і воно скінчилось.",
        coins: 400,
      },
    ],
  },
];

const BY_ID = new Map(EPICS.map((e) => [e.id, e]));

export function getEpic(id: string): EpicDef | undefined {
  return BY_ID.get(id);
}

/** Епіки, які гравець може обрати активним. */
export function selectableEpics(): EpicDef[] {
  return EPICS.filter((e) => !e.background && !e.contextual);
}

/** Перетворює сирий показник у значення шкали епіка. */
export function toProgressValue(kind: EpicKind, raw: number): number {
  switch (kind) {
    case "burn_distance":
      return raw / KCAL_PER_KM;
    case "burn_vertical":
      return raw / KCAL_PER_VERTICAL_M;
    default:
      return raw;
  }
}

/** Індекси вузлів, досягнутих при даному прогресі. */
export function reachedNodes(def: EpicDef, progress: number): number[] {
  const out: number[] = [];
  for (const [i, n] of def.nodes.entries()) {
    if (progress >= n.at) out.push(i);
  }
  return out;
}

export function parseClaimed(s: string): Set<number> {
  return new Set(
    s
      .split(",")
      .filter(Boolean)
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n)),
  );
}

export function serializeClaimed(set: Set<number>): string {
  return [...set].sort((a, b) => a - b).join(",");
}
