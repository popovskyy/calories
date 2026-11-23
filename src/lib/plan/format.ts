import type { DayDTO, DayStatus, ExerciseDTO } from "@/lib/types";

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} с`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m} хв` : `${m} хв ${s} с`;
}

/** «4 × 8–10», «3 × 45 с», «28 хв», «8 × (40с / 80с)». */
export function formatPrescription(ex: Pick<ExerciseDTO, "sets" | "reps" | "durationSec">): string {
  const { sets, reps, durationSec } = ex;
  if (reps && sets) return `${sets} × ${reps}`;
  if (reps) return reps;
  if (durationSec && sets && sets > 1) return `${sets} × ${formatDuration(durationSec)}`;
  if (durationSec) return formatDuration(durationSec);
  if (sets) return `${sets} підх.`;
  return "—";
}

export function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function dayProgress(day: Pick<DayDTO, "exercises" | "completedExerciseIds">) {
  const total = day.exercises.length;
  const ids = new Set(day.exercises.map((e) => e.id));
  // Лише існуючі вправи дня: лог видаленої вправи не має завищувати відсоток.
  const done = day.completedExerciseIds.filter((id) => ids.has(id)).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function dayStatus(
  day: Pick<DayDTO, "workoutCompletedAt" | "completedExerciseIds">,
): DayStatus {
  if (day.workoutCompletedAt) return "done";
  if (day.completedExerciseIds.length > 0) return "in_progress";
  return "planned";
}
