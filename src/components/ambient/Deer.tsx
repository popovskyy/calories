"use client";

/**
 * Олень із «99 ночей у лісі» — гуманоїдний силует, viewBox 120×170.
 *
 * gait керує «розумом»: idle не марширує на місці (це виглядало тупо),
 * walk — спокійна хода, run — втеча від дровини.
 */

export type DeerGait = "idle" | "walk" | "run";
export type DeerBody = "lean" | "fit" | "plump" | "ache";

interface Palette {
  legFront: string;
  legBack: string;
  body: string;
  head: string;
  ear: string;
  antler: string;
  antlerWidth: number;
  eye: string;
  muzzleStroke: string;
  nose: string;
}

const FIELD: Palette = {
  legFront: "#241408",
  legBack: "#1b0f06",
  body: "#3a2517",
  head: "#3f2819",
  ear: "#e39aa6",
  antler: "#0a0705",
  antlerWidth: 5,
  eye: "#f7f2ea",
  muzzleStroke: "#6b4a34",
  nose: "#2a180d",
};

const CAMP: Palette = {
  legFront: "#160c05",
  legBack: "#0f0803",
  body: "#241608",
  head: "#2a1a0f",
  ear: "#b5717d",
  antler: "#080503",
  antlerWidth: 6,
  eye: "#ffe9a8",
  muzzleStroke: "#5c3f2c",
  nose: "#1d1108",
};

interface DeerProps {
  variant: "field" | "camp";
  width: number;
  height: number;
  /** Дровина у вогнищі — очі червоніють */
  scared?: boolean;
  /** Локомоція: idle = дихає/дивиться, walk/run = ноги */
  gait?: DeerGait;
  /** Стан тіла питомця (Tamagotchi) */
  body?: DeerBody;
}

