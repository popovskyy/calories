import { cn } from "@/lib/cn";

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <div
      className={cn("flex items-center justify-center rounded-[var(--radius-pill)] font-semibold text-[#f5f4ff]", className)}
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
