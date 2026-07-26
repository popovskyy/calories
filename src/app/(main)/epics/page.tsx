"use client";

import { toast } from "sonner";
import { EpicCard } from "@/components/EpicCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEpics, useStartEpic } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";

/** Хроніки — довгі походи на місяці. Активний обираєш сам. */
export default function EpicsPage() {
  const mounted = useMounted();
  const q = useEpics();
  const start = useStartEpic();

  const onStart = (id: string) =>
    start.mutate(id, {
      onSuccess: () => toast.success("Шлях розпочато!"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
    });

  const epics = q.data?.epics ?? [];
  const background = epics.filter((e) => e.background);
  const journeys = epics.filter((e) => !e.background);

  return (
    <>
      <header>
        <h1 className="text-[24px] font-semibold text-[var(--color-text)]">Хроніки</h1>
        <p className="mt-0.5 text-[14px] text-[var(--color-muted3)]">
          Довгі походи. Кожен вузол платить окремо
        </p>
      </header>

      {!mounted || q.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[140px] w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[15px] text-[var(--color-muted3)]">
            Не вдалося завантажити хроніки
          </p>
          <button className="btn btn-primary" onClick={() => q.refetch()}>
            Спробувати знову
          </button>
        </div>
      ) : (
        <>
          {background.length > 0 ? (
            <section className="mcard flex flex-col gap-3 p-[18px]">
              <span className="lbl">Завжди з тобою</span>
              {background.map((e) => (
                <EpicCard key={e.epicId} epic={e} />
              ))}
            </section>
          ) : null}

          <section className="mcard flex flex-col gap-3 p-[18px]">
            <span className="lbl">Походи</span>
            <p className="text-[12px] text-[var(--color-muted3)]">
              Активним може бути один. Вирушиш в інший — цей зачекає.
            </p>
            {journeys.map((e) => (
              <EpicCard
                key={e.epicId}
                epic={e}
                onStart={onStart}
                starting={start.isPending}
              />
            ))}
          </section>
        </>
      )}
    </>
  );
}
