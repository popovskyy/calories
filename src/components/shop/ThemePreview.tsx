import { cn } from "@/lib/cn";

/**
 * Міні-сцена теми в магазині — атмосфера без підписів шрифтів.
 * Кожна тема має свій силует, щоб картки читались з першого погляду.
 */
export function ThemePreview({
  themeId,
  previewBg,
  previewAccent,
  className,
}: {
  themeId: string;
  previewBg: string;
  previewAccent: string;
  className?: string;
}) {
  return (
    <div
      className={cn("relative h-20 w-full overflow-hidden rounded-[var(--radius-md)]", className)}
      style={{ background: previewBg }}
      aria-hidden
    >
      <Art id={themeId} accent={previewAccent} />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(60% 80% at 70% 20%, ${previewAccent}55, transparent 70%)`,
        }}
      />
    </div>
  );
}

function Art({ id, accent }: { id: string; accent: string }) {
  switch (id) {
    case "nocturne":
      return (
        <>
          <svg
            className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2"
            viewBox="0 0 56 56"
          >
            <circle
              cx="28"
              cy="28"
              r="20"
              fill="none"
              stroke="rgba(255,255,255,.12)"
              strokeWidth="5"
            />
            <circle
              cx="28"
              cy="28"
              r="20"
              fill="none"
              stroke={accent}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="88 126"
              transform="rotate(-90 28 28)"
            />
            <circle cx="28" cy="28" r="6" fill={accent} opacity="0.85" />
          </svg>
          <span
            className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full"
            style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
          />
        </>
      );
    case "minecraft":
      return (
        <>
          <div className="absolute bottom-2 left-2 flex items-end gap-0.5">
            <i className="block h-3 w-3" style={{ background: "#5b9c3a" }} />
            <i className="block h-5 w-3" style={{ background: "#3d6b28" }} />
            <i className="block h-4 w-3" style={{ background: "#80ff20" }} />
            <i className="block h-6 w-3" style={{ background: "#5b9c3a" }} />
            <i className="block h-3 w-3" style={{ background: "#8b5a2b" }} />
          </div>
          <div className="absolute bottom-2 left-[42%] right-2 h-1.5 overflow-hidden rounded-sm bg-black/40">
            <div className="h-full w-[70%]" style={{ background: accent }} />
          </div>
          <span
            className="absolute right-3 top-2.5 h-2.5 w-2.5"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
        </>
      );
    case "forest":
      return (
        <>
          <svg className="absolute bottom-1 left-2 h-12 w-16" viewBox="0 0 64 48" fill="none">
            <path d="M12 44 L20 18 L28 44 Z" fill="#1a3d2a" />
            <path d="M22 44 L32 10 L42 44 Z" fill="#245038" />
            <path d="M36 44 L46 20 L56 44 Z" fill="#1a3d2a" />
          </svg>
          <span
            className="absolute bottom-3 right-5 h-3 w-3 rounded-full"
            style={{
              background: `radial-gradient(circle, ${accent} 0%, #ff4d1a 55%, transparent 75%)`,
              boxShadow: `0 0 16px ${accent}`,
            }}
          />
          <span
            className="absolute right-3 top-2 h-1 w-8 rounded-full opacity-50"
            style={{ background: accent }}
          />
        </>
      );
    case "lighthouse":
      return (
        <>
          <div
            className="absolute -right-4 top-0 h-full w-24 origin-top-right opacity-50"
            style={{
              background: `linear-gradient(105deg, transparent 35%, ${accent}66 50%, transparent 65%)`,
              clipPath: "polygon(40% 0, 100% 0, 70% 100%, 10% 100%)",
            }}
          />
          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <span
              className="mb-0.5 h-2 w-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
            />
            <span
              className="h-8 w-3 rounded-t-sm"
              style={{ background: "#c9d4e0" }}
            />
            <span
              className="h-1.5 w-5 rounded-sm"
              style={{ background: "#8a96a8" }}
            />
          </div>
        </>
      );
    case "polonyna":
      return (
        <>
          {/* сонце сходить над хребтом — та сама метафора, що в героєві */}
          <span
            className="absolute right-6 top-4 h-5 w-5 rounded-full"
            style={{ background: accent, boxShadow: `0 0 18px ${accent}` }}
          />
          <svg className="absolute bottom-0 left-0 h-14 w-full" viewBox="0 0 120 56" fill="none">
            <path d="M0 40 L22 24 L44 36 L68 18 L96 34 L120 26 L120 56 L0 56 Z" fill="#8f8fae" opacity="0.55" />
            <path d="M0 48 L26 36 L54 46 L82 34 L110 46 L120 42 L120 56 L0 56 Z" fill="#4c6b4f" />
            <path d="M0 52 Q40 47 76 52 Q104 56 120 50 L120 56 L0 56 Z" fill="#7ba05b" />
            <ellipse cx="34" cy="53" rx="5" ry="2.6" fill="#fdf6ec" />
            <ellipse cx="52" cy="54" rx="4" ry="2.2" fill="#fdf6ec" opacity=".9" />
          </svg>
        </>
      );
    case "abyss":
      return (
        <>
          {/* батискаф у промені + планктон */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 120 80" fill="none">
            <ellipse cx="60" cy="34" rx="11" ry="9" fill="#123a4a" stroke={accent} strokeWidth="1.4" />
            <circle cx="60" cy="34" r="4" fill={accent} opacity=".8" />
            <path d="M60 43 L52 72 L68 72 Z" fill={accent} opacity=".12" />
            <circle cx="26" cy="20" r="1.6" fill={accent} opacity=".7" />
            <circle cx="96" cy="30" r="1.2" fill={accent} opacity=".55" />
            <circle cx="34" cy="60" r="1.4" fill={accent} opacity=".5" />
            <circle cx="88" cy="62" r="1" fill={accent} opacity=".45" />
          </svg>
        </>
      );
    default:
      return (
        <span
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: accent, opacity: 0.7 }}
        />
      );
  }
}
