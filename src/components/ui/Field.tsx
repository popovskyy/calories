import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="lbl">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-[var(--color-muted3)]">{hint}</span> : null}
    </label>
  );
}

export const inputClass = cn(
  "w-full rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-tile)]",
  "px-3 py-2.5 text-[15px] text-[var(--color-text)] outline-none",
  "placeholder:text-[var(--color-muted3)]",
  "focus:border-[var(--color-accent-500)] transition-colors",
);
