import type { Equipment, Prisma, UserProfile } from "@prisma/client";
import type {
  AdaptMode,
  Block,
  DayDTO,
  DayType,
  EquipmentCategory,
  EquipmentDTO,
  ExerciseDTO,
  ExerciseType,
  PlanDTO,
  ProfileDTO,
} from "@/lib/types";

export const planInclude = {
  days: {
    orderBy: { weekday: "asc" },
    include: {
      exercises: { orderBy: { position: "asc" } },
      logs: true,
    },
  },
} satisfies Prisma.WorkoutPlanInclude;

export type PlanWithRelations = Prisma.WorkoutPlanGetPayload<{ include: typeof planInclude }>;

export function toProfileDTO(p: UserProfile): ProfileDTO {
  return {
    name: p.name,
    sex: p.sex === "female" ? "female" : "male",
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    goal: p.goal,
    limitations: p.limitations,
  };
}

export function toEquipmentDTO(e: Equipment): EquipmentDTO {
  return {
    id: e.id,
    name: e.name,
    detail: e.detail,
    category: e.category as EquipmentCategory,
    adjustable: e.adjustable,
    maxWeightKg: e.maxWeightKg,
    weightKg: e.weightKg,
    active: e.active,
    source: e.source === "vision" ? "vision" : "manual",
  };
}

type DayWithRelations = PlanWithRelations["days"][number];

export function toDayDTO(d: DayWithRelations): DayDTO {
  const workoutLog = d.logs.find((l) => l.kind === "workout");
  return {
    id: d.id,
    weekday: d.weekday,
    date: d.date,
    type: d.type as DayType,
    focus: d.focus,
    title: d.title,
    durationMin: d.durationMin,
    caloriesEst: d.caloriesEst,
    rpe: d.rpe,
    adaptedMode: (d.adaptedMode as AdaptMode | null) ?? null,
    exercises: d.exercises.map(
      (e): ExerciseDTO => ({
        id: e.id,
        block: e.block as Block,
        position: e.position,
        name: e.name,
        type: e.type as ExerciseType,
        equipment: e.equipment,
        sets: e.sets,
        reps: e.reps,
        durationSec: e.durationSec,
        tempo: e.tempo,
        load: e.load,
        restSec: e.restSec,
        tip: e.tip,
      }),
    ),
    completedExerciseIds: d.logs
      .filter((l) => l.kind === "exercise" && l.exerciseId)
      .map((l) => l.exerciseId as string),
    workoutCompletedAt: workoutLog ? workoutLog.completedAt.toISOString() : null,
  };
}

export function toPlanDTO(plan: PlanWithRelations): PlanDTO {
  return {
    id: plan.id,
    weekStart: plan.weekStart,
    summary: plan.summary,
    createdAt: plan.createdAt.toISOString(),
    days: plan.days.map(toDayDTO),
  };
}
