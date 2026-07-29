"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BUILTIN_MASCOT_IDS,
  getPreset,
  mascotAssetPath,
  parsePresetId,
  type SkinArtKind,
} from "@/lib/avatar-presets";
import { cn } from "@/lib/cn";

function Face({
  children,
  bg,
}: {
  children: React.ReactNode;
  bg: string;
}) {
  return (
    <svg viewBox="0 0 128 128" width="100%" height="100%" aria-hidden>
      <circle cx="64" cy="64" r="64" fill={bg} />
      {children}
    </svg>
  );
}

function Eyes({
  lx = 46,
  rx = 82,
  y = 58,
  r = 7,
  pupil = 3.2,
}: {
  lx?: number;
  rx?: number;
  y?: number;
  r?: number;
  pupil?: number;
}) {
  return (
    <>
      <circle cx={lx} cy={y} r={r} fill="#fff" />
      <circle cx={rx} cy={y} r={r} fill="#fff" />
      <circle cx={lx + 1.5} cy={y + 1} r={pupil} fill="#1a1a1a" />
      <circle cx={rx + 1.5} cy={y + 1} r={pupil} fill="#1a1a1a" />
    </>
  );
}

function Smile({ y = 78 }: { y?: number }) {
  return (
    <path
      d={`M48 ${y} Q64 ${y + 14} 80 ${y}`}
      fill="none"
      stroke="#1a1a1a"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  );
}

