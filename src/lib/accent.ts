import type { DayType, ExerciseType } from "@/lib/types";

/** Літерали класів (а не складені рядки) — щоб Tailwind їх бачив при скануванні. */
export interface Accent {
  text: string;
  bg: string;
  border: string;
  dot: string;
  bar: string;
  hex: string;
}

const VOLT: Accent = { text: "text-volt", bg: "bg-volt/15", border: "border-volt/30", dot: "bg-volt", bar: "bg-volt", hex: "#A3E635" };
const EMBER: Accent = { text: "text-ember", bg: "bg-ember/15", border: "border-ember/30", dot: "bg-ember", bar: "bg-ember", hex: "#F97316" };
const IRIS: Accent = { text: "text-iris", bg: "bg-iris/15", border: "border-iris/30", dot: "bg-iris", bar: "bg-iris", hex: "#818CF8" };

export function accentFor(type: DayType | ExerciseType | "other"): Accent {
  switch (type) {
    case "cardio":
      return EMBER;
    case "mobility":
      return IRIS;
    default:
      return VOLT;
  }
}

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  strength: "Силовий день",
  cardio: "Кардіо",
  mobility: "Мобіліті",
  mixed: "Комбінований",
};
