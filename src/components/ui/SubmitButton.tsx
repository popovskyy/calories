"use client";

import { cn } from "@/lib/cn";

/**
 * Кнопка збереження з явним станом завантаження.
 * Під час запиту: спінер + текст процесу + aria-busy, щоб і скрінрідер
 * знав, що дія триває, а не «нічого не сталося».
 */
export function SubmitButton({
  loading,
  children,
  loadingText = "Збереження…",
  icon,
  className,
  ...rest
}: React.ComponentProps<"button"> & {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      {...rest}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      className={cn("btn btn-primary btn-block", className)}
    >
      {loading ? <span className="spinner" aria-hidden /> : icon}
      {loading ? loadingText : children}
    </button>
  );
}