function MascotArt({ id }: { id: string }) {
  const preset = getPreset(id);
  if (!preset) {
    return (
      <Face bg="#888">
        <Eyes />
        <Smile />
      </Face>
    );
  }

  switch (id) {
    case "kiwi":
      return (
        <Face bg={preset.bg}>
          <ellipse cx="64" cy="72" rx="38" ry="34" fill="#4CAF00" />
          <ellipse cx="64" cy="68" rx="28" ry="26" fill="#7AD406" />
          <Eyes y={56} />
          <ellipse cx="64" cy="72" rx="8" ry="6" fill="#FF9600" />
          <Smile y={84} />
          {/* belly patch */}
          <ellipse cx="64" cy="98" rx="16" ry="10" fill="#E8F9C8" opacity="0.7" />
        </Face>
      );
    case "fox":
      return (
        <Face bg={preset.bg}>
          {/* ears */}
          <path d="M28 48 L40 18 L54 48 Z" fill="#FF7A00" />
          <path d="M100 48 L88 18 L74 48 Z" fill="#FF7A00" />
          <path d="M34 44 L40 26 L48 44 Z" fill="#FFE4C4" />
          <path d="M94 44 L88 26 L80 44 Z" fill="#FFE4C4" />
          <ellipse cx="64" cy="72" rx="36" ry="32" fill="#FF9600" />
          <ellipse cx="64" cy="78" rx="20" ry="16" fill="#FFE4C4" />
          <Eyes y={58} />
          <ellipse cx="64" cy="72" rx="6" ry="5" fill="#1a1a1a" />
          <Smile y={86} />
        </Face>
      );
    case "cat":
      return (
        <Face bg={preset.bg}>
          <path d="M30 52 L38 16 L56 48 Z" fill="#F5D0B0" />
          <path d="M98 52 L90 16 L72 48 Z" fill="#F5D0B0" />
          <path d="M36 46 L40 26 L50 46 Z" fill="#FFB6C8" />
          <path d="M92 46 L88 26 L78 46 Z" fill="#FFB6C8" />
          <ellipse cx="64" cy="72" rx="36" ry="32" fill="#F5D0B0" />
          <Eyes y={58} r={8} />
          <path d="M64 68 L58 76 L70 76 Z" fill="#FF86D0" />
          <Smile y={88} />
          <path d="M42 72 H28 M42 76 H26 M86 72 H100 M86 76 H102" stroke="#C9A07A" strokeWidth="2" strokeLinecap="round" />
        </Face>
      );
    case "bear":
      return (
        <Face bg={preset.bg}>
          <circle cx="32" cy="40" r="16" fill="#B8895A" />
          <circle cx="96" cy="40" r="16" fill="#B8895A" />
          <circle cx="32" cy="40" r="8" fill="#E8C4A0" />
          <circle cx="96" cy="40" r="8" fill="#E8C4A0" />
          <ellipse cx="64" cy="70" rx="38" ry="34" fill="#C9956A" />
          <ellipse cx="64" cy="78" rx="18" ry="14" fill="#E8C4A0" />
          <Eyes y={56} />
          <ellipse cx="64" cy="70" rx="7" ry="5" fill="#1a1a1a" />
          <Smile y={90} />
        </Face>
      );
    case "panda":
      return (
        <Face bg={preset.bg}>
          <circle cx="34" cy="38" r="14" fill="#1a1a1a" />
          <circle cx="94" cy="38" r="14" fill="#1a1a1a" />
          <ellipse cx="64" cy="70" rx="38" ry="34" fill="#F5F5F5" />
          <ellipse cx="44" cy="58" rx="14" ry="12" fill="#1a1a1a" />
          <ellipse cx="84" cy="58" rx="14" ry="12" fill="#1a1a1a" />
          <circle cx="46" cy="58" r={6} fill="#fff" />
          <circle cx="82" cy="58" r={6} fill="#fff" />
          <circle cx="47.5" cy="59" r={2.8} fill="#1a1a1a" />
          <circle cx="83.5" cy="59" r={2.8} fill="#1a1a1a" />
          <ellipse cx="64" cy="72" rx="6" ry="4.5" fill="#1a1a1a" />
          <Smile y={88} />
        </Face>
      );
    case "bunny":
      return (
        <Face bg={preset.bg}>
          <ellipse cx="42" cy="28" rx="12" ry="28" fill="#FFB6D9" />
          <ellipse cx="86" cy="28" rx="12" ry="28" fill="#FFB6D9" />
          <ellipse cx="42" cy="30" rx="5" ry="18" fill="#FF7AB8" />
          <ellipse cx="86" cy="30" rx="5" ry="18" fill="#FF7AB8" />
          <ellipse cx="64" cy="74" rx="36" ry="30" fill="#FFC8E4" />
          <Eyes y={62} />
          <ellipse cx="64" cy="74" rx="5" ry="4" fill="#FF5AA8" />
          <Smile y={88} />
        </Face>
      );
    case "frog":
      return (
        <Face bg={preset.bg}>
          <ellipse cx="64" cy="74" rx="40" ry="32" fill="#5BB000" />
          <circle cx="40" cy="48" r="16" fill="#6BC400" />
          <circle cx="88" cy="48" r="16" fill="#6BC400" />
          <circle cx="40" cy="48" r={8} fill="#fff" />
          <circle cx="88" cy="48" r={8} fill="#fff" />
          <circle cx="42" cy="49" r={3.5} fill="#1a1a1a" />
          <circle cx="90" cy="49" r={3.5} fill="#1a1a1a" />
          <ellipse cx="64" cy="78" rx="14" ry="8" fill="#FF9600" />
          <path d="M48 88 Q64 98 80 88" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
        </Face>
      );
    case "penguin":
      return (
        <Face bg={preset.bg}>
          <ellipse cx="64" cy="70" rx="36" ry="38" fill="#2B2B2B" />
          <ellipse cx="64" cy="78" rx="22" ry="26" fill="#F5F5F5" />
          <Eyes y={52} lx={48} rx={80} />
          <path d="M56 66 L64 76 L72 66 Z" fill="#FF9600" />
          <ellipse cx="28" cy="78" rx="10" ry="14" fill="#FF9600" transform="rotate(-20 28 78)" />
          <ellipse cx="100" cy="78" rx="10" ry="14" fill="#FF9600" transform="rotate(20 100 78)" />
        </Face>
      );
    case "chick":
      return (
        <Face bg={preset.bg}>
          <ellipse cx="64" cy="72" rx="36" ry="34" fill="#FFE566" />
          <path d="M64 18 L70 42 L58 42 Z" fill="#FF9600" />
          <Eyes y={58} />
          <path d="M56 74 L64 84 L72 74 Z" fill="#FF7A00" />
          <ellipse cx="36" cy="80" rx="10" ry="8" fill="#FFD040" />
          <ellipse cx="92" cy="80" rx="10" ry="8" fill="#FFD040" />
        </Face>
      );
    case "raccoon":
      return (
        <Face bg={preset.bg}>
          <circle cx="34" cy="40" r="14" fill="#8A8A8A" />
          <circle cx="94" cy="40" r="14" fill="#8A8A8A" />
          <ellipse cx="64" cy="70" rx="38" ry="34" fill="#C8C8C8" />
          <ellipse cx="44" cy="60" rx="16" ry="12" fill="#3A3A3A" />
          <ellipse cx="84" cy="60" rx="16" ry="12" fill="#3A3A3A" />
          <circle cx="46" cy="60" r={6} fill="#fff" />
          <circle cx="82" cy="60" r={6} fill="#fff" />
          <circle cx="47.5" cy={61} r={2.8} fill="#1a1a1a" />
          <circle cx="83.5" cy={61} r={2.8} fill="#1a1a1a" />
          <ellipse cx="64" cy="74" rx="8" ry="6" fill="#E8E8E8" />
          <ellipse cx="64" cy="74" rx="4" ry="3" fill="#1a1a1a" />
          <Smile y={90} />
        </Face>
      );
    case "pepa_pig":
      return (
        <Face bg={preset.bg}>
          {/* ears */}
          <path d="M36 50 L44 24 L62 42 Z" fill="#FFB6D9" />
          <path d="M92 50 L84 24 L66 42 Z" fill="#FFB6D9" />
          {/* head/body */}
          <ellipse cx="64" cy="74" rx="36" ry="32" fill="#FF86D0" />
          {/* cheek/snout highlight */}
          <ellipse cx="64" cy="82" rx="20" ry="16" fill="#FFD1E8" />
          {/* snout */}
          <ellipse cx="64" cy="92" rx="14" ry="10" fill="#FFB6D9" />
          <ellipse cx="64" cy="94" rx="7" ry="5" fill="#FF5AA8" />
          {/* eyes + smile */}
          <Eyes y={60} r={7} pupil={3.2} />
          <Smile y={98} />
        </Face>
      );
    // --- Ассети / інлайн: рендеряться з img ---
    default:
      return null;
  }
}

