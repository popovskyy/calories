import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "shimmer rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]",
        className,
      )}
    />
  );
}
