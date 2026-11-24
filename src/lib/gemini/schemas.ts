import { z } from "zod";

/* ---------- Gemini Vision: розпізнавання інвентарю ---------- */

export const scanSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(2).max(80).describe("Коротка нейтральна назва українською"),
        detail: z.string().max(140).nullable().describe("Що видно: хват, рівні опору, матеріал"),
        category: z.enum(["strength", "cardio", "mobility", "other"]),
        adjustable: z.boolean().describe("true, якщо вага регулюється (розбірна гантеля, гиря з блінами)"),
        maxWeightKg: z
          .number()
          .min(0.5)
          .max(300)
          .nullable()
          .describe("Максимальна вага, якщо видно маркування або це розбірний снаряд; інакше null"),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(30),
  note: z.string().max(300).nullable().describe("Короткий коментар, якщо фото неякісне або нічого не видно"),
});
export type ScanOutput = z.infer<typeof scanSchema>;

/* ---------- Gemini: план тренувань ---------- */

export const aiExerciseSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(120)
    .describe("Проста зрозуміла назва звичайною українською, без жаргону, кальок і англійських назв у дужках"),
  type: z.enum(["strength", "cardio", "mobility"]),
  equipmentIds: z
    .array(z.string())
    .max(4)
    .describe("Ідентифікатори (E1, E2…) предметів з переліку інвентарю. [] — власна вага / підлога"),
  sets: z.number().int().min(1).max(10).nullable(),
  reps: z
    .string()
    .max(60)
    .nullable()
    .describe("«8–10», «15 / рука», «8 × (40с / 80с)». null, якщо вправа задана часом"),
  durationSec: z.number().int().min(10).max(3600).nullable().describe("Тривалість підходу/вправи в секундах"),
  tempo: z.string().max(40).nullable().describe("Темп повтору, напр. «2-0-1» або «повільний негатив 3 с»"),
  load: z.string().max(80).nullable().describe("Вага або опір: «13 кг», «опір 5–6 з 8», «власна вага»"),
  restSec: z.number().int().min(0).max(300),
  tip: z
    .string()
    .min(20)
    .max(450)
    .describe("«Як робити» для людини, яка цього ніколи не робила: 2–3 короткі прості речення — стартова поза, сам рух, на що звернути увагу"),
  videoQuery: z
    .string()
    .min(3)
    .max(80)
    .describe("Запит для пошуку відео-демонстрації на YouTube англійською, напр. «dead bug exercise proper form»"),
});
export type AiExercise = z.infer<typeof aiExerciseSchema>;

export const aiDaySchema = z.object({
  type: z.enum(["strength", "cardio", "mobility", "mixed"]),
  focus: z.string().min(3).max(80).describe("Фокус дня, напр. «Верх тіла + Прес»"),
  title: z.string().max(120).describe("Підзаголовок, напр. «Тягово-жимовий верх + кор»"),
  durationMin: z.number().int().min(10).max(120),
  caloriesEst: z.number().int().min(50).max(1500),
  rpe: z.number().min(1).max(10),
  warmup: z.array(aiExerciseSchema).min(1).max(5),
  main: z.array(aiExerciseSchema).min(2).max(9),
  cooldown: z.array(aiExerciseSchema).min(1).max(5),
});
export type AiDay = z.infer<typeof aiDaySchema>;

export const aiWeekSchema = z.object({
  summary: z.string().min(10).max(1400).describe("Логіка навантаження на тиждень (абзац) + окремий абзац з оцінкою власних тренувань атлета й змінами в них"),
  days: z
    .array(aiDaySchema.extend({ weekday: z.number().int().min(0).max(4) }))
    .length(5)
    .describe("Рівно 5 днів: weekday 0 (Пн) … 4 (Пт)"),
});
export type AiWeek = z.infer<typeof aiWeekSchema>;
