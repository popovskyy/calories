import { Prisma, type Equipment, type UserProfile } from "@prisma/client";
import type { Part } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { addDays, WEEKDAY_SHORT } from "@/lib/dates";
import { equipmentKey } from "@/lib/equipment-key";
import { HttpError } from "@/lib/http";
import { generateValidated } from "@/lib/gemini/client";
import {
  COACH_SYSTEM,
  SCAN_SYSTEM,
  adaptUserPrompt,
  scanUserPrompt,
  weekUserPrompt,
  type AliasedEquipment,
} from "@/lib/gemini/prompts";
import { aiDaySchema, aiWeekSchema, scanSchema, type AiDay } from "@/lib/gemini/schemas";
import { BLOCKS, type AdaptMode, type AthleteLevel, type PlanDTO, type ScanResultDTO } from "@/lib/types";
import { formatPrescription } from "@/lib/plan/format";
import { planInclude, toDayDTO, toEquipmentDTO, toPlanDTO, type PlanWithRelations } from "@/lib/plan/serialize";
import { qualityDay, qualityWeek, validateDay, validateWeek, type RequiredEquipment } from "@/lib/plan/validate";

/* ------------------------------------------------------------------ */
/* Профіль та інвентар                                                  */
/* ------------------------------------------------------------------ */

/** Один рядок id="me"; створюється з дефолтами з ТЗ (35 р., 186 см, 93.5 кг) при першому зверненні. */
export function getProfile() {
  return prisma.userProfile.upsert({ where: { id: "me" }, update: {}, create: { id: "me" } });
}

export function listEquipment() {
  return prisma.equipment.findMany({ orderBy: [{ createdAt: "asc" }] });
}

function aliasEquipment(items: Equipment[]): AliasedEquipment[] {
  return items.filter((e) => e.active).map((item, i) => ({ alias: `E${i + 1}`, item }));
}

/* ------------------------------------------------------------------ */
/* Gemini Vision: розпізнавання фото                                    */
/* ------------------------------------------------------------------ */

export async function scanEquipment(images: { mime: string; data: string }[]): Promise<ScanResultDTO> {
  const existing = await listEquipment();
  const parts: Part[] = [
    { text: scanUserPrompt(existing.map((e) => e.name), images.length) },
    ...images.map((img) => ({ inlineData: { mimeType: img.mime, data: img.data } })),
  ];

  const { data } = await generateValidated({
    system: SCAN_SYSTEM,
    userParts: parts,
    schema: scanSchema,
    semanticCheck: () => [],
    temperature: 0.2,
    maxOutputTokens: 6000,
  });

  const known = new Set(existing.map((e) => e.key));
  const confident = data.items.filter((i) => i.confidence >= 0.45);
  let added = 0;
  let alreadyHad = 0;

  for (const it of confident) {
    const key = equipmentKey(it.name);
    if (!key) continue;
    if (known.has(key)) {
      alreadyHad++;
      continue;
    }
    try {
      await prisma.equipment.create({
        data: {
          name: it.name.trim(),
          key,
          detail: it.detail?.trim() || null,
          category: it.category,
          adjustable: it.adjustable,
          maxWeightKg: it.adjustable ? it.maxWeightKg : null,
          weightKg: it.adjustable ? it.maxWeightKg : null,
          source: "vision",
        },
      });
      known.add(key);
      added++;
    } catch (e) {
      // Паралельний скан уже додав цей предмет (unique key) — це не помилка.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        alreadyHad++;
        continue;
      }
      throw e;
    }
  }

  return {
    equipment: (await listEquipment()).map(toEquipmentDTO),
    detected: confident.length,
    added,
    alreadyHad,
    note: data.note,
  };
}

/* ------------------------------------------------------------------ */
/* Читання плану                                                        */
/* ------------------------------------------------------------------ */

export function findActivePlan(weekStart: string) {
  return prisma.workoutPlan.findFirst({
    where: { weekStart, status: "active" },
    orderBy: { createdAt: "desc" },
    include: planInclude,
  });
}

/* ------------------------------------------------------------------ */
/* Історія для промпту                                                  */
/* ------------------------------------------------------------------ */

function describeDay(day: PlanWithRelations["days"][number]): string {
  const dto = toDayDTO(day);
  const done = new Set(dto.completedExerciseIds);
  const main = dto.exercises.filter((e) => e.block === "main");
  const doneCount = dto.exercises.filter((e) => done.has(e.id)).length;
  const list = main
    .map((e) => `${e.name} (${formatPrescription(e)}${e.load ? `, ${e.load}` : ""}) ${done.has(e.id) ? "✓" : "✗"}`)
    .join("; ");
  return (
    `- ${WEEKDAY_SHORT[dto.weekday]} ${dto.date}: «${dto.focus}» [${dto.type}] — виконано ${doneCount}/${dto.exercises.length}, ` +
    `тренування ${dto.workoutCompletedAt ? "завершено" : "не завершено"}. Основний блок: ${list}`
  );
}

