import { Dumbbell, HeartPulse, Layers, PersonStanding, type LucideProps } from "lucide-react";
import type { DayType, ExerciseType } from "@/lib/types";

/** Єдине візуальне позначення типу: силові — гантеля, кардіо — пульс, мобіліті — людина в розтяжці, комбінований — шари. */
export const TYPE_ICON: Record<DayType | ExerciseType, (props: LucideProps) => React.ReactElement> = {
  strength: (p) => <Dumbbell {...p} />,
  cardio: (p) => <HeartPulse {...p} />,
  mobility: (p) => <PersonStanding {...p} />,
  mixed: (p) => <Layers {...p} />,
};

export const TYPE_NAME: Record<DayType | ExerciseType, string> = {
  strength: "Силова",
  cardio: "Кардіо",
  mobility: "Мобіліті",
  mixed: "Комбінована",
};

export function TypeIcon({ type, ...props }: { type: DayType | ExerciseType } & LucideProps) {
  const Icon = TYPE_ICON[type] ?? TYPE_ICON.strength;
  return <Icon aria-hidden {...props} />;
}
