"use client";

import { PresetMascot } from "@/components/avatars/PresetMascot";
import { parsePresetId } from "@/lib/avatar-presets";
import { cn } from "@/lib/cn";

export function Avatar({
  name,
  avatarUrl,
  size = 32,
  className,
  animated = true,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  /** Idle-анімація для пресетів (вимкнути в дрібних списках) */
  animated?: boolean;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const presetId = parsePresetId(avatarUrl);

  if (presetId) {
    return (
      <PresetMascot
        id={presetId}
        size={size}
        animated={animated && size >= 40}
        className={className}
      />
    );
  }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className={cn(
          "shrink-0 rounded-[var(--radius-pill)] object-cover bg-[var(--color-tile)]",
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[var(--radius-pill)] font-semibold text-[#f5f4ff]",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        background: "linear-gradient(135deg,#5d5294,#968ae0)",
      }}
    >
      {initial}
    </div>
  );
}
