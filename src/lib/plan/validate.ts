import type { AiDay, AiExercise, AiWeek } from "@/lib/gemini/schemas";
import { BLOCKS, LEVEL_LABEL, type AdaptMode, type AthleteLevel } from "@/lib/types";
import { detectCapabilities, isDipExercise, isFullPullUp, routineMentionsCardio } from "@/lib/plan/capabilities";

/**
 * Детермінована перевірка відповіді моделі. Схема гарантує форму, але не сенс:
 * модель може послатись на предмет, якого в атлета немає, або забути і повтори, і час.
 * Порушення йдуть назад у модель як фідбек (див. generateValidated).
 */
export function validateExercise(ex: AiExercise, allowedIds: ReadonlySet<string>, where: string): string[] {
  const issues: string[] = [];
  for (const id of ex.equipmentIds) {
    if (!allowedIds.has(id)) {
      issues.push(
        `${where} «${ex.name}»: невідомий інвентар "${id}". Дозволені: ${[...allowedIds].join(", ") || "жодного (лише власна вага)"}`,
      );
    }
  }
  if (!ex.reps?.trim() && !ex.durationSec) {
    issues.push(`${where} «${ex.name}»: потрібні reps або durationSec`);
  }
  return issues;
}

export function validateDay(day: AiDay, allowedIds: ReadonlySet<string>, label = "День"): string[] {
  const issues: string[] = [];
  for (const block of BLOCKS) {
    day[block].forEach((ex, i) => {
      issues.push(...validateExercise(ex, allowedIds, `${label}/${block}[${i}]`));
    });
  }
  return issues;
}

