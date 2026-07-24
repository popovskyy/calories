import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div
      className="min-h-dvh overflow-y-auto overscroll-contain bg-[var(--color-bg)]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <Suspense fallback={<div className="p-8 text-[var(--color-muted3)]">Завантаження…</div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
