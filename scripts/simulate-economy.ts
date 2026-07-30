/**
 * Симуляція економіки: чи справді гравець заробляє стільки, скільки задумано.
 *
 * Балансувати «на око» не можна — джерел доходу вісім, і кожна правка в
 * economy.ts тягне за собою решту. Скрипт рахує тижневий дохід для трьох
 * профілів і звіряє з цільовими орієнтирами.
 *
 * Запуск: npx tsx scripts/simulate-economy.ts
 */

import {
  ARENA_PRIZES,
  DAILY_LOG_COINS,
  DUEL_STAKE,
  IN_TARGET_COINS,
  STREAK_DIVIDEND_COINS,
  STREAK_MILESTONES,
} from "../src/lib/economy";
import { QUEST_POOL } from "../src/lib/quests";
import { ITEMS, BOX_TABLE } from "../src/lib/items";
import { ALL_COSMETICS } from "../src/lib/cosmetics";
import { DEFAULT_SKINS } from "../src/lib/avatar-presets";
import { THEMES } from "../src/lib/theme-catalog";

interface Profile {
  name: string;
  /** Днів із логом на тиждень. */
  logDays: number;
  /** Днів у ±5% на тиждень. */
  inTargetDays: number;
  /** Скільки з 3 квестів тижня закриває. */
  questsDone: number;
  /** Розмір поля арени (у приватній грі зазвичай 2–4). */
  fieldSize: number;
  /**
   * Днів із призовим місцем. Для «Ідеального» — завжди 1-е;
   * для решти — середній приз серед оплачуваних слотів.
   */
  arenaPrizeDays: number;
  /** Чи брати приз 1-го місця (інакше — середнє по paidSlots). */
  arenaAlwaysFirst: boolean;
  /** Частка виграних дуелей. */
  duelWinRate: number;
  /** Цільовий дохід із плану. */
  expected: number;
}

/**
 * Як у rewards.ts: призових місць удвічі менше за поле.
 * 2–3 гравці → 1 приз, 4–5 → 2, 6+ → 3.
 */
function paidSlots(fieldSize: number): number {
  return Math.min(ARENA_PRIZES.length, Math.floor(fieldSize / 2));
}

/** Середній приз серед оплачуваних місць. */
function avgPaidPrize(fieldSize: number): number {
  const slots = paidSlots(fieldSize);
  if (slots <= 0) return 0;
  return ARENA_PRIZES.slice(0, slots).reduce((s, p) => s + p, 0) / slots;
}

const PROFILES: Profile[] = [
  {
    name: "Ідеальний",
    logDays: 7,
    inTargetDays: 7,
    questsDone: 3,
    fieldSize: 2,
    arenaPrizeDays: 7,
    arenaAlwaysFirst: true,
    duelWinRate: 0.75,
    // Без карток дня: ритуал+точність+серія+квести+арена+дуель ≈ 708
    expected: 708,
  },
  {
    name: "Хороший",
    logDays: 7,
    inTargetDays: 5,
    questsDone: 2,
    fieldSize: 4,
    arenaPrizeDays: 3.5,
    arenaAlwaysFirst: false,
    duelWinRate: 0.5,
    // Було 560 з картками (~122) — без карток ~438
    expected: 438,
  },
  {
    name: "Нерівний",
    logDays: 5,
    inTargetDays: 3,
    questsDone: 1,
    fieldSize: 4,
    arenaPrizeDays: 1,
    arenaAlwaysFirst: false,
    duelWinRate: 0,
    // Було 250 з картками (~50) — без карток ~200
    expected: 200,
  },
];

/** Середня нагорода за квест у пулі — беремо середнє, бо вибір ротаційний. */
const AVG_QUEST = QUEST_POOL.reduce((s, q) => s + q.rewardCoins, 0) / QUEST_POOL.length;

function weeklyIncome(p: Profile) {
  const ritual = p.logDays * DAILY_LOG_COINS;
  const accuracy = p.inTargetDays * IN_TARGET_COINS;
  // Дивіденд платиться раз на 7 днів серії — лише за безперервного логу.
  const streak = p.logDays === 7 ? STREAK_DIVIDEND_COINS : 0;
  const quests = p.questsDone * AVG_QUEST;

  const slots = paidSlots(p.fieldSize);
  const prizePerDay = p.arenaAlwaysFirst
    ? (ARENA_PRIZES[0] ?? 0)
    : avgPaidPrize(p.fieldSize);
  // Немає оплачуваних місць — арена нічого не дає (поле з 1 людини).
  const arena = slots > 0 ? p.arenaPrizeDays * prizePerDay : 0;

  // Дуель НЕ друкує монети: обидва вносять ставку, переможець забирає банк.
  // Для економіки це перерозподіл, тож у середньому по гравцях внесок = 0,
  // а для конкретного гравця — (winRate × банк) − власна ставка.
  const duel =
    p.duelWinRate > 0 ? p.duelWinRate * DUEL_STAKE * 2 - DUEL_STAKE : 0;

  const total = ritual + accuracy + streak + quests + arena + duel;
  return { ritual, accuracy, streak, quests, arena, duel, total, slots, prizePerDay };
}