export function Deer({
  variant,
  width,
  height,
  scared = false,
  gait = "walk",
  body = "fit",
}: DeerProps) {
  const p = variant === "camp" ? CAMP : FIELD;
  const moving = gait === "walk" || gait === "run";
  /* run — швидкий цикл ніг; walk — повільніший, з м’яким easing у CSS */
  const pace = gait === "run" ? 0.28 : gait === "walk" ? 1.15 : 0;
  const scan = gait === "idle" ? 8.2 : gait === "walk" ? 6.2 : 0;
  const belly =
    body === "lean"
      ? "scale(0.86, 0.92)"
      : body === "plump"
        ? "scale(1.12, 1.08)"
        : body === "ache"
          ? "scale(1.2, 1.12)"
          : "scale(1, 1)";
  const eyeFill = scared || body === "ache" ? "#ff6a4a" : p.eye;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 170"
      aria-hidden="true"
      className={scared ? "deer-scared" : undefined}
      style={
        gait === "idle"
          ? { animation: "deerBreathe 3.6s ease-in-out infinite" }
          : gait === "run"
            ? { animation: "deerStalk 0.22s linear infinite" }
            : { animation: "deerStalk 1.1s ease-in-out infinite" }
      }
    >
      <g
        className="deer-part"
        style={
          moving
            ? {
                transformOrigin: "50% 90%",
                animation: `legFwd ${pace}s ${gait === "run" ? "linear" : "cubic-bezier(0.45, 0.05, 0.55, 0.95)"} infinite`,
              }
            : { transformOrigin: "50% 90%" }
        }
      >
        <path d="M50 132h11l-1 26-4 8-6-2 3-8-3-24Z" fill={p.legFront} />
        <path
          d="M50 164l-6 6M54 166l-3 8M58 166l1 8"
          stroke={p.legFront}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g
        className="deer-part"
        style={
          moving
            ? {
                transformOrigin: "50% 90%",
                animation: `legBack ${pace}s ${gait === "run" ? "linear" : "cubic-bezier(0.45, 0.05, 0.55, 0.95)"} infinite`,
              }
            : { transformOrigin: "50% 90%" }
        }
      >
        <path d="M64 132h11l-3 26 3 8-6 2-4-8-1-28Z" fill={p.legBack} />
        <path
          d="M70 164l6 6M68 166l3 8M65 166l-1 8"
          stroke={p.legBack}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      <g style={{ transformOrigin: "60px 118px", transform: belly }}>
        <path
          d="M42 100q18-7 36 0l5 22-4 16-4-11-4 13-4-12-5 12-4-13-4 11-6-16 -2-22Z"
          fill={p.body}
        />
      </g>

      <g
        className="deer-part"
        style={
          body === "ache"
            ? { transformOrigin: "80% 8%", transform: "rotate(28deg)" }
            : moving
              ? {
                  transformOrigin: "80% 8%",
                  animation: `armSway ${pace}s ease-in-out infinite`,
                }
              : { transformOrigin: "80% 8%" }
        }
      >
        <path
          d="M45 104q-13 13-15 32"
          stroke={p.body}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M30 136l-5 12M30 136l1 13M30 136l6 11"
          stroke={p.legBack}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g
        className="deer-part"
        style={
          body === "ache"
            ? { transformOrigin: "20% 8%", transform: "rotate(-28deg)" }
            : moving
              ? {
                  transformOrigin: "20% 8%",
                  animation: `armSway ${pace}s ease-in-out ${pace / 2}s infinite`,
                }
              : { transformOrigin: "20% 8%" }
        }
      >
        <path
          d="M75 104q13 13 15 32"
          stroke={p.body}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M90 136l5 12M90 136l-1 13M90 136l-6 11"
          stroke={p.legBack}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      <g
        className="deer-part"
        style={
          scan > 0
            ? {
                transformOrigin: "50% 78%",
                animation: `headScan ${scan}s cubic-bezier(0.33, 1, 0.68, 1) infinite`,
              }
            : {
                transformOrigin: "50% 78%",
                transform: scared ? "rotate(6deg)" : "rotate(-2deg)",
              }
        }
      >
        <g stroke={p.antler} strokeWidth={p.antlerWidth} strokeLinecap="round" fill="none">
          <path d="M45 50C41 36 35 26 25 14" />
          <path d="M34 28L20 24M30 19L27 6M40 39L27 38" />
          <path d="M75 50C79 36 85 26 95 14" />
          <path d="M86 28l14-4M90 19l3-13M80 39l13-1" />
        </g>
        <path d="M31 56q-9-8-5-19q11 4 13 16z" fill={p.head} />
        <path d="M33 55q-5-5-3-11q6 3 7 10z" fill={p.ear} />
        <path d="M89 56q9-8 5-19q-11 4-13 16z" fill={p.head} />
        <path d="M87 55q5-5 3-11q-6 3-7 10z" fill={p.ear} />
        <ellipse cx="60" cy="72" rx="27" ry="26" fill={p.head} />
        <path d="M50 88h20v10q0 9-10 9t-10-9z" fill={p.head} />
        <g
          style={
            gait === "idle"
              ? { animation: "eyeFlare 8s ease-in-out infinite" }
              : undefined
          }
        >
          <circle className="deer-eye" cx="47" cy="68" r="12.5" fill={eyeFill} />
          <circle className="deer-eye" cx="73" cy="68" r="12.5" fill={eyeFill} />
          <circle cx="47" cy="68" r="5" fill="#0f0904" />
          <circle cx="73" cy="68" r="5" fill="#0f0904" />
          {body === "ache" ? (
            <>
              <path
                d="M40 58 Q47 54 54 58"
                stroke="#0f0904"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M66 58 Q73 54 80 58"
                stroke="#0f0904"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </>
          ) : null}
        </g>
        <rect
          x="52"
          y="86"
          width="16"
          height="26"
          rx="8"
          fill={variant === "camp" ? "#080503" : "#0a0604"}
          stroke={p.muzzleStroke}
          strokeWidth="2"
        />
        <ellipse cx="60" cy="86" rx="7" ry="5" fill={p.nose} />
      </g>
    </svg>
  );
}
