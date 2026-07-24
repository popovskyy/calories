import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div
      className="no-scrollbar fixed inset-0 overflow-y-auto bg-[var(--color-bg)]"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
    >
      <Suspense fallback={<div className="p-8 text-[var(--color-muted3)]">Завантаження…</div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
