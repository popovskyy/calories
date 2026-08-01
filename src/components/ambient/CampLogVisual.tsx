import type { CSSProperties } from "react";

/** Коротка колода в стилі «99 ночей у лісі» — циліндр + торець. */
export function CampLogVisual({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative ${className}`}
      style={style}
      aria-hidden
    >
      {/* кора */}
      <div
        className="absolute inset-y-0 left-[7px] right-[2px] rounded-[6px]"
        style={{
          background: "linear-gradient(180deg,#9a6a3e 0%,#6b4424 45%,#4a2e16 100%)",
          boxShadow: "inset 0 -2px 0 rgba(0,0,0,.28), inset 0 1px 0 rgba(255,210,150,.18)",
        }}
      />
      {/* торець зліва — кільця деревини */}
      <div
        className="absolute left-0 top-1/2 h-[110%] w-[14px] -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 42% 42%, #f0d2a0 0%, #d4a86a 35%, #a67a42 70%, #6b4626 100%)",
          boxShadow: "inset 0 0 0 1.5px #5c3a1e, 1px 0 0 rgba(0,0,0,.2)",
        }}
      />
      <div
        className="pointer-events-none absolute left-[3px] top-1/2 h-[40%] w-[8px] -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle at 40% 40%, #5c3a1e, transparent 70%)",
          opacity: 0.55,
        }}
      />
    </div>
  );
}
