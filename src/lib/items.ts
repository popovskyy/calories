/**
 * Каталог витратного спорядження — головний стік економіки.
 *
 * Косметика купується один раз і назавжди, тож сама по собі вона економіку
 * не тримає: щойно магазин викуплено, монети стають марними. Спорядження
 * купується знову і знову, і саме тому монети не знецінюються ніколи.
 *
 * Каталог у TypeScript (як theme-catalog.ts) — адмінка ці ціни не редагує.
 */

export const SHIELD_ITEM_ID = "shield";
export const QUEST_REROLL_ITEM_ID = "quest_reroll";
export const CARD_REROLL_ITEM_ID = "card_reroll";
export const DOUBLER_ITEM_ID = "doubler";
export const BOX_ITEM_ID = "box";

export interface ItemDef {
  id: string;
  nameUk: string;
  description: string;
  price: number;
  /** Емодзі-іконка (у застосунку немає окремих ассетів під предмети). */
  icon: string;
  /** Максимум одиниць в інвентарі; null = без обмежень. */
  maxStack: number | null;
  /** Скільки разів на день можна застосувати; null = без ліміту. */
  usesPerDay: number | null;
  /** Скільки разів на тиждень можна застосувати; null = без ліміту. */
  usesPerWeek: number | null;
  /** Предмет спрацьовує сам (щит), тож кнопки «застосувати» в UI немає. */
  passive: boolean;
}

export const ITEMS: ItemDef[] = [
  {
    id: SHIELD_ITEM_ID,
    nameUk: "Щит стріку",
    description:
      "Якщо пропустиш день — серія не обнулиться. Витрачається сам, нічого натискати не треба.",
    price: 60,
    icon: "🛡",
    // Ліміт 2 навмисний: із запасом у 10 щитів зникає сама напруга серії.
    maxStack: 2,
    usesPerDay: null,
    usesPerWeek: null,
    passive: true,
  },
  {
    id: QUEST_REROLL_ITEM_ID,
    nameUk: "Ре-рол квесту",
    description:
      "Не подобається квест тижня — заміни його на інший. Кнопка «міняти» зʼявиться біля квеста на Огляді.",
    price: 40,
    icon: "🎲",
    maxStack: 5,
    usesPerDay: null,
    usesPerWeek: 2,
    passive: false,
  },
  {
    id: CARD_REROLL_ITEM_ID,
    nameUk: "Ре-рол картки",
    description:
      "Міняє обидві картки дня на нові. Кнопка «Перетягнути» — у блоці «Картки дня».",
    price: 15,
    icon: "🃏",
    maxStack: 10,
    usesPerDay: 1,
    usesPerWeek: null,
    passive: false,
  },
  {
    id: DOUBLER_ITEM_ID,
    nameUk: "Подвоювач",
    description:
      "Усі монети, зароблені сьогодні, множаться на 2. Вмикай зранку — діє до півночі.",
    price: 80,
    icon: "⚡",
    maxStack: 5,
    usesPerDay: 1,
    usesPerWeek: null,
    passive: false,
  },
  {
    id: BOX_ITEM_ID,
    nameUk: "Скринька мандрівника",
    description:
      "Випадковий приз: 70–400 монет або предмет. У середньому віддає більше, ніж коштує.",
    price: 100,
    icon: "🎁",
    maxStack: 10,
    usesPerDay: null,
    usesPerWeek: null,
    passive: false,
  },
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef | undefined {
  return BY_ID.get(id);
}

export function isItemId(id: string): boolean {
  return BY_ID.has(id);
}

/**
 * Вміст скриньки.
 *
 * Ваги підібрані так, щоб математичне сподівання (~110 монет: 91 монетами
 * плюс ~19 вартістю предметів) було трохи ВИЩЕ ціни в 100. Скринька, яка в
 * середньому програє, — це пастка: гравець швидко це відчує й перестане її
 * купувати, а разом із нею зникне й головна інтрига прилавка. Заробіток
 * економіки тут не в монетах, а в тому, що по неї повертаються.
 */
export interface BoxOutcome {
  weight: number;
  coins: number;
  itemId: string | null;
  labelUk: string;
}

export const BOX_TABLE: BoxOutcome[] = [
  { weight: 26, coins: 70, itemId: null, labelUk: "70 монет" },
  { weight: 22, coins: 150, itemId: null, labelUk: "150 монет" },
  { weight: 10, coins: 400, itemId: null, labelUk: "400 монет — щедра скринька!" },
  { weight: 12, coins: 0, itemId: CARD_REROLL_ITEM_ID, labelUk: "Ре-рол картки" },
  { weight: 12, coins: 0, itemId: QUEST_REROLL_ITEM_ID, labelUk: "Ре-рол квесту" },
  { weight: 12, coins: 0, itemId: SHIELD_ITEM_ID, labelUk: "Щит стріку" },
  { weight: 6, coins: 0, itemId: DOUBLER_ITEM_ID, labelUk: "Подвоювач" },
];

/** Зважений випадковий вибір вмісту скриньки. */
export function rollBox(rand: number = Math.random()): BoxOutcome {
  const total = BOX_TABLE.reduce((s, o) => s + o.weight, 0);
  let acc = rand * total;
  for (const o of BOX_TABLE) {
    acc -= o.weight;
    if (acc <= 0) return o;
  }
  return BOX_TABLE[0]!;
}
