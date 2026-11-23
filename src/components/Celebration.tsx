"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const COLORS = ["#FFD700", "#FFE680", "#41C6FF", "#2B90FE", "#FFFFFF", "#4CE892"];
const PIECES = 46;
const VISIBLE_MS = 2300;

interface Piece {
  id: number;
  x: number;
  y: number;
  r: number;
  w: number;
  h: number;
  c: string;
  t: number;
}

/**
 * Єдиний «святковий» момент застосунку: завершене тренування. Золотий напис + салют
 * із центру екрана. Монтується з новим `key` при кожному завершенні; сам зникає.
 * Рендериться порталом у мобільний контейнер, щоб на десктопі не вилітати за «телефон».
 */
export function Celebration({ title, subtitle }: { title: string; subtitle: string }) {
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setFrame(document.getElementById("app-frame"));
    // Math.random — лише в ефекті, не під час рендеру
    setPieces(
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (Math.PI * 2 * i) / PIECES + Math.random() * 0.45;
        const dist = 110 + Math.random() * 190;
        return {
          id: i,
          x: Math.cos(angle) * dist,
          // «гравітація»: частинки розліталися б симетрично, тож усе трохи тягне вниз
          y: Math.sin(angle) * dist * 0.85 + 70,
          r: (Math.random() - 0.5) * 720,
          w: 5 + Math.random() * 6,
          h: 8 + Math.random() * 9,
          c: COLORS[i % COLORS.length],
          t: 1.1 + Math.random() * 0.9,
        };
      }),
    );
    const id = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(id);
  }, []);

  if (!frame || !visible) return null;

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden" role="status" aria-live="polite">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              "--x": `${p.x}px`,
              "--y": `${p.y}px`,
              "--r": `${p.r}deg`,
              "--w": `${p.w}px`,
              "--h": `${p.h}px`,
              "--c": p.c,
              "--t": `${p.t}s`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="finish-title absolute inset-x-0 top-[26%] px-4 text-center">
        {/* Темна підкладка: золото має читатись і поверх карток, що лишаються під написом */}
        <div className="mx-auto w-fit rounded-[32px] bg-[radial-gradient(closest-side,rgba(12,17,28,0.92),rgba(12,17,28,0.75)_70%,transparent)] px-10 py-6">
        <div className="font-display text-4xl leading-none font-semibold tracking-wide text-gold drop-shadow-[0_0_22px_rgba(255,215,0,0.5)]">
          {title}
        </div>
        <div className="mt-2 font-mono text-xs text-gray-200">{subtitle}</div>
        </div>
      </div>
    </div>,
    frame,
  );
}
