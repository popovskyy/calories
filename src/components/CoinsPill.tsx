"use client";

import Link from "next/link";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { useCurrentUser } from "@/hooks/useQueries";
import { cn } from "@/lib/cn";

/** Глобальний баланс монет — головний стимул, завжди на виду. */
const SIZES = {
  xs: { pad: "px-1.5 py-0.5", text: "text-[12px]", icon: 12 },
  sm: { pad: "px-2 py-1", text: "text-[13px]", icon: 14 },
  md: { pad: "px-2.5 py-1.5", text: "text-[14px]", icon: 22 },
  lg: { pad: "px-3 py-2", text: "text-[16px]", icon: 22 },
} as const;

export function CoinsPill({
  className,
  size = "md",
}: {
  className?: string;
  size?: keyof typeof SIZES;
}) {
  const { user } = useCurrentUser();
  const coins = user?.coins ?? 0;
  const { pad, text, icon } = SIZES[size];

  return (
    <Link
      href="/shop"
      title="Магазин"
      aria-label={`${coins} монет — магазин`}
      className={cn("coin-chip inline-flex items-center gap-1", pad, className)}
    >
      <CoinIcon size={icon} />
      <span className={cn("font-semibold tabular-nums", text)}>
        {coins.toLocaleString("uk-UA")}
      </span>
    </Link>
  );
}
