/** DTO, спільні для сервера (route handlers) і клієнта (React Query). */

export type ExerciseType = "strength" | "cardio" | "mobility";
export type DayType = "strength" | "cardio" | "mobility" | "mixed";
export type Block = "warmup" | "main" | "cooldown";
export type EquipmentCategory = "strength" | "cardio" | "mobility" | "other";
export type AdaptMode = "fatigued" | "short_time" | "full_power";
export type DayStatus = "planned" | "in_progress" | "done";
export type AthleteLevel = "beginner" | "intermediate" | "advanced";

export const LEVEL_LABEL: Record<AthleteLevel, string> = {
  beginner: "Новачок",
  intermediate: "Середній",
  advanced: "Просунутий",
};
export const LEVEL_HINT: Record<AthleteLevel, string> = {
  beginner: "Полегшені варіанти, 2–3 підходи, багато уваги техніці",
  intermediate: "Стандартні рухи, 3–4 підходи, запас 1–2 повтори",
  advanced: "Складні варіанти, темп і паузи, 4–5 підходів",
};

export const BLOCKS: readonly Block[] = ["warmup", "main", "cooldown"];

export const BLOCK_LABEL: Record<Block, string> = {
  warmup: "Розминка",
  main: "Основний блок",
  cooldown: "Заминка",
};

export interface ProfileDTO {
  name: string;
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
  goal: string;
  limitations: string;
  level: AthleteLevel;
  routine: string;
}

export interface EquipmentDTO {
  id: string;
  name: string;
  detail: string | null;
  category: EquipmentCategory;
  adjustable: boolean;
  maxWeightKg: number | null;
  weightKg: number | null;
  active: boolean;
  source: "manual" | "vision";
}

export interface ExerciseDTO {
  id: string;
  block: Block;
  position: number;
  name: string;
  type: ExerciseType;
  equipment: string | null;
  sets: number | null;
  reps: string | null;
  durationSec: number | null;
  tempo: string | null;
  load: string | null;
  restSec: number;
  tip: string;
  videoQuery: string | null;
}

export interface DayDTO {
  id: string;
  weekday: number;
  date: string;
  type: DayType;
  focus: string;
  title: string | null;
  durationMin: number;
  caloriesEst: number;
  rpe: number | null;
  adaptedMode: AdaptMode | null;
  exercises: ExerciseDTO[];
  /** id вправ, які атлет закрив (hold-to-complete). */
  completedExerciseIds: string[];
  /** ISO-час завершення всього тренування або null. */
  workoutCompletedAt: string | null;
}

export interface PlanDTO {
  id: string;
  weekStart: string;
  summary: string | null;
  createdAt: string;
  days: DayDTO[];
}

export interface ScanResultDTO {
  equipment: EquipmentDTO[];
  detected: number;
  added: number;
  alreadyHad: number;
  note: string | null;
}

export interface VideoCandidateDTO {
  id: string;
  title: string;
  channel: string;
}

export interface VideoResponseDTO {
  status: "ok" | "none" | "unavailable";
  candidates: VideoCandidateDTO[];
  searchUrl: string;
}
