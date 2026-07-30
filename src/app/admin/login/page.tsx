"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Помилка входу");
      toast.success("Адмін-сесія активна");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-4 px-5 py-10 pb-24">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-text)]">
            Адмінка
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-muted3)]">
            Керування користувачами БД
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Логін">
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Field>
          <Field label="Пароль">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </Field>
          <SubmitButton loading={busy} loadingText="Вхід…">
            Увійти
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