export async function buildHistory(weekStart: string): Promise<string> {
  const plans = await prisma.workoutPlan.findMany({
    where: { status: "active", weekStart: { lt: weekStart } },
    orderBy: { weekStart: "desc" },
    take: 3,
    include: planInclude,
  });
  if (plans.length === 0) {
    return "Історії тренувань ще немає (перший тиждень). Обсяг і складність обирай за рівнем підготовки атлета з профілю, а не за «обережним стартом».";
  }
  return plans
    .map((p) => `Тиждень ${p.weekStart}:\n${p.days.map(describeDay).join("\n")}`)
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Запис згенерованого дня/тижня                                        */
/* ------------------------------------------------------------------ */

function equipmentLabel(ids: string[], aliases: Map<string, Equipment>): string {
  const names = ids.map((id) => aliases.get(id)?.name).filter((n): n is string => !!n);
  return names.length ? names.join(" + ") : "Власна вага";
}

function exerciseRows(day: AiDay, aliases: Map<string, Equipment>) {
  const rows: Omit<Prisma.ExerciseCreateManyInput, "dayId">[] = [];
  let position = 0;
  for (const block of BLOCKS) {
    for (const ex of day[block]) {
      rows.push({
        block,
        position: position++,
        name: ex.name.trim(),
        type: ex.type,
        equipment: equipmentLabel(ex.equipmentIds, aliases),
        sets: ex.sets,
        reps: ex.reps?.trim() || null,
        durationSec: ex.durationSec,
        tempo: ex.tempo?.trim() || null,
        load: ex.load?.trim() || null,
        restSec: ex.restSec,
        tip: ex.tip.trim(),
        videoQuery: ex.videoQuery.trim() || null,
      });
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Генерація тижня                                                      */
/* ------------------------------------------------------------------ */

/** Назви й описи активних предметів одним рядком — для перевірки, що модель не вигадує інвентар у назвах вправ. */
function ownedText(aliased: AliasedEquipment[]): string {
  return aliased.map((a) => `${a.item.name} ${a.item.detail ?? ""}`).join(" ");
}

function levelOf(profile: UserProfile): AthleteLevel {
  return profile.level === "beginner" || profile.level === "advanced" ? profile.level : "intermediate";
}

/** Силові предмети, які тренер зобов'язаний використати протягом тижня (інакше «турнік є, а вправ на нього нема»). */
function requiredStrength(aliased: AliasedEquipment[]): RequiredEquipment[] {
  return aliased.filter((a) => a.item.category === "strength").map((a) => ({ alias: a.alias, name: a.item.name }));
}

/**
 * Чиста частина генерації (без запису в БД): промпт → Gemini → перевірка. Окремо від generateWeek,
 * щоб можна було прогнати живу перевірку якості на реальних даних, нічого не змінюючи в базі.
 */
export async function composeWeek(args: {
  profile: UserProfile;
  equipment: Equipment[];
  history: string;
  weekStart: string;
  note?: string;
}) {
  const aliased = aliasEquipment(args.equipment);
  const aliasMap = new Map(aliased.map((a) => [a.alias, a.item]));
  const allowed = new Set(aliasMap.keys());
  const required = requiredStrength(aliased);

  const { data, model } = await generateValidated({
    system: COACH_SYSTEM,
    userParts: [
      {
        text: weekUserPrompt({
          profile: args.profile,
          equipment: aliased,
          history: args.history,
          weekStart: args.weekStart,
          note: args.note,
        }),
      },
    ],
    schema: aiWeekSchema,
    semanticCheck: (week) => validateWeek(week, allowed),
    qualityCheck: (week) => qualityWeek(week, { required, ownedText: ownedText(aliased), level: levelOf(args.profile) }),
    maxOutputTokens: 24000,
  });
  return { data, model, aliasMap };
}

export async function generateWeek(args: { weekStart: string; note?: string }): Promise<PlanDTO> {
  const [profile, equipment, history] = await Promise.all([
    getProfile(),
    listEquipment(),
    buildHistory(args.weekStart),
  ]);
  const { data, model, aliasMap } = await composeWeek({
    profile,
    equipment,
    history,
    weekStart: args.weekStart,
    note: args.note,
  });

  const days = [...data.days].sort((a, b) => a.weekday - b.weekday);

  let created: PlanWithRelations;
  try {
    [, created] = await prisma.$transaction([
    // Перегенерація не видаляє — архівує: історія попередніх спроб лишається в БД.
    prisma.workoutPlan.updateMany({
      where: { weekStart: args.weekStart, status: "active" },
      data: { status: "archived" },
    }),
    prisma.workoutPlan.create({
      data: {
        weekStart: args.weekStart,
        summary: data.summary.trim(),
        model,
        days: {
          create: days.map((d) => ({
            weekday: d.weekday,
            date: addDays(args.weekStart, d.weekday),
            type: d.type,
            focus: d.focus.trim(),
            title: d.title.trim() || null,
            durationMin: d.durationMin,
            caloriesEst: d.caloriesEst,
            rpe: d.rpe,
            exercises: { create: exerciseRows(d, aliasMap) },
          })),
        },
      },
      include: planInclude,
    }),
    ]);
  } catch (e) {
    // Частковий унікальний індекс workout_plans_one_active_per_week: хтось (інший пристрій) щойно створив активний план цього тижня
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Цей тиждень щойно згенерували з іншого пристрою. Оновіть екран.");
    }
    throw e;
  }

  return toPlanDTO(created);
}

/* ------------------------------------------------------------------ */
/* Адаптація одного дня під стан                                        */
/* ------------------------------------------------------------------ */

export async function adaptDay(args: { dayId: string; mode: AdaptMode; note?: string }): Promise<PlanDTO> {
  const day = await prisma.workoutDay.findUnique({
    where: { id: args.dayId },
    include: { plan: { include: planInclude }, logs: true },
  });
  if (!day || day.plan.status !== "active") throw new HttpError(404, "День не знайдено");
  if (day.logs.some((l) => l.kind === "workout")) {
    throw new HttpError(409, "Тренування цього дня вже завершено — адаптувати нічого");
  }

  const [profile, equipment] = await Promise.all([getProfile(), listEquipment()]);
  const aliased = aliasEquipment(equipment);
  const aliasMap = new Map(aliased.map((a) => [a.alias, a.item]));
  const allowed = new Set(aliasMap.keys());

  const full = toPlanDTO(day.plan);
  const current = full.days.find((d) => d.id === day.id)!;
  const currentText =
    `«${current.focus}» [${current.type}], ${current.durationMin} хв\n` +
    current.exercises
      .map((e) => `- [${e.block}] ${e.name} — ${formatPrescription(e)}${e.load ? `, ${e.load}` : ""}`)
      .join("\n");
  const otherDays = full.days
    .filter((d) => d.id !== day.id)
    .map((d) => `- ${WEEKDAY_SHORT[d.weekday]}: ${d.focus} [${d.type}]`)
    .join("\n");

  const { data } = await generateValidated({
    system: COACH_SYSTEM,
    userParts: [
      {
        text: adaptUserPrompt({
          profile,
          equipment: aliased,
          mode: args.mode,
          weekday: day.weekday,
          currentDay: currentText,
          otherDays,
          note: args.note,
        }),
      },
    ],
    schema: aiDaySchema,
    semanticCheck: (d) => validateDay(d, allowed),
    qualityCheck: (d) => qualityDay(d, "День", args.mode, ownedText(aliased)),
    maxOutputTokens: 8000,
  });

  await prisma.$transaction([
    // Видалення вправ каскадно прибирає їхні логи (FK ON DELETE CASCADE).
    prisma.exercise.deleteMany({ where: { dayId: day.id } }),
    prisma.workoutDay.update({
      where: { id: day.id },
      data: {
        type: data.type,
        focus: data.focus.trim(),
        title: data.title.trim() || null,
        durationMin: data.durationMin,
        caloriesEst: data.caloriesEst,
        rpe: data.rpe,
        adaptedMode: args.mode,
      },
    }),
    prisma.exercise.createMany({
      data: exerciseRows(data, aliasMap).map((r) => ({ ...r, dayId: day.id })),
    }),
  ]);

  const fresh = await prisma.workoutPlan.findUniqueOrThrow({ where: { id: day.planId }, include: planInclude });
  return toPlanDTO(fresh);
}

/* ------------------------------------------------------------------ */
/* Логи виконання (hold-to-complete)                                    */
/* ------------------------------------------------------------------ */

async function assertTarget(dayId: string, exerciseId: string | null) {
  const day = await prisma.workoutDay.findUnique({ where: { id: dayId }, select: { id: true } });
  if (!day) throw new HttpError(404, "День не знайдено");
  if (exerciseId) {
    const ex = await prisma.exercise.findFirst({ where: { id: exerciseId, dayId }, select: { id: true } });
    if (!ex) throw new HttpError(404, "Вправу не знайдено в цьому дні");
  }
}

/** Ідемпотентно: повторний запис того самого (день, ціль) повертає наявний лог. */
export async function completeTarget(dayId: string, exerciseId: string | null) {
  await assertTarget(dayId, exerciseId);
  const target = exerciseId ?? "workout";
  return prisma.workoutLog.upsert({
    where: { dayId_target: { dayId, target } },
    update: {},
    create: { dayId, exerciseId, kind: exerciseId ? "exercise" : "workout", target },
  });
}

export async function uncompleteTarget(dayId: string, exerciseId: string | null) {
  await assertTarget(dayId, exerciseId);
  await prisma.workoutLog.deleteMany({ where: { dayId, target: exerciseId ?? "workout" } });
}
