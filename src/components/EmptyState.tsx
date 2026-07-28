"use client";

import type { LucideIcon } from "lucide-react";
import { useThemeId } from "@/hooks/useThemeId";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Контекст для тематичного копірайту */
  context?: "log" | "arena" | "generic";
}

const COPY: Record<
  string,
  Partial<Record<"log" | "arena" | "generic", { title: string; subtitle: string }>>
> = {
  forest: {
    log: {
      title: "Підкинь перше поліно",
      subtitle: "Запиши їжу або активність — вогнище чекає.",
    },
    arena: {
      title: "Ліс порожній",
      subtitle: "Запроси друзів — разом ближче до норми.",
    },
  },
  minecraft: {
    log: {
      title: "Зламай перший блок",
      subtitle: "Додай їжу або рух кнопкою «＋».",
    },
    arena: {
      title: "Сервер чекає",
      subtitle: "Запроси друзів у світ — і почнеться рейтинг.",
    },
  },
  lighthouse: {
    log: {
      title: "Увімкни маяк",
      subtitle: "Перший запис — перший промінь у темряві.",
    },
    arena: {
      title: "Берег порожній",
      subtitle: "Поклич друзів — хто ближче до норми.",
    },
  },
  polonyna: {
    log: {
      title: "Розпали ватру",
      subtitle: "Перший запис — і полонина прокинеться.",
    },
    arena: {
      title: "Полонина порожня",
      subtitle: "Клич ґазд — разом веселіше тримати норму.",
    },
  },
  nocturne: {
    log: {
      title: "Ще немає записів",
      subtitle: "Додайте їжу або активність кнопкою «＋».",
    },
    arena: {
      title: "Поки нікого немає",
      subtitle: "Запросіть друзів — арена оживає разом.",
    },
  },
};

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
  context = "generic",
}: EmptyStateProps) {
  const theme = useThemeId();
  const themed = COPY[theme]?.[context] ?? COPY.nocturne?.[context];
  const finalTitle = title ?? themed?.title ?? "Порожньо";
  const finalSubtitle = subtitle ?? themed?.subtitle;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden px-6 py-14 text-center",
        "rounded-[var(--radius-lg)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            theme === "forest"
              ? "radial-gradient(60% 50% at 50% 30%, rgba(255,138,61,.12), transparent 70%)"
              : theme === "minecraft"
                ? "radial-gradient(60% 50% at 50% 30%, rgba(128,255,32,.1), transparent 70%)"
                : theme === "lighthouse"
                  ? "radial-gradient(55% 45% at 50% 20%, rgba(255,179,92,.14), transparent 68%)"
                  : theme === "polonyna"
                    ? "radial-gradient(60% 50% at 50% 25%, rgba(255,180,84,.2), transparent 70%)"
                    : "radial-gradient(55% 45% at 50% 25%, rgba(145,132,217,.1), transparent 70%)",
        }}
      />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-muted2)]">
        <Icon size={26} strokeWidth={1.7} />
      </div>
      <div className="relative">
        <p className="text-[17px] font-semibold text-[var(--color-text)]">{finalTitle}</p>
        {finalSubtitle ? (
          <p className="mt-1 text-[15px] leading-relaxed text-[var(--color-muted3)]">
            {finalSubtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="relative mt-1">{action}</div> : null}
    </div>
  );
}
