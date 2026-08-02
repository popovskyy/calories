import { weekIndex } from "@/lib/date";
import { ITEMS, BOX_ITEM_ID, type ItemDef } from "@/lib/items";
import { ALL_COSMETICS, isDefaultCosmetic, type CosmeticDef } from "@/lib/cosmetics";

/**
 * «Крамниця мандрівника» — 4 слоти, що оновлюються щопонеділка.
 *
 * Сенс не в знижці, а в дефіциті: навіть коли гравець володіє геть усім,
 * у понеділок він відкриває застосунок, щоб подивитись, що завезли.
 * Це найдешевший спосіб зробити з понеділка подію.
 *
 * Вміст детермінований від weekStart — той самий підхід, що в seededPick для
 * квестів, тому ротація не потребує ані таблиці в БД, ані крона.
 */

export type StallSlotKind = "item_sale" | "cosmetic" | "box" | "bundle";

export interface StallSlot {
  kind: StallSlotKind;
  /** id предмета або косметики. */
  refId: string;
  /** Для косметики — її тип, щоб знати, у якій таблиці шукати володіння. */
  cosmeticKind?: string;
  nameUk: string;
  description: string;
  price: number;
  /** Ціна до знижки; null — знижки немає. */
  oldPrice: number | null;
  icon: string;
  swatch: string | null;
}

const SALE_RATE = 0.75;

/**
 * Крок ротації — ЗАВЖДИ 1 (плюс сталий зсув на слот).
 *
 * Раніше слоти брали `idx * 3`, `idx * 5 + 1`, `idx * 7 + 2`. Коли множник має
 * спільний дільник із довжиною списку, вибірка згортається: у списку з 3
 * предметів `(idx * 3) % 3 === 0` завжди, тож слот знижки два роки поспіль
 * показував один і той самий щит. Крок 1 взаємно простий із будь-якою
 * довжиною, тому покриває весь каталог незалежно від того, скільки в ньому
 * позицій зараз і скільки стане завтра.
 */
function rotate<T>(list: T[], idx: number): T {
  return list[((idx % list.length) + list.length) % list.length]!;
}

/** Предмети, які має сенс продавати зі знижкою (скринька йде окремим слотом). */
function saleableItems(): ItemDef[] {
  return ITEMS.filter((i) => i.id !== BOX_ITEM_ID);
}

/** Косметика, що реально продається (заслужені й зняті з вітрини — ні). */
function rotatableCosmetics(): CosmeticDef[] {
  return ALL_COSMETICS.filter(
    (c) => c.unlock.via === "shop" && !isDefaultCosmetic(c) && !c.vaulted,
  );
}

export function getWeeklyStock(weekStart: string): StallSlot[] {
  const idx = weekIndex(weekStart);
  const slots: StallSlot[] = [];

  // 1. Спорядження зі знижкою −25%
  const item = rotate(saleableItems(), idx);
  const salePrice = Math.round(item.price * SALE_RATE);
  slots.push({
    kind: "item_sale",
    refId: item.id,
    nameUk: item.nameUk,
    description: item.description,
    price: salePrice,
    oldPrice: item.price,
    icon: item.icon,
    swatch: null,
  });

  // 2. Косметика тижня
  const cos = rotate(rotatableCosmetics(), idx + 1);
  slots.push({
    kind: "cosmetic",
    refId: cos.id,
    cosmeticKind: cos.kind,
    nameUk: cos.nameUk,
    description: cos.description,
    price: cos.unlock.via === "shop" ? cos.unlock.price : 0,
    oldPrice: null,
    icon: "✨",
    swatch: cos.swatch,
  });

  // 3. Скринька — постійний слот, бо саме вона тримає інтригу
  const box = ITEMS.find((i) => i.id === BOX_ITEM_ID)!;
  slots.push({
    kind: "box",
    refId: box.id,
    nameUk: box.nameUk,
    description: box.description,
    price: box.price,
    oldPrice: null,
    icon: box.icon,
    swatch: null,
  });

  // 4. Набір тижня: другий предмет зі знижкою, відмінний від першого
  const pool = saleableItems().filter((i) => i.id !== item.id);
  const bundleItem = rotate(pool, idx + 2);
  slots.push({
    kind: "bundle",
    refId: bundleItem.id,
    nameUk: `${bundleItem.nameUk} ×2`,
    description: "Подвійний набір за ціною півтора",
    price: Math.round(bundleItem.price * 1.5),
    oldPrice: bundleItem.price * 2,
    icon: bundleItem.icon,
    swatch: null,
  });

  return slots;
}

/** Скільки одиниць видати за слот (набір дає дві). */
export function slotQuantity(slot: StallSlot): number {
  return slot.kind === "bundle" ? 2 : 1;
}

/**
 * Ключ RewardClaim: одна купівля слота на гравця за тиждень.
 * Без цього знижку/набір/скриньку можна було б скуповувати весь тиждень.
 */
export function stallPurchaseKey(
  weekStart: string,
  kind: StallSlotKind,
  refId: string,
): string {
  return `stall:${weekStart}:${kind}:${refId}`;
}
