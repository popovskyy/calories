"use client";

import { cn } from "@/lib/cn";

/** Золота монета з ассетів магазину. */
export function CoinIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mascots/coin.svg"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Діамант (друга валюта / преміум) — ассет готовий. */
export function GemIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mascots/gem.svg"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