console.log("═".repeat(72));
console.log("ТИЖНЕВИЙ ДОХІД");
console.log("═".repeat(72));

let ok = true;

for (const p of PROFILES) {
  const w = weeklyIncome(p);
  const drift = ((w.total - p.expected) / p.expected) * 100;
  const flag = Math.abs(drift) > 20 ? "  ⚠ ВІДХИЛЕННЯ >20%" : "";
  if (Math.abs(drift) > 20) ok = false;

  console.log(`\n${p.name}`);
  console.log(
    `  ритуал ${w.ritual.toFixed(0)} · точність ${w.accuracy.toFixed(0)} · ` +
      `серія ${w.streak.toFixed(0)}`,
  );
  console.log(
    `  квести ${w.quests.toFixed(0)} · арена ${w.arena.toFixed(0)} ` +
      `(поле ${p.fieldSize}, ${w.slots} призів × ~${w.prizePerDay.toFixed(0)}) · дуель ${w.duel.toFixed(0)}`,
  );
  console.log(
    `  РАЗОМ ${w.total.toFixed(0)} / план ${p.expected} (${drift >= 0 ? "+" : ""}${drift.toFixed(0)}%)${flag}`,
  );
}

// ── Стік: скільки коштує тримати спорядження ────────────────────────────────
const weeklyGear =
  (ITEMS.find((i) => i.id === "shield")?.price ?? 0) +
  (ITEMS.find((i) => i.id === "quest_reroll")?.price ?? 0) +
  (ITEMS.find((i) => i.id === "doubler")?.price ?? 0);

console.log(`\n${"═".repeat(72)}`);
console.log("СТІК");
console.log("═".repeat(72));
console.log(`  Спорядження за типовий тиждень: ${weeklyGear}`);

const good = weeklyIncome(PROFILES[1]!).total;
console.log(
  `  У «Хорошого» лишається на косметику: ${(good - weeklyGear).toFixed(0)}/тиждень`,
);

// ── Час до викупу вітрини ───────────────────────────────────────────────────
const cosmeticsCost = ALL_COSMETICS.filter(
  (c) => c.unlock.via === "shop" && c.unlock.price > 0,
).reduce((s, c) => s + (c.unlock.via === "shop" ? c.unlock.price : 0), 0);
const skinsCost = DEFAULT_SKINS.filter((s) => s.tier === "premium").reduce(
  (s, k) => s + k.price,
  0,
);
const themesCost = THEMES.reduce((s, t) => s + t.price, 0);
const showcase = cosmeticsCost + skinsCost + themesCost;

const surplus = good - weeklyGear;
console.log(`\n${"═".repeat(72)}`);
console.log("ВІТРИНА");
console.log("═".repeat(72));
console.log(`  Скіни ${skinsCost} + теми ${themesCost} + косметика ${cosmeticsCost}`);
console.log(`  Разом: ${showcase} монет`);
console.log(
  `  «Хороший» викупить усе за ~${Math.ceil(showcase / surplus)} тижнів ` +
    `(було ~7 до змін)`,
);
console.log(
  `\n  Після викупу стік не зникає: спорядження ${weeklyGear}/тиждень ` +
    `+ ротація прилавка.`,
);

// ── Скринька: сподівання має перевищувати ціну ──────────────────────────────
const boxPrice = ITEMS.find((i) => i.id === "box")?.price ?? 0;
const boxWeight = BOX_TABLE.reduce((s, o) => s + o.weight, 0);
const boxEV =
  BOX_TABLE.reduce((s, o) => {
    const itemValue = o.itemId ? (ITEMS.find((i) => i.id === o.itemId)?.price ?? 0) : 0;
    return s + o.weight * (o.coins + itemValue);
  }, 0) / boxWeight;

console.log(`\n${"═".repeat(72)}`);
console.log("СКРИНЬКА");
console.log("═".repeat(72));
console.log(`  Ціна ${boxPrice} · сподівання ${boxEV.toFixed(0)}`);
if (boxEV <= boxPrice) {
  console.log("  ⚠ Скринька в середньому програє — її перестануть купувати");
  ok = false;
} else {
  console.log(`  ✓ Вигідна на ${(boxEV - boxPrice).toFixed(0)} монет`);
}

// ── Віхи стріку ─────────────────────────────────────────────────────────────
const milestoneTotal = STREAK_MILESTONES.reduce((s, m) => s + m.coins, 0);
console.log(
  `\n  Віхи стріку за все життя: ${milestoneTotal} монет (одноразово, до 365 днів)`,
);

console.log(`\n${ok ? "✓ Баланс у межах плану" : "⚠ Потрібне перебалансування"}\n`);
process.exit(ok ? 0 : 1);
