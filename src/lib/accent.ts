import type { DayType, ExerciseType } from "@/lib/types";

/** Літерали класів (а не складені рядки) — щоб Tailwind їх бачив при скануванні. */
export interface Accent {
  text: string;
  bg: string;
  border: string;
  dot: string;
  bar: string;
  hex: string;
  /** «r,g,b» для rgba() у світінні */
  glow: string;
  /** градієнт заповнення прогрес-бара */
  grad: string;
}

const VOLT: Accent = { text: "text-volt", bg: "bg-volt/15", border: "border-volt/30", dot: "bg-volt", bar: "bg-volt", hex: "#2B90FE", glow: "43,144,254", grad: "linear-gradient(90deg,#41C6FF,#2B90FE)" };
const EMBER: Accent = { text: "text-ember", bg: "bg-ember/15", border: "border-ember/30", dot: "bg-ember", bar: "bg-ember", hex: "#FF5B1F", glow: "255,91,31", grad: "linear-gradient(90deg,#FF9A4D,#FF5B1F)" };
const BLUSH: Accent = { text: "text-blush", bg: "bg-blush/15", border: "border-blush/30", dot: "bg-blush", bar: "bg-blush", hex: "#FF69B4", glow: "255,105,180", grad: "linear-gradient(90deg,#FFA3D2,#FF69B4)" };

export function accentFor(type: DayType | ExerciseType | "other"): Accent {
  switch (type) {
    case "cardio":
      return EMBER;
    case "mobility":
      return BLUSH;
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
