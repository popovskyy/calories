"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { useGenerateAvatar, useSaveUser } from "@/hooks/useQueries";
import { useAppStore } from "@/store/useAppStore";
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  MONTH_LABELS_UK,
  calcTargetCalories,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "@/lib/calories";
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
  activityLevel: ActivityLevel;
  goal: Goal;
  weight: string;
  height: string;
}

const currentYear = new Date().getFullYear();

const empty: FormState = {
  name: "",
  birthYear: String(currentYear - 30),
  birthMonth: "1",
  sex: "male",
  activityLevel: "moderate",
  goal: "maintain",
  weight: "70",
  height: "175",
};

const segmentBtn = (active: boolean) =>
  cn(
    "flex-1 rounded-[var(--radius-md)] px-3 py-2.5 text-[13px] font-semibold transition-colors",
    active
      ? "bg-[var(--color-accent)] text-[#f5f4ff]"
      : "bg-[var(--color-tile)] text-[var(--color-muted2)] hover:text-[var(--color-text)]",
  );

/** Стискає фото на клієнті перед відправкою в Gemini (макс. 1024px JPEG). */
async function readImageAsJpegBase64(file: File): Promise<{ base64: string; mime: string }> {
  const bitmap = await createImageBitmap(file);
  const max = 1024;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступний");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
  const base64 = dataUrl.split(",")[1] ?? "";
  return { base64, mime: "image/jpeg" };
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const saveUser = useSaveUser();
  const generateAvatar = useGenerateAvatar();
  const geminiApiKey = useAppStore((s) => s.geminiApiKey);
  const [form, setForm] = useState<FormState>(empty);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      name: user.name,
      birthYear: String(user.birthYear),
      birthMonth: String(user.birthMonth),
      sex: user.sex,
      activityLevel: user.activityLevel,
      goal: user.goal,
      weight: String(user.weight),
      height: String(user.height),
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
      activityLevel: form.activityLevel,
      goal: form.goal,
    });
  }, [form]);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return toast.error("Оберіть зображення");
    }

    try {
      const { base64, mime } = await readImageAsJpegBase64(file);
      toast.message("Gemini малює аватар…", { duration: 4000 });
      const res = await generateAvatar.mutateAsync({
        imageBase64: base64,
        imageMimeType: mime,
        apiKey: geminiApiKey || undefined,
      });
      setAvatarUrl(res.avatarUrl);
      setAvatarDirty(true);
      toast.success("Аватар готовий");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося згенерувати аватар");
    }
  };

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
        activityLevel: form.activityLevel,
        goal: form.goal,
        weight,
        height,
        ...(avatarDirty ? { avatarUrl } : {}),
      });
      toast.success("Профіль оновлено");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося зберегти");
    }
  };

  const generating = generateAvatar.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Редагувати профіль"
      description={undefined}
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-tile)] px-4 py-4">
          <Avatar name={form.name || "?"} avatarUrl={avatarUrl} size={88} />
          <div className="text-center">
            <div className="text-[13px] font-semibold text-[var(--color-text)]">
              Мультяшний аватар
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--color-muted3)]">
              Завантажте селфі — Gemini намалює маскота
            </div>
          </div>
          <div className="flex w-full gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              disabled={generating}
              onClick={() => fileRef.current?.click()}
            >
              {generating ? (
                <>
                  <Sparkles size={16} className="animate-pulse" /> Малюємо…
                </>
              ) : (
                <>
                  <Camera size={16} /> {avatarUrl ? "Нове фото" : "Фото"}
                </>
              )}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={generating}
                aria-label="Прибрати аватар"
                onClick={() => {
                  setAvatarUrl(null);
                  setAvatarDirty(true);
                }}
              >
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={onPickPhoto}
          />
          {!avatarUrl ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-muted2)] px-3 py-3 text-[13px] text-[var(--color-muted2)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-300)]"
              disabled={generating}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} /> Завантажити фото
            </button>
          ) : null}
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

        <Field label="Фізична активність">
          <select
            className={inputClass}
            value={form.activityLevel}
            onChange={set("activityLevel")}
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((key) => (
              <option key={key} value={key}>
                {ACTIVITY_LABELS[key]}
              </option>
            ))}
          </select>
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
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent-300)]">
            Ваша норма
          </div>
          {preview ? (
            <>
              <div className="mt-1 text-[28px] font-semibold tabular-nums text-[var(--color-text)]">
                {preview.targetCalories.toLocaleString("uk-UA")}
                <span className="ml-1.5 text-[14px] font-medium text-[var(--color-muted3)]">
                  ккал/день
                </span>
              </div>
              <div className="mt-1 text-[12px] text-[var(--color-muted3)]">
                {preview.age} р · BMR {preview.bmr.toLocaleString("uk-UA")} · TDEE{" "}
                {preview.tdee.toLocaleString("uk-UA")}
                {form.goal === "deficit" ? " · −15%" : ""}
              </div>
            </>
          ) : (
            <div className="mt-1 text-[14px] text-[var(--color-muted3)]">
              Заповніть дані, щоб побачити норму
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block mt-1"
          disabled={saveUser.isPending || generating || !preview}
        >
          {saveUser.isPending ? "Збереження…" : "Зберегти зміни"}
        </button>
      </form>
    </Modal>
  );
}
