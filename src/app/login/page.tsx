import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <Suspense fallback={<div className="p-8 text-[var(--color-muted3)]">Завантаження…</div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
