"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Modal } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { useSaveUser } from "@/hooks/useQueries";
import {
  GOAL_LABELS,
  MONTH_LABELS_UK,
  calcTargetCalories,
  type Goal,
  type Sex,
} from "@/lib/calories";
import { isPresetAvatar, toPresetUrl } from "@/lib/avatar-presets";
import type { UserDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDTO | null;
}

interface FormState {
  name: string;
  birthYear: string;
  birthMonth: string;
  sex: Sex;
  goal: Goal;
  weight: string;
  height: string;
  targetWeight: string;
}

const currentYear = new Date().getFullYear();

const empty: FormState = {
  name: "",
  birthYear: String(currentYear - 30),
  birthMonth: "1",
  sex: "male",
  goal: "maintain",
  weight: "70",
  height: "175",
  targetWeight: "",
};

const segmentBtn = (active: boolean) =>
  cn(
    "flex-1 rounded-[var(--radius-md)] px-3 py-2.5 text-[15px] font-semibold transition-colors",
    active
      ? "bg-[var(--color-accent)] text-[#f5f4ff]"
      : "bg-[var(--color-tile)] text-[var(--color-muted2)] hover:text-[var(--color-text)]",
  );

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const saveUser = useSaveUser();
  const [form, setForm] = useState<FormState>(empty);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const punishmentActive =
    user?.punishmentActive === true || user?.avatarUrl === toPresetUrl("pepa_pig");

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      name: user.name,
      birthYear: String(user.birthYear),
      birthMonth: String(user.birthMonth),
      sex: user.sex,
      goal: user.goal,
      weight: String(user.weight),
      height: String(user.height),
      targetWeight: user.targetWeight != null ? String(user.targetWeight) : "",
    });
    setAvatarUrl(user.avatarUrl ?? null);
    setAvatarDirty(false);
  }, [open, user]);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const preview = useMemo(() => {
    const birthYear = parseInt(form.birthYear, 10);
    const birthMonth = parseInt(form.birthMonth, 10);
    const weight = parseFloat(form.weight);
    const height = parseFloat(form.height);
    if (
      !birthYear ||
      birthYear < 1920 ||
      birthYear > currentYear ||
      !birthMonth ||
      birthMonth < 1 ||
      birthMonth > 12 ||
      !(weight > 0) ||
      !(height > 0)
    ) {
      return null;
    }
    return calcTargetCalories({
      birthYear,
      birthMonth,
      sex: form.sex,
      weightKg: weight,
      heightCm: height,
      goal: form.goal,
    });
  }, [form]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const birthYear = parseInt(form.birthYear, 10);
    const birthMonth = parseInt(form.birthMonth, 10);
    const weight = parseFloat(form.weight);
    const height = parseFloat(form.height);

    if (!name) return toast.error("Введіть ім'я профілю");
    if (!birthYear || birthYear < 1920 || birthYear > currentYear)
      return toast.error("Вкажіть коректний рік народження");
    if (!birthMonth || birthMonth < 1 || birthMonth > 12)
      return toast.error("Вкажіть місяць народження");
    if (!(weight > 0)) return toast.error("Вкажіть вагу");
    if (!(height > 0)) return toast.error("Вкажіть зріст");

    try {
      await saveUser.mutateAsync({
        name,
        birthYear,
        birthMonth,
        sex: form.sex,
        goal: form.goal,
        weight,
        height,
        ...(avatarDirty ? { avatarUrl } : {}),
        targetWeight: form.targetWeight ? parseFloat(form.targetWeight) : null,
      });
      toast.success("Профіль оновлено");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося зберегти");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Редагувати профіль"
      description={undefined}
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="flex flex-col items-center gap-3">
          <Avatar name={form.name || "?"} avatarUrl={avatarUrl} size={88} />
          <AvatarPicker
            value={isPresetAvatar(avatarUrl) ? avatarUrl : null}
            onChange={(url) => {
              setAvatarUrl(url);
              setAvatarDirty(true);
            }}
            ownedIds={user?.ownedSkinIds ?? []}
            disabled={punishmentActive}
          />
        </div>

        <Field label="Ім'я">
          <input
            className={inputClass}
            value={form.name}
            onChange={set("name")}
            placeholder="Напр. Олег"
            autoFocus
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="lbl">Стать</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={segmentBtn(form.sex === "male")}
              onClick={() => setForm((f) => ({ ...f, sex: "male" }))}
            >
              Чоловік
            </button>
            <button
              type="button"
              className={segmentBtn(form.sex === "female")}
              onClick={() => setForm((f) => ({ ...f, sex: "female" }))}
            >
              Жінка
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <Field label="Рік народження">
            <input
              className={inputClass}
              value={form.birthYear}
              onChange={set("birthYear")}
              inputMode="numeric"
              placeholder="1992"
            />
          </Field>
          <Field label="Місяць">
            <select
              className={inputClass}
              value={form.birthMonth}
              onChange={set("birthMonth")}
            >
              {MONTH_LABELS_UK.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-3">
          <Field label="Вага, кг">
            <input
              className={inputClass}
              value={form.weight}
              onChange={set("weight")}
              inputMode="decimal"
            />
          </Field>
          <Field label="Зріст, см">
            <input
              className={inputClass}
              value={form.height}
              onChange={set("height")}
              inputMode="decimal"
            />
          </Field>
        </div>

        <Field label="Ціль, кг" hint="Порожньо — ціль не відстежується">
          <input
            className={inputClass}
            value={form.targetWeight}
            onChange={set("targetWeight")}
            inputMode="decimal"
            placeholder="Напр. 70"
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="lbl">Мета</span>
          <div className="flex gap-2">
            {(["maintain", "deficit"] as Goal[]).map((g) => (
              <button
                key={g}
                type="button"
                className={segmentBtn(form.goal === g)}
                onClick={() => setForm((f) => ({ ...f, goal: g }))}
              >
                {GOAL_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent-800)] bg-[var(--color-tile)] px-4 py-3.5">
          <div className="text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent-300)]">
            Ваша норма
          </div>
          {preview ? (
            <>
              <div className="mt-1 text-[30px] font-semibold tabular-nums text-[var(--color-text)]">
                {preview.targetCalories.toLocaleString("uk-UA")}
                <span className="ml-1.5 text-[16px] font-medium text-[var(--color-muted3)]">
                  ккал/день
                </span>
              </div>
              <div className="mt-1 text-[14px] text-[var(--color-muted3)]">
                {preview.age} р · BMR {preview.bmr.toLocaleString("uk-UA")} · TDEE{" "}
                {preview.tdee.toLocaleString("uk-UA")}
                {form.goal === "deficit" ? " · −15%" : ""}
              </div>
            </>
          ) : (
            <div className="mt-1 text-[16px] text-[var(--color-muted3)]">
              Заповніть дані, щоб побачити норму
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block mt-1"
          disabled={saveUser.isPending || !preview}
        >
          {saveUser.isPending ? "Збереження…" : "Зберегти зміни"}
        </button>
      </form>
    </Modal>
  );
}
