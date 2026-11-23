import type { AiDay, AiExercise, AiWeek } from "@/lib/gemini/schemas";
import { BLOCKS } from "@/lib/types";

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
