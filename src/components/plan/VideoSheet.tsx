"use client";

import { useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useVideo } from "@/hooks/queries";
import { videoUrl } from "@/lib/plan/format";
import { videoQueryFor } from "@/lib/video/query";
import type { ExerciseDTO } from "@/lib/types";

interface Props {
  exercise: ExerciseDTO | null;
  onClose: () => void;
}

/** Відео-демонстрація вправи у шторці: конкретний ролик у плеєрі, «Інше відео» гортає кандидатів без нових запитів до API. */
export function VideoSheet({ exercise, onClose }: Props) {
  return (
    <Sheet open={!!exercise} onOpenChange={(o) => !o && onClose()} eyebrow="Як робити" title={exercise?.name ?? "Відео"}>
      {exercise && <VideoBody key={exercise.id} exercise={exercise} />}
    </Sheet>
  );
}

function VideoBody({ exercise }: { exercise: ExerciseDTO }) {
  const video = useVideo(videoQueryFor(exercise));
  const [index, setIndex] = useState(0);

  const candidates = video.data?.status === "ok" ? video.data.candidates : [];
  const current = candidates.length > 0 ? candidates[index % candidates.length] : null;
  const searchUrl = video.data?.searchUrl ?? videoUrl(exercise);

  return (
    <div className="space-y-4">
      {video.isPending ? (
        <div className="skeleton aspect-video w-full rounded-2xl" aria-busy aria-label="Шукаю відео" />
      ) : current ? (
        <>
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
            <iframe
              key={current.id}
              src={`https://www.youtube-nocookie.com/embed/${current.id}?playsinline=1&rel=0&modestbranding=1`}
              title={current.title || exercise.name}
              className="h-full w-full"
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{current.title}</p>
            <p className="mt-0.5 text-sm text-gray-400">{current.channel}</p>
          </div>
          <div className="flex gap-2.5">
            {candidates.length > 1 && (
              <button
                onClick={() => setIndex((i) => i + 1)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface px-3 text-sm font-semibold text-gray-100 active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Інше відео
              </button>
            )}
            <a
              href={`https://www.youtube.com/watch?v=${current.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface px-3 text-sm font-semibold text-gray-100 active:scale-95"
            >
              <ExternalLink className="h-4 w-4" />
              YouTube
            </a>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-surface p-4">
          <p className="text-sm text-gray-300">
            {video.isError || video.data?.status === "unavailable"
              ? "Не вдалося підібрати відео автоматично."
              : "Підходящого відео не знайдено."}{" "}
            Можна пошукати вручну.
          </p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl text-base font-bold"
          >
            <ExternalLink className="h-4 w-4" />
            Шукати на YouTube
          </a>
        </div>
      )}

      {exercise.tip && (
        <p className="rounded-xl border border-white/5 bg-black/30 p-3 text-sm leading-relaxed text-gray-200">
          <span className="font-semibold text-volt">Коротко: </span>
          {exercise.tip}
        </p>
      )}
    </div>
  );
}
