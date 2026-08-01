/** Тема-питомець (Tamagotchi): спека станів і мапа theme → pet. */

export type PetBody = "lean" | "fit" | "plump" | "ache";
export type PetTrigger = "eat" | "over" | "tap";
export type PetId = "moon" | "deer";

/** Який персонаж у pet-слоті для теми. */
export function petIdForTheme(themeId: string): PetId {
  // forest → олень; решта (nocturne, minecraft, lighthouse, polonyna, …)
  // поки що місячний звір — окремі пакети арта додамо пізніше.
  if (themeId === "forest") return "deer";
  return "moon";
}

/**
 * Денний стан тіла з поточних ккал.
 * lean — майже порожній день / сильний недобір;
 * fit — у зоні цілі (вкл. помірний дефіцит);
 * plump — легкий перебір;
 * ache — сильний перебір (≈ Peppa-поріг / 15%+).
 */
export function computePetBody(consumed: number, target: number): PetBody {
  if (!(target > 0)) return "fit";
  if (consumed <= 0) return "lean";

  const ratio = consumed / target;
  const overBy = consumed - target;

  if (ratio < 0.7) return "lean";
  if (ratio <= 1.05) return "fit";
  if (overBy < 300 && ratio < 1.15) return "plump";
  return "ache";
}

export function petTriggerFromRecalc(
  delta: number,
  body: PetBody,
): PetTrigger | null {
  if (delta <= 0) return null;
  if (body === "ache" || body === "plump") return "over";
  return "eat";
}
