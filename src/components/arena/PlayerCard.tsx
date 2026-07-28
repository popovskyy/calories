"use client";

import { Flame, Target, Trophy, UtensilsCrossed } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/ui/Dialog";
import { EVOLUTION_STAGES } from "@/lib/economy";
import type { ArenaEntry } from "@/lib/types";

/**
 * Картка учасника арени.
 *
 * У списку видно лише місце і похибку — цього мало, щоб зрозуміти, ЯК саме
 * суперник тримає норму. Тут повний зріз дня: калорії, БЖУ, скільки лишилось,
 * і зароблені бейджі (стадія маскота, серія, точні дні, титул).
 */
export function PlayerCard({
  entry,
  onOpenChange,
}: {
  entry: ArenaEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal
      open={!!entry}
      onOpenChange={onOpenChange}
      title={entry?.name ?? ""}
      description={entry ? `@${entry.username} · ${entry.goalLabel}` : undefined}
    >
      {entry ? <Body entry={entry} /> : null}
    </Modal>
  );
}

function Body({ entry }: { entry: ArenaEntry }) {
  const over = entry.difference < 0;
  const left = Math.max(0, entry.difference);
  const pct =
    entry.targetCalories > 0
      ? Math.min(1, Math.max(0, entry.todayCalories / entry.targetCalories))
      : 0;

  // Ваги суперника ми не знаємо (та й показувати чужу вагу не варто), тож
  // орієнтир у грамах порахувати чесно неможливо — показуємо частку калорій
  // від кожного макроса: це видно з самих записів і одразу читає перекос.
  const kcal = {
    protein: entry.protein * 4,
    fats: entry.fats * 9,
    carbs: entry.carbs * 4,
  };
  const kcalTotal = kcal.protein + kcal.fats + kcal.carbs;
  const share = (v: number) => (kcalTotal > 0 ? v / kcalTotal : 0);

  const stageName =
    EVOLUTION_STAGES[entry.stage - 1]?.nameUk ?? EVOLUTION_STAGES[0]!.nameUk;

  const badges: { icon: React.ReactNode; label: string; hint: string }[] = [
    {
      icon: <Trophy size={13} />,
      label: stageName,
      hint: `стадія ${entry.stage} з ${EVOLUTION_STAGES.length}`,
    },
    {
      icon: <Flame size={13} />,
      label: `${entry.maxStreak} дн.`,
      hint: "рекорд серії",
    },
    {
      icon: <Target size={13} />,
      label: `${entry.inTargetDays}`,
      hint: "днів у нормі",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar
          name={entry.name}
          avatarUrl={entry.avatarUrl}
          size={56}
          stage={entry.stage}
          frame={entry.frame}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-bold tabular-nums text-[var(--color-text)]">
              {entry.hasLog ? entry.score : "—"}
            </span>
            <span className="text-[13px] text-[var(--color-muted3)]">очок дня</span>
          </div>
          {entry.title ? (
            <div className="truncate text-[13px] font-semibold text-[var(--color-accent)]">
              {entry.title}
            </div>
          ) : null}
          <div className="text-[13px] text-[var(--color-muted3)]">
            {entry.rank} місце · {entry.mealsCount}{" "}
            {entry.mealsCount === 1
              ? "запис"
              : entry.mealsCount > 1 && entry.mealsCount < 5
                ? "записи"
                : "записів"}
          </div>
        </div>
      </div>

      {/* Калорії: з'їдено / норма / лишилось */}
      <section className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--color-tile)] p-3">
        <div className="flex items-baseline justify-between">
          <span className="lbl !mb-0">Калорії</span>
          <span
            className="text-[13px] font-semibold"
            style={{ color: over ? "var(--color-red)" : "var(--color-green)" }}
          >
            {over
              ? `Перебір ${Math.abs(entry.difference).toLocaleString("uk-UA")}`
              : `Лишилось ${left.toLocaleString("uk-UA")}`}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[22px] font-bold tabular-nums text-[var(--color-text)]">
            {entry.todayCalories.toLocaleString("uk-UA")}
          </span>
          <span className="text-[14px] text-[var(--color-muted3)]">
            / {entry.targetCalories.toLocaleString("uk-UA")} ккал
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-track)]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${pct * 100}%`,
              background: over ? "var(--color-red)" : "var(--color-accent)",
            }}
          />
        </div>
      </section>

      {/* БЖУ */}
      <section className="flex flex-col gap-2">
        <span className="lbl">Білки · жири · вуглеводи</span>
        <div className="flex gap-2">
          <Macro
            label="Білки"
            grams={entry.protein}
            share={share(kcal.protein)}
            color="var(--color-macro-protein)"
          />
          <Macro
            label="Жири"
            grams={entry.fats}
            share={share(kcal.fats)}
            color="var(--color-macro-fats)"
          />
          <Macro
            label="Вугл."
            grams={entry.carbs}
            share={share(kcal.carbs)}
            color="var(--color-macro-carbs)"
          />
        </div>
      </section>

      {/* Досягнення */}
      <section className="flex flex-col gap-2">
        <span className="lbl">Досягнення</span>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b.label + b.hint}
              className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-divider)] bg-[var(--color-tile)] px-2.5 py-1.5"
            >
              <span className="text-[var(--color-accent)]">{b.icon}</span>
              <span className="text-[13px] font-semibold text-[var(--color-text)]">
                {b.label}
              </span>
              <span className="text-[11px] text-[var(--color-muted3)]">{b.hint}</span>
            </span>
          ))}
        </div>
      </section>

      {!entry.hasLog ? (
        <p className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted3)]">
          <UtensilsCrossed size={14} />
          Сьогодні ще нічого не записав
        </p>
      ) : null}
    </div>
  );
}

/** Грами + частка калорій дня, яку дав цей макрос. */
function Macro({
  label,
  grams,
  share,
  color,
}: {
  label: string;
  grams: number;
  share: number;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-tile)] p-2 text-center">
      <div className="text-[11px] text-[var(--color-muted3)]">{label}</div>
      <div className="text-[15px] font-semibold tabular-nums text-[var(--color-text)]">
        {grams}
        <span className="text-[11px] font-normal text-[var(--color-muted3)]"> г</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--color-track)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${share * 100}%`, background: color }}
        />
      </div>
      <div className="mt-0.5 text-[10px] tabular-nums text-[var(--color-muted3)]">
        {Math.round(share * 100)}%
      </div>
    </div>
  );
}
