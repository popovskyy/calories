/**
 * Косметика нових типів: фінішери, титули, рамки, саундпаки.
 *
 * Скіни й теми лишаються у своїх каталогах (skin-catalog.ts / theme-catalog.ts) —
 * тут те, чого не було: дрібні статусні речі, які добре працюють саме в
 * приватній грі на кілька друзів, де бачити чужий титул важливіше за будь-який
 * лідерборд.
 *
 * Частина позицій НЕ продається — вони відкриваються лише досягненням.
 * Заблокована річ із видимою умовою («Незламний — стрік 100, у тебе 34»)
 * мотивує сильніше за будь-яку вітрину, і коштує економіці нуль монет.
 */

export type CosmeticKind = "finisher" | "title" | "frame" | "soundpack";

/** Як річ здобувається: покупкою чи виконанням умови. */
export type UnlockRule =
  | { via: "shop"; price: number }
  | { via: "streak"; days: number }
  | { via: "in_target"; days: number }
  | { via: "epic"; epicId: string };

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  nameUk: string;
  description: string;
  unlock: UnlockRule;
  /** Колір/градієнт для прев'ю в магазині. */
  swatch: string;
  sortOrder: number;
}

/**
 * Фінішери — анімація моменту, коли день закривається в ±5%.
 *
 * Це найчастіше побачений екран у застосунку, тож сприйнята цінність висока
 * за мінімальної вартості реалізації: усе малюється framer-motion і CSS,
 * жодних ассетів.
 */
export const FINISHERS: CosmeticDef[] = [
  {
    id: "confetti",
    kind: "finisher",
    nameUk: "Конфеті",
    description: "Класика. Завжди з тобою",
    unlock: { via: "shop", price: 0 },
    swatch: "linear-gradient(135deg,#FFC800,#FF86D0)",
    sortOrder: 10,
  },
  {
    id: "blockbreak",
    kind: "finisher",
    nameUk: "Block Break",
    description: "Екран розсипається на пікселі",
    unlock: { via: "shop", price: 200 },
    swatch: "linear-gradient(135deg,#5b9c3a,#3d6b26)",
    sortOrder: 20,
  },
  {
    id: "perfect",
    kind: "finisher",
    nameUk: "PERFECT!",
    description: "Напис у стилі файтингу з ударом",
    unlock: { via: "shop", price: 220 },
    swatch: "linear-gradient(135deg,#FF4B4B,#FF9600)",
    sortOrder: 30,
  },
  {
    id: "cosmos",
    kind: "finisher",
    nameUk: "Космос",
    description: "Маскот злітає в зоряне небо",
    unlock: { via: "shop", price: 250 },
    swatch: "linear-gradient(135deg,#1A1A40,#9184d9)",
    sortOrder: 40,
  },
  {
    id: "goldrain",
    kind: "finisher",
    nameUk: "Золотий дощ",
    description: "Монети сиплються згори",
    unlock: { via: "shop", price: 250 },
    swatch: "linear-gradient(135deg,#FFC800,#B8860B)",
    sortOrder: 50,
  },
  {
    id: "fireflies",
    kind: "finisher",
    nameUk: "Світляки",
    description: "Рій світляків із нічного лісу",
    unlock: { via: "shop", price: 200 },
    swatch: "linear-gradient(135deg,#3D2B1F,#ff8a3d)",
    sortOrder: 60,
  },
];

/** Титули — рядок під ніком в арені. Половина не продається принципово. */
export const TITLES: CosmeticDef[] = [
  {
    id: "night_hunter",
    kind: "title",
    nameUk: "Нічний хижак",
    description: "Для тих, чия кухня працює до останнього",
    unlock: { via: "shop", price: 150 },
    swatch: "#9184d9",
    sortOrder: 10,
  },
  {
    id: "gourmet",
    kind: "title",
    nameUk: "Гурман",
    description: "Смак понад усе",
    unlock: { via: "shop", price: 150 },
    swatch: "#FF86D0",
    sortOrder: 20,
  },
  {
    id: "sleepless",
    kind: "title",
    nameUk: "Той, хто не спить",
    description: "Опівнічний облік",
    unlock: { via: "shop", price: 200 },
    swatch: "#1CB0F6",
    sortOrder: 30,
  },
  {
    id: "iron",
    kind: "title",
    nameUk: "Залізний",
    description: "Дисципліна замість мотивації",
    unlock: { via: "shop", price: 300 },
    swatch: "#AFAFAF",
    sortOrder: 40,
  },
  {
    id: "unbroken",
    kind: "title",
    nameUk: "Незламний",
    description: "Серія 100 днів. Не купується",
    unlock: { via: "streak", days: 100 },
    swatch: "#FFC800",
    sortOrder: 100,
  },
  {
    id: "sniper",
    kind: "title",
    nameUk: "Снайпер",
    description: "50 днів у ±5%. Не купується",
    unlock: { via: "in_target", days: 50 },
    swatch: "#58CC02",
    sortOrder: 110,
  },
  {
    id: "conqueror",
    kind: "title",
    nameUk: "Підкорювач",
    description: "Говерла взята. Не купується",
    unlock: { via: "epic", epicId: "hoverla" },
    swatch: "#4DABF7",
    sortOrder: 120,
  },
  {
    id: "patient",
    kind: "title",
    nameUk: "Терплячий",
    description: "Пережив плато й не зупинився. Не купується",
    unlock: { via: "epic", epicId: "plateau" },
    swatch: "#78C800",
    sortOrder: 130,
  },
];

