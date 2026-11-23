"use client";

import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors", checked ? "bg-volt" : "bg-gray-700")}
    >
      <span className={cn("block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}