/**
 * Візуал стадій еволюції.
 *
 * Свідомо без нового арту: стадія — це шар світіння й контуру поверх наявного
 * малюнка. Так будь-який скін, зокрема доданий адміном, отримує всі чотири
 * стадії безкоштовно.
 */
const STAGE_GLOW: Record<number, string | undefined> = {
  1: undefined,
  2: "0 0 10px rgba(88,204,2,0.45)",
  3: "0 0 16px rgba(28,176,246,0.55)",
  4: "0 0 22px rgba(255,200,0,0.75)",
};

const STAGE_RING: Record<number, string | undefined> = {
  1: undefined,
  2: "1.5px solid rgba(88,204,2,0.7)",
  3: "2px solid rgba(28,176,246,0.85)",
  4: "2.5px solid #FFC800",
};

/** Рамки — окрема від еволюції косметика; кольори з lib/cosmetics.ts. */
const FRAME_RING: Record<string, string> = {
  silver: "2.5px solid #cfcfcf",
  gold: "2.5px solid #FFD700",
  traveler: "2.5px solid #4DABF7",
  golden_sight: "2.5px solid #FF4B4B",
};

/**
 * «Епічна» рамка — єдина анімована, тому й найдорожча.
 *
 * outline статичним кольором тут не обійтись: кільце малюється окремим шаром
 * із conic-gradient, який обертається. Маска лишає видимим тільки обід,
 * інакше градієнт залив би весь аватар.
 */
