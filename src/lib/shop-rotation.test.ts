import { describe, expect, it } from "vitest";
import { ALL_COSMETICS, isDefaultCosmetic } from "@/lib/cosmetics";
import { shiftYMD, weekStartYMD } from "@/lib/date";
import { BOX_ITEM_ID, ITEMS, isItemId } from "@/lib/items";
import {
  getWeeklyStock,
  slotQuantity,
  stallPurchaseKey,
} from "@/lib/shop-rotation";

const MONDAY = weekStartYMD("2026-01-05");
const WEEKS = 104;
const ALL_ITEM_IDS = ITEMS.map((i) => i.id);

function weeks(count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftYMD(MONDAY, i * 7));
}

/**
 * Прилавок детермінований від weekStart — ані таблиці в БД, ані крона. Ціна
 * цього рішення в тому, що зламатись він може тихо: досить додати косметику
 * з іншим `unlock.via`, і слот почне показувати не те. Тести стережуть саме
 * інваріанти вітрини, а не конкретний вміст.
 */
describe("getWeeklyStock", () => {
  it("рівно чотири слоти відомих типів", () => {
    for (const ws of weeks(20)) {
      const stock = getWeeklyStock(ws);
      expect(stock, ws).toHaveLength(4);
      expect(stock.map((s) => s.kind)).toEqual([
        "item_sale",
        "cosmetic",
        "box",
        "bundle",
      ]);
    }
  });

  it("детермінований для того самого тижня", () => {
    expect(getWeeklyStock(MONDAY)).toEqual(getWeeklyStock(MONDAY));
  });

  it("той самий предмет не займає два слоти одночасно", () => {
    for (const ws of weeks(WEEKS)) {
      const ids = getWeeklyStock(ws).map((s) => `${s.kind}:${s.refId}`);
      expect(new Set(ids).size, ws).toBe(ids.length);
    }
  });

  it("знижка й набір — це різні предмети", () => {
    for (const ws of weeks(WEEKS)) {
      const stock = getWeeklyStock(ws);
      const sale = stock.find((s) => s.kind === "item_sale")!;
      const bundle = stock.find((s) => s.kind === "bundle")!;
      expect(sale.refId, ws).not.toBe(bundle.refId);
    }
  });

  it("скринька стоїть на вітрині завжди", () => {
    for (const ws of weeks(20)) {
      const box = getWeeklyStock(ws).find((s) => s.kind === "box");
      expect(box?.refId, ws).toBe(BOX_ITEM_ID);
    }
  });

  it("усі ціни додатні, а знижка справді дешевша за стару ціну", () => {
    for (const ws of weeks(WEEKS)) {
      for (const slot of getWeeklyStock(ws)) {
        expect(slot.price, `${ws} ${slot.refId}`).toBeGreaterThan(0);
        if (slot.oldPrice != null) {
          expect(slot.price, `${ws} ${slot.refId}`).toBeLessThan(slot.oldPrice);
        }
      }
    }
  });

  it("предметні слоти посилаються на реальні предмети", () => {
    for (const ws of weeks(WEEKS)) {
      for (const slot of getWeeklyStock(ws)) {
        if (slot.kind === "cosmetic") continue;
        expect(isItemId(slot.refId), `${ws} ${slot.refId}`).toBe(true);
      }
    }
  });

  it("ніколи не продає заслужену, дефолтну чи зняту з вітрини косметику", () => {
    for (const ws of weeks(WEEKS)) {
      const slot = getWeeklyStock(ws).find((s) => s.kind === "cosmetic")!;
      const def = ALL_COSMETICS.find(
        (c) => c.id === slot.refId && c.kind === slot.cosmeticKind,
      );
      expect(def, `${ws}: ${slot.refId} немає в каталозі`).toBeDefined();
      expect(def!.unlock.via, ws).toBe("shop");
      expect(def!.vaulted ?? false, ws).toBe(false);
      expect(isDefaultCosmetic(def!), ws).toBe(false);
    }
  });

  /**
   * Регресія на реальний баг: слоти брали `idx * 3`, `idx * 5 + 1`,
   * `idx * 7 + 2`. У списку з 3 предметів `(idx * 3) % 3 === 0` завжди, тож
   * слот знижки два роки поспіль показував один і той самий щит, а вся
   * «новинка понеділка» трималась на єдиному слоті косметики.
   *
   * Перевіряємо не «щось змінюється», а сильніше: кожен слот за достатній час
   * показує ВЕСЬ свій каталог. Це тримається й тоді, коли каталог виросте.
   */
  it("слот знижки за час обходить усі предмети, а не залипає на одному", () => {
    const saleable = new Set(
      weeks(WEEKS).map(
        (ws) => getWeeklyStock(ws).find((s) => s.kind === "item_sale")!.refId,
      ),
    );
    const catalog = ALL_ITEM_IDS.filter((id) => id !== BOX_ITEM_ID);
    expect([...saleable].sort()).toEqual([...catalog].sort());
  });

  it("слот косметики обходить увесь ротований каталог", () => {
    const shown = new Set(
      weeks(WEEKS).map(
        (ws) => getWeeklyStock(ws).find((s) => s.kind === "cosmetic")!.refId,
      ),
    );
    const catalog = ALL_COSMETICS.filter(
      (c) => c.unlock.via === "shop" && !isDefaultCosmetic(c) && !c.vaulted,
    );
    expect(shown.size).toBe(catalog.length);
  });

  it("вітрина реально оновлюється, а не стоїть тижнями", () => {
    const seen = new Set(
      weeks(WEEKS).map((ws) =>
        getWeeklyStock(ws)
          .map((s) => s.refId)
          .join(","),
      ),
    );
    expect(seen.size).toBeGreaterThan(WEEKS / 4);
  });
});

describe("slotQuantity", () => {
  it("набір дає дві одиниці, решта — одну", () => {
    const stock = getWeeklyStock(MONDAY);
    for (const slot of stock) {
      expect(slotQuantity(slot), slot.kind).toBe(slot.kind === "bundle" ? 2 : 1);
    }
  });
});

describe("stallPurchaseKey", () => {
  it("ключ розрізняє тиждень, тип слота і предмет", () => {
    const a = stallPurchaseKey("2026-01-05", "item_sale", "shield");
    expect(a).not.toBe(stallPurchaseKey("2026-01-12", "item_sale", "shield"));
    expect(a).not.toBe(stallPurchaseKey("2026-01-05", "bundle", "shield"));
    expect(a).not.toBe(stallPurchaseKey("2026-01-05", "item_sale", "doubler"));
  });

  it("той самий слот того самого тижня — той самий ключ (купівля одна)", () => {
    expect(stallPurchaseKey("2026-01-05", "box", "box")).toBe(
      stallPurchaseKey("2026-01-05", "box", "box"),
    );
  });
});
