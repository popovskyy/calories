"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { LEVEL_HINT, LEVEL_LABEL, type AthleteLevel, type ProfileDTO } from "@/lib/types";
import { useProfile, useSaveProfile } from "@/hooks/queries";

const field =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white placeholder-gray-500 focus:border-volt focus:outline-none";
const label = "text-sm font-medium text-gray-300";

export function ProfileScreen() {
  const profile = useProfile();
  return (
    <section className="animate-day-enter space-y-4">
      <div>
        <span className="text-sm font-semibold text-volt">Налаштування</span>
        <h1 className="font-display mt-0.5 text-3xl leading-tight font-semibold tracking-wide text-white">Профіль атлета</h1>
        <p className="mt-0.5 text-sm text-gray-400">Ці дані AI-тренер використовує при кожній генерації плану</p>
      </div>

      {profile.isPending ? (
        <div className="space-y-3">
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
        </div>
      ) : profile.isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-base text-red-200">
          Не вдалося завантажити профіль: {profile.error.message}
          <button onClick={() => profile.refetch()} className="mt-2 block font-semibold underline">
            Спробувати ще
          </button>
        </div>
      ) : (
        <ProfileForm initial={profile.data} />
      )}

      <LogoutButton />
    </section>
  );
}

/** Рядкові поля для чисел — щоб можна було стерти значення під час набору. */
function ProfileForm({ initial }: { initial: ProfileDTO }) {
  const save = useSaveProfile();
  const [name, setName] = useState(initial.name);
  const [sex, setSex] = useState(initial.sex);
  const [age, setAge] = useState(String(initial.age));
  const [height, setHeight] = useState(String(initial.heightCm));
  const [weight, setWeight] = useState(String(initial.weightKg));
  const [goal, setGoal] = useState(initial.goal);
  const [limitations, setLimitations] = useState(initial.limitations);
  const [level, setLevel] = useState<AthleteLevel>(initial.level);
  const [routine, setRoutine] = useState(initial.routine);

  const num = (s: string) => Number(s.replace(",", "."));
  const draft: ProfileDTO = {
    name: name.trim(),
    sex,
    age: Math.round(num(age)),
    heightCm: Math.round(num(height)),
    weightKg: Math.round(num(weight) * 10) / 10,
    goal: goal.trim(),
    limitations: limitations.trim(),
    level,
    routine: routine.trim(),
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const valid =
    draft.name.length > 0 &&
    Number.isFinite(draft.age) && draft.age >= 14 && draft.age <= 90 &&
    Number.isFinite(draft.heightCm) && draft.heightCm >= 120 && draft.heightCm <= 230 &&
    Number.isFinite(draft.weightKg) && draft.weightKg >= 35 && draft.weightKg <= 250 &&
    draft.goal.length >= 3;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty && valid) save.mutate(draft);
      }}
      className="space-y-3.5 rounded-2xl border border-white/[0.08] bg-surface p-4"
    >
      <label className="block">
        <span className={label}>Ім’я</span>
        <input className={field} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </label>

      <div>
        <span className={label}>Стать</span>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {(["male", "female"] as const).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSex(s)}
              className={cn(
                "rounded-xl border py-2.5 text-sm font-semibold transition",
                sex === s ? "border-volt/50 bg-volt/15 text-volt" : "border-white/10 text-gray-400",
              )}
            >
              {s === "male" ? "Чоловік" : "Жінка"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <label className="block">
          <span className={label}>Вік</span>
          <input className={cn(field, "tabular-nums")} inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
        <label className="block">
          <span className={label}>Зріст, см</span>
          <input className={cn(field, "tabular-nums")} inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <label className="block">
          <span className={label}>Вага, кг</span>
          <input className={cn(field, "tabular-nums")} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
      </div>

      <div>
        <span className={label}>Рівень підготовки</span>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Рівень підготовки">
          {(["beginner", "intermediate", "advanced"] as const).map((l) => (
            <button
              type="button"
              key={l}
              role="radio"
              aria-checked={level === l}
              onClick={() => setLevel(l)}
              className={cn(
                "min-h-11 rounded-xl border px-1 py-2.5 text-sm font-semibold transition",
                level === l ? "border-volt/50 bg-volt/15 text-volt" : "border-white/10 text-gray-400",
              )}
            >
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-400">{LEVEL_HINT[level]}</p>
      </div>

      <label className="block">
        <span className={label}>Що я вже роблю сам</span>
        <textarea
          className={cn(field, "resize-none")}
          rows={3}
          maxLength={400}
          value={routine}
          placeholder="Напр.: щодня 45 хв велотренажер; підтягування й віджимання на турніку"
          onChange={(e) => setRoutine(e.target.value)}
        />
        <span className="mt-1 block text-sm text-gray-400">Тренер не дублюватиме це, а враховуватиме втому й доповнюватиме.</span>
      </label>

      <label className="block">
        <span className={label}>Ціль</span>
        <textarea className={cn(field, "resize-none")} rows={3} maxLength={300} value={goal} onChange={(e) => setGoal(e.target.value)} />
      </label>

      <label className="block">
        <span className={label}>Обмеження / здоров’я</span>
        <textarea
          className={cn(field, "resize-none")}
          rows={3}
          maxLength={400}
          value={limitations}
          placeholder="Напр.: болить коліно, уникати стрибків"
          onChange={(e) => setLimitations(e.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={!dirty || !valid || save.isPending}
        className="w-full rounded-2xl btn-primary py-3.5 text-base font-bold transition active:scale-[0.98] disabled:bg-surface-2 disabled:text-gray-400"
      >
        {save.isPending ? "Зберігаю…" : dirty ? "Зберегти зміни" : "Збережено"}
      </button>
      {dirty && !valid && <p className="text-center text-xs text-orange-300">Перевірте поля: вік 14–90, зріст 120–230, вага 35–250</p>}
    </form>
  );
}

function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.post("/api/auth/logout");
          window.location.assign("/login");
        } catch {
          setBusy(false);
          toast.error("Не вдалося вийти");
        }
      }}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-base font-medium text-gray-400 transition hover:text-white active:scale-[0.98] disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      Вийти
    </button>
  );
}