function EpicRing({ reduce }: { reduce: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        inset: -3,
        padding: 3,
        background:
          "conic-gradient(from 0deg, #b5abfc, #1CB0F6, #FF86D0, #FFC800, #b5abfc)",
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
      animate={reduce ? undefined : { rotate: 360 }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
    />
  );
}

/** Неонова рамка — пульсуюче ціано-маджентове світіння. */
function NeonRing({ reduce }: { reduce: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        inset: -4,
        padding: 2.5,
        background:
          "conic-gradient(from 90deg, #00F0FF, #7B61FF, #FF2BD6, #00F0FF)",
        boxShadow:
          "0 0 10px rgba(0,240,255,0.85), 0 0 22px rgba(255,43,214,0.55)",
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
      animate={
        reduce
          ? undefined
          : { opacity: [0.75, 1, 0.75], rotate: 360 }
      }
      transition={{
        opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 6, repeat: Infinity, ease: "linear" },
      }}
    />
  );
}

/** Анімований маскот з idle-підстрибуванням (Duolingo-відчуття). */
export function PresetMascot({
  id,
  size = 64,
  animated = true,
  className,
  artKind,
  nameUk,
  bg,
  stage = 1,
  frame,
}: {
  id: string;
  size?: number;
  animated?: boolean;
  className?: string;
  artKind?: SkinArtKind;
  nameUk?: string;
  bg?: string;
  /** Стадія еволюції 1–4 — аура й контур. */
  stage?: number;
  /** Куплена рамка аватара. Має пріоритет над контуром стадії. */
  frame?: string | null;
}) {
  const reduce = useReducedMotion();
  const preset = getPreset(id);
  const kind: SkinArtKind =
    artKind ?? (BUILTIN_MASCOT_IDS.has(id) ? "builtin" : "file");
  const idle = animated && !reduce;
  const asset = mascotAssetPath(id, kind);
  const label = nameUk ?? preset?.nameUk ?? id;

  const ring = (frame ? FRAME_RING[frame] : undefined) ?? STAGE_RING[stage];
  const glow = STAGE_GLOW[stage];

  return (
    <motion.div
      className={cn(
        "relative shrink-0 rounded-full",
        // overflow-hidden обрізав би кільце «Епічної»/«Неон», яке виступає за межі
        frame === "epic" || frame === "neon" ? undefined : "overflow-hidden",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: !asset ? bg ?? preset?.bg : undefined,
        outline: ring,
        outlineOffset: ring ? 1 : undefined,
        boxShadow: glow,
      }}
      animate={idle ? { y: [0, -3, 0] } : undefined}
      transition={
        idle
          ? {
              duration: 2.6,
              repeat: Infinity,
              ease: [0.45, 0, 0.55, 1],
            }
          : undefined
      }
    >
      {asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset}
          alt={label}
          width={size}
          height={size}
          draggable={false}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <MascotArt id={id} />
      )}

      {frame === "epic" ? <EpicRing reduce={!!reduce} /> : null}
      {frame === "neon" ? <NeonRing reduce={!!reduce} /> : null}

      {/* Легенда мерехтить — саме це й помічають друзі в арені */}
      {stage >= 4 && idle ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 120%, rgba(255,200,0,0.45), transparent 62%)",
          }}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </motion.div>
  );
}

export function PresetMascotByUrl({
  avatarUrl,
  size,
  animated,
  className,
}: {
  avatarUrl: string;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const id = parsePresetId(avatarUrl);
  if (!id) return null;
  return (
    <PresetMascot id={id} size={size} animated={animated} className={className} />
  );
}