/** Рамки аватара — видно в арені поруч із чужими. */
export const FRAMES: CosmeticDef[] = [
  {
    id: "silver",
    kind: "frame",
    nameUk: "Срібна",
    description: "Стриманий метал",
    unlock: { via: "shop", price: 200 },
    swatch: "linear-gradient(135deg,#e8e8e8,#9a9a9a)",
    sortOrder: 10,
  },
  {
    id: "gold",
    kind: "frame",
    nameUk: "Золота",
    description: "Помітно з іншого кінця арени",
    unlock: { via: "shop", price: 350 },
    swatch: "linear-gradient(135deg,#FFD700,#B8860B)",
    sortOrder: 20,
  },
  {
    id: "epic",
    kind: "frame",
    nameUk: "Епічна",
    description: "Градієнт, що обертається",
    unlock: { via: "shop", price: 500 },
    swatch: "linear-gradient(135deg,#b5abfc,#1CB0F6,#FF86D0)",
    sortOrder: 30,
  },
  {
    id: "traveler",
    kind: "frame",
    nameUk: "Мандрівник",
    description: "Дійшов до Канева. Не купується",
    unlock: { via: "epic", epicId: "dnipro" },
    swatch: "linear-gradient(135deg,#0E4C63,#4DABF7)",
    sortOrder: 100,
  },
  {
    id: "golden_sight",
    kind: "frame",
    nameUk: "Золотий приціл",
    description: "100 точних днів. Не купується",
    unlock: { via: "epic", epicId: "sniper_100" },
    swatch: "linear-gradient(135deg,#FFC800,#FF4B4B)",
    sortOrder: 110,
  },
];

/** Саундпаки — синтезуються WebAudio, ассетів не потребують (див. lib/sfx.ts). */
export const SOUNDPACKS: CosmeticDef[] = [
  {
    id: "default",
    kind: "soundpack",
    nameUk: "Стандартний",
    description: "Теплий, ненав'язливий",
    unlock: { via: "shop", price: 0 },
    swatch: "#9184d9",
    sortOrder: 10,
  },
  {
    id: "blocky",
    kind: "soundpack",
    nameUk: "Блоковий",
    description: "Ті самі «клац» і «дзинь»",
    unlock: { via: "shop", price: 180 },
    swatch: "#5b9c3a",
    sortOrder: 20,
  },
  {
    id: "retro",
    kind: "soundpack",
    nameUk: "8-біт",
    description: "Ретро-консоль у кишені",
    unlock: { via: "shop", price: 150 },
    swatch: "#FF9600",
    sortOrder: 30,
  },
  {
    id: "cinema",
    kind: "soundpack",
    nameUk: "Кіно",
    description: "Глибокий бас на кожну перемогу",
    unlock: { via: "shop", price: 300 },
    swatch: "#1A1A40",
    sortOrder: 40,
  },
];

export const ALL_COSMETICS: CosmeticDef[] = [
  ...FINISHERS,
  ...TITLES,
  ...FRAMES,
  ...SOUNDPACKS,
];

const BY_KEY = new Map(ALL_COSMETICS.map((c) => [`${c.kind}:${c.id}`, c]));

export function getCosmetic(kind: CosmeticKind, id: string): CosmeticDef | undefined {
  return BY_KEY.get(`${kind}:${id}`);
}

export function cosmeticsOfKind(kind: CosmeticKind): CosmeticDef[] {
  return ALL_COSMETICS.filter((c) => c.kind === kind).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Базові речі, які є в усіх без покупки. */
export function isDefaultCosmetic(c: CosmeticDef): boolean {
  return c.unlock.via === "shop" && c.unlock.price === 0;
}

export interface UnlockContext {
  maxStreak: number;
  inTargetDays: number;
  completedEpicIds: Set<string>;
}

/** Чи виконана умова заслуженої (не купованої) речі. */
export function isEarned(c: CosmeticDef, ctx: UnlockContext): boolean {
  switch (c.unlock.via) {
    case "shop":
      return c.unlock.price === 0;
    case "streak":
      return ctx.maxStreak >= c.unlock.days;
    case "in_target":
      return ctx.inTargetDays >= c.unlock.days;
    case "epic":
      return ctx.completedEpicIds.has(c.unlock.epicId);
    default:
      return false;
  }
}

/** Людський опис умови для заблокованої картки в магазині. */
export function unlockHint(c: CosmeticDef, ctx: UnlockContext): string | null {
  switch (c.unlock.via) {
    case "streak":
      return `Серія ${c.unlock.days} днів — у тебе ${ctx.maxStreak}`;
    case "in_target":
      return `${c.unlock.days} днів у ±5% — у тебе ${ctx.inTargetDays}`;
    case "epic":
      return "Нагорода за епічний квест";
    default:
      return null;
  }
}
