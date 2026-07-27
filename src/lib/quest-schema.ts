import { z } from "zod";

/**
 * Спільна схема полів квесту для POST /api/admin/quests і PATCH /:id.
 * Живе в lib, а не в route.ts: route-файли Next можуть експортувати лише
 * HTTP-методи та segment config — будь-який інший експорт ламає типізацію роута.
 */

export const QUEST_KINDS = [
  "in_target_days",
  "log_days",
  "activity_days",
  "dual_days",
  "no_blowout",
  "weekend_clean",
  "week_balance",
  "activity_minutes",
  "burn_total",
  "protein_days",
] as const;

export type QuestKindValue = (typeof QUEST_KINDS)[number];

/** Ліміти, які поділяють клієнт (інпути) і сервер (валідація). */
export const QUEST_LIMITS = {
  titleMax: 80,
  descriptionMax: 280,
  targetMin: 1,
  /** Хвилини / ккал для марафонних видів; для «днів» достатньо ≤7. */
  targetMax: 5000,
  rewardMin: 0,
  rewardMax: 5000,
  sortOrderMax: 1000,
} as const;

export const questFields = {
  code: z
    .string()
    .trim()
    .min(2, "мінімум 2 символи")
    .max(40, "максимум 40 символів")
    .regex(/^[a-z0-9_]+$/, "лише малі латинські літери, цифри та _"),
  titleUk: z
    .string()
    .trim()
    .min(1, "вкажи назву")
    .max(QUEST_LIMITS.titleMax, `максимум ${QUEST_LIMITS.titleMax} символів`),
  description: z
    .string()
    .trim()
    .min(1, "вкажи опис")
    .max(QUEST_LIMITS.descriptionMax, `максимум ${QUEST_LIMITS.descriptionMax} символів`),
  kind: z.enum(QUEST_KINDS, { message: "невідомий тип квесту" }),
  target: z.coerce
    .number({ message: "має бути число" })
    .int("має бути ціле число")
    .min(QUEST_LIMITS.targetMin, `мінімум ${QUEST_LIMITS.targetMin}`)
    .max(QUEST_LIMITS.targetMax, `максимум ${QUEST_LIMITS.targetMax}`),
  rewardCoins: z.coerce
    .number({ message: "має бути число" })
    .int("має бути ціле число")
    .min(QUEST_LIMITS.rewardMin, "не може бути від'ємною")
    .max(QUEST_LIMITS.rewardMax, `максимум ${QUEST_LIMITS.rewardMax} монет`),
  sortOrder: z.coerce
    .number({ message: "має бути число" })
    .int("має бути ціле число")
    .min(0, "не може бути від'ємним")
    .max(QUEST_LIMITS.sortOrderMax, `максимум ${QUEST_LIMITS.sortOrderMax}`),
  active: z.boolean(),
};

export const weekStartField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "очікується формат YYYY-MM-DD");

export const questCreateSchema = z.object({
  weekStart: weekStartField.optional(),
  code: questFields.code,
  titleUk: questFields.titleUk,
  description: questFields.description,
  kind: questFields.kind,
  target: questFields.target,
  rewardCoins: questFields.rewardCoins,
  sortOrder: questFields.sortOrder.optional(),
  active: questFields.active.optional(),
});

export const questPatchSchema = z
  .object({
    titleUk: questFields.titleUk.optional(),
    description: questFields.description.optional(),
    kind: questFields.kind.optional(),
    target: questFields.target.optional(),
    rewardCoins: questFields.rewardCoins.optional(),
    sortOrder: questFields.sortOrder.optional(),
    active: questFields.active.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Немає жодної зміни для збереження",
  });

/** Клієнтська перевірка перед відправкою — та сама, що й на сервері. */
export function validateQuestDraft(draft: {
  code?: string;
  titleUk?: string;
  description?: string;
  target?: number;
  rewardCoins?: number;
}): string | null {
  if (!draft.titleUk?.trim()) return "Вкажи назву квесту";
  if (draft.titleUk.trim().length > QUEST_LIMITS.titleMax)
    return `Назва задовга (максимум ${QUEST_LIMITS.titleMax} символів)`;
  if (!draft.description?.trim()) return "Вкажи опис квесту";
  if (draft.description.trim().length > QUEST_LIMITS.descriptionMax)
    return `Опис задовгий (максимум ${QUEST_LIMITS.descriptionMax} символів)`;
  const t = draft.target ?? 0;
  if (!Number.isInteger(t) || t < QUEST_LIMITS.targetMin || t > QUEST_LIMITS.targetMax)
    return `Ціль має бути від ${QUEST_LIMITS.targetMin} до ${QUEST_LIMITS.targetMax}`;
  const r = draft.rewardCoins ?? 0;
  if (!Number.isInteger(r) || r < QUEST_LIMITS.rewardMin || r > QUEST_LIMITS.rewardMax)
    return `Нагорода має бути від ${QUEST_LIMITS.rewardMin} до ${QUEST_LIMITS.rewardMax} монет`;
  if (draft.code !== undefined && !/^[a-z0-9_]{2,40}$/.test(draft.code))
    return "Код: 2–40 символів, лише малі латинські літери, цифри та _";
  return null;
}
