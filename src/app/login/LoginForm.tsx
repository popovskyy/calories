"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { api } from "@/lib/api";

/** Лише відносні шляхи в межах сайту: `//evil.com` чи `https://…` — відкритий редирект. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { username, password });
      // Повне перезавантаження: проксі й серверні компоненти побачать нову cookie
      window.location.assign(safeNext(new URLSearchParams(window.location.search).get("next")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося увійти");
      setBusy(false);
    }
  };

  const field =
    "mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white placeholder-gray-500 focus:border-volt focus:outline-none";

  return (
    <form onSubmit={submit} className="w-full space-y-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-surface-2 text-volt shadow-[0_0_48px_rgba(43,144,254,0.35)]">
          <Zap className="h-8 w-8" strokeWidth={2.2} />
        </div>
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-wider text-white">Tactical Fit</h1>
        <p className="mt-1 text-sm text-gray-400">AI Домашній Тренер</p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-gray-300">Логін</span>
        <input className={field} autoComplete="username" autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-gray-300">Пароль</span>
        <input className={field} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-2xl btn-primary py-3.5 text-base font-bold transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "Входжу…" : "Увійти"}
      </button>
    </form>
  );
}
