import { z } from "zod";

export const equipmentFields = z.object({
  name: z.string().trim().min(2).max(80),
  detail: z.string().trim().max(140).nullish(),
  category: z.enum(["strength", "cardio", "mobility", "other"]),
  adjustable: z.boolean(),
  maxWeightKg: z.number().min(0.5).max(300).nullish(),
  weightKg: z.number().min(0.5).max(300).nullish(),
});

/** Поточна вага регульованого снаряда не може перевищувати його максимум. */
export function normalizeWeights<T extends { adjustable?: boolean; maxWeightKg?: number | null; weightKg?: number | null }>(
  d: T,
) {
  if (d.adjustable === false) return { ...d, maxWeightKg: null, weightKg: null };
  if (d.maxWeightKg != null && d.weightKg != null && d.weightKg > d.maxWeightKg) {
    return { ...d, weightKg: d.maxWeightKg };
  }
  return d;
}
