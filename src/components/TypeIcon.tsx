import { HeartPulse, Layers, PersonStanding, type LucideProps } from "lucide-react";
import type { DayType, ExerciseType } from "@/lib/types";

/**
 * Гиря. У lucide її немає, тож малюємо в тому ж стилі (24×24, обвідка 2, круглі кінці):
 * широка ручка, округлий корпус із пласким низом і напівпрозорою заливкою. Без заливки й плоского
 * низу вузька дужка над колом читається як навісний замок.
 */
function Kettlebell(props: LucideProps) {
  const { size = 24, strokeWidth = 2, color = "currentColor", className, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      <path d="M7 9V5.8A2.8 2.8 0 0 1 9.8 3h4.4A2.8 2.8 0 0 1 17 5.8V9" />
      <path d="M7.4 21.2A7.8 7.8 0 1 1 16.6 21.2Z" fill="currentColor" fillOpacity={0.25} />
    </svg>
  );
}

/** Єдине візуальне позначення типу: силові — гиря, кардіо — пульс, мобіліті — людина в розтяжці, комбінований — шари. */
export const TYPE_ICON: Record<DayType | ExerciseType, (props: LucideProps) => React.ReactElement> = {
  strength: Kettlebell,
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
  const Icon = TYPE_ICON[type] ?? Kettlebell;
  return <Icon aria-hidden {...props} />;
}