export function validateWeek(week: AiWeek, allowedIds: ReadonlySet<string>): string[] {
  const issues: string[] = [];
  const weekdays = week.days.map((d) => d.weekday).sort((a, b) => a - b);
  if (weekdays.join(",") !== "0,1,2,3,4") {
    issues.push(`weekday має бути 0,1,2,3,4 по одному разу, а прийшло: ${weekdays.join(",")}`);
  }
  for (const day of week.days) {
    issues.push(...validateDay(day, allowedIds, `День ${day.weekday}`));
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* М'які правила якості (generateValidated.qualityCheck)               */
/* ------------------------------------------------------------------ */

/** Скільки вправ мають бути в блоках дня. short_time — стисло, fatigued — легке відновлення. */
function limitsFor(mode?: AdaptMode) {
  if (mode === "short_time") return { warmupMax: 1, cooldownMax: 1, mainMin: 3, mainMax: 5 };
  if (mode === "fatigued") return { warmupMax: 2, cooldownMax: 2, mainMin: 2, mainMax: 5 };
  return { warmupMax: 2, cooldownMax: 2, mainMin: 4, mainMax: 7 };
}

/** Максимум вправ типу mobility в силовому / кардіо / змішаному дні (розминка + основа + заминка разом). */
export const MAX_MOBILITY_PER_TRAINING_DAY = 3;

/**
 * Дисбаланс «більше розтяжки, ніж роботи»: надто довгі розминка/заминка, мало основних вправ,
 * день, забитий мобіліті. Те, що модель любить робити за замовчуванням і що користувача дратує.
 */
export function qualityDay(day: AiDay, label = "День", mode?: AdaptMode, ownedText?: string): string[] {
  const issues: string[] = [];
  if (ownedText !== undefined) {
    for (const block of BLOCKS) day[block].forEach((ex, i) => issues.push(...gearIssues(ex, ownedText, `${label}/${block}[${i}]`)));
  }
  const lim = limitsFor(mode);
  if (day.warmup.length > lim.warmupMax) {
    issues.push(`${label}: розминка має ${day.warmup.length} вправ, а має бути не більше ${lim.warmupMax}`);
  }
  if (day.cooldown.length > lim.cooldownMax) {
    issues.push(`${label}: заминка має ${day.cooldown.length} вправ, а має бути не більше ${lim.cooldownMax}`);
  }
  if (day.main.length < lim.mainMin) {
    issues.push(`${label}: в основному блоці ${day.main.length} вправ, потрібно щонайменше ${lim.mainMin} — додай справжню роботу`);
  } else if (day.main.length > lim.mainMax) {
    issues.push(`${label}: в основному блоці ${day.main.length} вправ, а має бути не більше ${lim.mainMax}`);
  }
  if (day.type !== "mobility" && mode !== "fatigued") {
    const mobility = BLOCKS.reduce((n, b) => n + day[b].filter((e) => e.type === "mobility").length, 0);
    if (mobility > MAX_MOBILITY_PER_TRAINING_DAY) {
      issues.push(
        `${label} (${day.type}): ${mobility} вправ типу mobility — це забагато для тренувального дня, максимум ${MAX_MOBILITY_PER_TRAINING_DAY}. Заміни їх на силові чи кардіо вправи основного блоку`,
      );
    }
  }
  return issues;
}

/**
 * Предмети, які модель любить «дописувати» у вправи, хоча їх немає в інвентарі (в назві чи описі): бруси,
 * штанга, лава, гиря, TRX. `owned` — чи є щось подібне серед предметів атлета (назва + опис).
 */
const GEAR: { re: RegExp; label: string; owned: RegExp }[] = [
  { re: /(^|[^\p{L}])брус/iu, label: "бруси", owned: /брус|parallel|dip/iu },
  { re: /(^|[^\p{L}])штанг/iu, label: "штанга", owned: /штанг|гриф|barbell/iu },
  { re: /(^|[^\p{L}])гир[яіюейь]/iu, label: "гиря", owned: /гир|kettlebell/iu },
  { re: /(^|[^\p{L}])(лав[аіуои]|лавц|лавк)/iu, label: "лава", owned: /лав|bench/iu },
  { re: /(^|[^\p{L}])(trx|петл[яіюі]\s+trx)/iu, label: "TRX", owned: /trx|петл/iu },
  { re: /(^|[^\p{L}])еспандер/iu, label: "еспандер", owned: /еспандер|гумк|резин|band/iu },
];

/** Згадки неіснуючого інвентарю в назві/описі вправи. `ownedText` — назви й описи всіх активних предметів атлета. */
export function gearIssues(ex: AiExercise, ownedText: string, where: string): string[] {
  const text = `${ex.name} ${ex.tip}`;
  const bad = GEAR.filter((g) => g.re.test(text) && !g.owned.test(ownedText));
  return bad.map(
    (g) => `${where} «${ex.name}»: згадано «${g.label}», якого немає в інвентарі атлета — перероби вправу на наявні предмети або власну вагу`,
  );
}

export interface RequiredEquipment {
  alias: string;
  name: string;
}

export interface WeekQualityOpts {
  /** Силові предмети, що мають бути в основних блоках тижня. */
  required?: readonly RequiredEquipment[];
  /** Назви й описи наявних предметів (для перевірки вигаданого інвентарю й можливостей: турнік, бруси). */
  ownedText?: string;
  level?: AthleteLevel;
  /** Власні заняття атлета: якщо там є кардіо — воно має бути в плані щонайменше 3 дні. */
  routine?: string;
}

/** Скільки днів плану має містити власне кардіо атлета (решта дозволена як відпочинок від нього). */
const MIN_ROUTINE_CARDIO_DAYS = 3;
/** Мінімум кардіо за тиждень (хв) в основних блоках, коли атлет сам займається кардіо: мета сушки, ≈ нижня межа рекомендацій. */
export const MIN_ROUTINE_CARDIO_MINUTES = 150;

/** Частка силових вправ основного блоку з ≥4 підходами, нижче якої рівень «не відчувається» в плані. */
const MIN_HEAVY_SHARE: Record<AthleteLevel, number> = { beginner: 0, intermediate: 0.35, advanced: 0.6 };

/**
 * Тижнева якість: не більше одного дня мобіліті, кожен силовий предмет задіяно в основному блоці,
 * рівень відчутний у підходах, а турнік і бруси (якщо вони є) використані за призначенням.
 */
export function qualityWeek(week: AiWeek, opts: WeekQualityOpts = {}): string[] {
  const { required = [], ownedText, level, routine } = opts;
  const issues: string[] = [];
  for (const day of week.days) issues.push(...qualityDay(day, `День ${day.weekday}`, undefined, ownedText));

  const mobilityDays = week.days.filter((d) => d.type === "mobility").map((d) => d.weekday);
  if (mobilityDays.length > 1) {
    issues.push(
      `Днів типу mobility ${mobilityDays.length} (${mobilityDays.join(", ")}), а має бути не більше одного. Решту зроби силовими чи змішаними`,
    );
  }

  const mainEx = week.days.flatMap((d) => d.main);
  if (level && level !== "beginner") {
    const strength = mainEx.filter((e) => e.type === "strength");
    const heavy = strength.filter((e) => (e.sets ?? 0) >= 4).length;
    if (strength.length > 0 && heavy / strength.length < MIN_HEAVY_SHARE[level]) {
      issues.push(
        `Рівень «${LEVEL_LABEL[level]}»: лише ${heavy} із ${strength.length} силових вправ основного блоку мають 4+ підходи. На головних рухах кожного дня став 4 підходи (решта — 3)`,
      );
    }
  }
  if (ownedText !== undefined && level !== "beginner") {
    const caps = detectCapabilities(ownedText);
    if (caps.pullBar && !mainEx.some((e) => isFullPullUp(e.name))) {
      issues.push(
        "В інвентарі є турнік, але в основних блоках тижня немає жодного повного підтягування (лише австралійські / горизонтальні). Додай підтягування різними хватами",
      );
    }
    if (caps.dipBars && !mainEx.some((e) => isDipExercise(e.name))) {
      issues.push(
        "В інвентарі є бруси, але в основних блоках тижня немає віджимань на брусах. Додай віджимання на брусах (назвіть вправу «Віджимання на брусах»)",
      );
    }
  }

  if (routine && routineMentionsCardio(routine)) {
    const cardioMin = Math.round(
      week.days.reduce((n, d) => n + d.main.filter((e) => e.type === "cardio").reduce((m, e) => m + (e.durationSec ?? 0), 0), 0) / 60,
    );
    if (cardioMin < MIN_ROUTINE_CARDIO_MINUTES) {
      issues.push(
        `Кардіо в основних блоках за тиждень лише ${cardioMin} хв (durationSec усіх cardio-вправ), а має бути щонайменше ${MIN_ROUTINE_CARDIO_MINUTES} хв. Збільш тривалість сесій до 30–45 хв (рівний темп у 2 зоні), одна сесія — інтервали; durationSec = загальна тривалість сесії`,
      );
    }
    const cardioDays = week.days.filter((d) => d.main.some((e) => e.type === "cardio")).length;
    if (cardioDays < MIN_ROUTINE_CARDIO_DAYS) {
      issues.push(
        `Атлет сам робить кардіо («${routine.slice(0, 80)}»), але в основних блоках лише ${cardioDays} днів із вправою типу cardio. Постав його кардіо щонайменше в ${MIN_ROUTINE_CARDIO_DAYS} дні (рівний темп / інтервали / легко) за правилом 10`,
      );
    }
  }

  const used = new Set(mainEx.flatMap((e) => e.equipmentIds));
  for (const item of required) {
    if (!used.has(item.alias)) {
      issues.push(
        `Силовий предмет «${item.name}» (${item.alias}) не використано в жодній вправі ОСНОВНОГО блоку за весь тиждень — додай вправи з ним у відповідні дні`,
      );
    }
  }
  return issues;
}
