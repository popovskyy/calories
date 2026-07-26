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
  DAILY_CARD_REWARDS,
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
  /** Частка виконаних карток дня. */
  cardRate: number;
  /** Скільки з 3 квестів тижня закриває. */
  questsDone: number;
  /** Днів, коли бере приз арени (поле з 2 гравців). */
  arenaWins: number;
  /** Частка виграних дуелей. */
  duelWinRate: number;
  /** Цільовий дохід із плану. */
  expected: number;
}

const PROFILES: Profile[] = [
  {
    name: "Ідеальний",
    logDays: 7,
    inTargetDays: 7,
    cardRate: 1,
    questsDone: 3,
    arenaWins: 7,
    duelWinRate: 0.75,
    expected: 930,
  },
  {
    name: "Хороший",
    logDays: 7,
    inTargetDays: 5,
    cardRate: 0.7,
    questsDone: 2,
    arenaWins: 3.5,
    duelWinRate: 0.5,
    expected: 560,
  },
  {
    name: "Нерівний",
    logDays: 5,
    inTargetDays: 3,
    cardRate: 0.4,
    questsDone: 1,
    arenaWins: 1,
    duelWinRate: 0,
    expected: 250,
  },
];

/** Середня нагорода за квест у пулі — беремо середнє, бо вибір ротаційний. */
const AVG_QUEST = QUEST_POOL.reduce((s, q) => s + q.rewardCoins, 0) / QUEST_POOL.length;
const CARDS_PER_DAY_MAX = DAILY_CARD_REWARDS.reduce((s, r) => s + r, 0);

function weeklyIncome(p: Profile) {
  const ritual = p.logDays * DAILY_LOG_COINS;
  const accuracy = p.inTargetDays * IN_TARGET_COINS;
  const cards = p.logDays * CARDS_PER_DAY_MAX * p.cardRate;
  // Дивіденд платиться раз на 7 днів серії — лише за безперервного логу.
  const streak = p.logDays === 7 ? STREAK_DIVIDEND_COINS : 0;
  const quests = p.questsDone * AVG_QUEST;
  const arena = p.arenaWins * (ARENA_PRIZES[0] ?? 0);

  // Дуель НЕ друкує монети: обидва вносять ставку, переможець забирає банк.
  // Для економіки це перерозподіл, тож у середньому по гравцях внесок = 0,
  // а для конкретного гравця — (winRate × банк) − власна ставка.
  const duel =
    p.duelWinRate > 0 ? p.duelWinRate * DUEL_STAKE * 2 - DUEL_STAKE : 0;

  const total = ritual + accuracy + cards + streak + quests + arena + duel;
  return { ritual, accuracy, cards, streak, quests, arena, duel, total };
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
    `  ритуал ${w.ritual.toFixed(0)} · точність ${w.accuracy.toFixed(0)} · картки ${w.cards.toFixed(0)} · ` +
      `серія ${w.streak.toFixed(0)}`,
  );
  console.log(
    `  квести ${w.quests.toFixed(0)} · арена ${w.arena.toFixed(0)} · дуель ${w.duel.toFixed(0)}`,
  );
  console.log(
    `  РАЗОМ ${w.total.toFixed(0)} / план ${p.expected} (${drift >= 0 ? "+" : ""}${drift.toFixed(0)}%)${flag}`,
  );
}

// ── Стік: скільки коштує тримати спорядження ────────────────────────────────
const weeklyGear =
  (ITEMS.find((i) => i.id === "shield")?.price ?? 0) +
  (ITEMS.find((i) => i.id === "quest_reroll")?.price ?? 0) +
  (ITEMS.find((i) => i.id === "card_reroll")?.price ?? 0) * 2 +
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
