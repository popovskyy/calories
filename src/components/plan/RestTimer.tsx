"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { HAPTIC, vibrate } from "@/lib/haptics";
import { formatSeconds } from "@/lib/plan/format";

/** Таймер відпочинку між підходами. Рахує від Date.now(), тому не «пливе», якщо вкладку приспано. */
export function RestTimer({ seconds }: { seconds: number }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;
    doneRef.current = false;
    const id = setInterval(() => {
      const remain = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(remain);
      if (remain === 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(id);
        setEndsAt(null);
        vibrate(HAPTIC.timerDone);
        toast("Час відпочинку вийшов — наступний підхід");
        setLeft(seconds);
      }
    }, 250);
    return () => clearInterval(id);
  }, [endsAt, seconds]);

  const running = endsAt !== null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-surface-2/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", running ? "animate-ping bg-ember" : "bg-gray-600")} />
        <span className="text-xs text-gray-400">Відпочинок:</span>
        <span className="font-mono text-sm font-bold text-white tabular-nums">{formatSeconds(left)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            setLeft(seconds);
            setEndsAt(Date.now() + seconds * 1000);
          }}
          className="rounded-lg border border-volt/30 bg-volt/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-volt active:scale-95"
        >
          Старт {seconds}с
        </button>
        <button
          aria-label="Скинути таймер"
          onClick={() => {
            setEndsAt(null);
            setLeft(seconds);
          }}
          className="rounded-lg bg-white/5 px-2 py-1 text-gray-400 hover:text-white active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
