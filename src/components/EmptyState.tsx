import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-muted2)]">
        <Icon size={26} strokeWidth={1.7} />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-[var(--color-text)]">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted3)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
