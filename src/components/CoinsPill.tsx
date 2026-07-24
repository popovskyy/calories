"use client";

import Link from "next/link";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { useCurrentUser } from "@/hooks/useQueries";
import { cn } from "@/lib/cn";

/** Глобальний баланс монет — головний стимул, завжди на виду. */
export function CoinsPill({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const { user } = useCurrentUser();
  const coins = user?.coins ?? 0;
  const pad = size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5";
  const text = size === "sm" ? "text-[13px]" : "text-[14px]";
  const icon = size === "sm" ? 14 : 16;

  return (
    <Link
      href="/shop"
      title="Магазин скінів"
      className={cn(
        "flex items-center gap-1 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,#FFC800_45%,transparent)] bg-[color-mix(in_srgb,#FFC800_12%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,#FFC800_20%,transparent)]",
        pad,
        className,
      )}
    >
      <CoinIcon size={icon} />
      <span className={cn("font-semibold tabular-nums text-[var(--color-text)]", text)}>
        {coins.toLocaleString("uk-UA")}
      </span>
    </Link>
  );
}
