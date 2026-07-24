"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Field, inputClass } from "@/components/ui/Field";
import { useLogin, useRegister } from "@/hooks/useQueries";
import {
  GOAL_LABELS,
  MONTH_LABELS_UK,
  calcTargetCalories,
  type Goal,
  type Sex,
} from "@/lib/calories";
import { toPresetUrl } from "@/lib/avatar-presets";
import { cn } from "@/lib/cn";

type Mode = "login" | "register";

const currentYear = new Date().getFullYear();

const segmentBtn = (active: boolean) =>
  cn(
    "flex-1 rounded-[var(--radius-md)] px-3 py-2.5 text-[15px] font-semibold transition-colors",
    active
      ? "bg-[var(--color-accent)] text-[#f5f4ff]"
      : "bg-[var(--color-tile)] text-[var(--color-muted2)] hover:text-[var(--color-text)]",
  );

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
  return { base64: dataUrl.split(",")[1] ?? "", mime: "image/jpeg" };
}

export function AuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [mode, setMode] = useState<Mode>("login");
  const loginMut = useLogin();
  const registerMut = useRegister();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState(String(currentYear - 30));
  const [birthMonth, setBirthMonth] = useState("1");
  const [sex, setSex] = useState<Sex>("male");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("175");
  const [photo, setPhoto] = useState<{ base64: string; mime: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [avatarPreset, setAvatarPreset] = useState<string>(toPresetUrl("kiwi"));
  const [showPhoto, setShowPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (mode !== "register") return null;
    const by = parseInt(birthYear, 10);
    const bm = parseInt(birthMonth, 10);
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!by || !bm || !(w > 0) || !(h > 0)) return null;
    return calcTargetCalories({
      birthYear: by,
      birthMonth: bm,
      sex,
      weightKg: w,
      heightCm: h,
      goal,
    });
  }, [mode, birthYear, birthMonth, sex, weight, height, goal]);

  const busy = loginMut.isPending || registerMut.isPending;

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const { base64, mime } = await readImageAsJpegBase64(file);
      setPhoto({ base64, mime });
      setPhotoPreview(`data:${mime};base64,${base64}`);
    } catch {
      toast.error("Не вдалося прочитати фото");
    }
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMut.mutateAsync({
        username: username.trim(),
        password,
      });
      toast.success("Вхід виконано");
      router.replace(next);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка входу");
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return toast.error("Заповніть дані профілю");
    try {
      const saved = await registerMut.mutateAsync({
        username: username.trim(),
        password,
        name: name.trim(),
        birthYear: parseInt(birthYear, 10),
        birthMonth: parseInt(birthMonth, 10),
        sex,
        goal,
        weight: parseFloat(weight),
        height: parseFloat(height),
        avatarUrl: avatarPreset,
        imageBase64: photo?.base64,
        imageMimeType: photo?.mime,
      });
      if (saved.avatarWarning) {
        toast.warning(
          `Акаунт створено, але аватар з фото не намалювався. Обрано персонажа з бібліотеки.`,
          { duration: 6000 },
        );
      } else {
        toast.success("Акаунт створено");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка реєстрації");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-4 px-[18px] pb-6 pt-6">
      <div>
        <h1 className="text-[30px] font-semibold tracking-tight text-[var(--color-text)]">
          Калорії
        </h1>
        <p className="mt-1 text-[16px] text-[var(--color-muted2)]">
          Один акаунт — один персонаж у сесії
        </p>
      </div>

      <div className="flex gap-2">
        <button type="button" className={segmentBtn(mode === "login")} onClick={() => setMode("login")}>
          Вхід
        </button>
        <button
          type="button"
          className={segmentBtn(mode === "register")}
          onClick={() => setMode("register")}
        >
          Реєстрація
        </button>
      </div>

      {mode === "login" ? (
        <form onSubmit={submitLogin} className="flex flex-col gap-3.5">
          <Field label="Логін">
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="roman"
            />
          </Field>
          <Field label="Пароль">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••"
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block mt-1" disabled={busy}>
            {busy ? "Вхід…" : "Увійти"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitRegister} className="flex flex-col gap-3.5">
          <Field label="Логін">
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="roman"
            />
          </Field>
          <Field label="Пароль" hint="Мін. 6 символів">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Ім'я в додатку">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Роман"
            />
          </Field>

          <AvatarPicker
            value={photo ? null : avatarPreset}
            onChange={(url) => {
              setAvatarPreset(url);
              setPhoto(null);
              setPhotoPreview(null);
            }}
            freeOnly
          />

          <div className="rounded-[var(--radius-lg)] bg-[var(--color-tile)] px-3 py-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-[14px] font-medium text-[var(--color-muted2)]"
              onClick={() => setShowPhoto((v) => !v)}
            >
              <span>Або аватар з селфі (ШІ)</span>
              <span className="text-[var(--color-muted3)]">{showPhoto ? "▴" : "▾"}</span>
            </button>
            {showPhoto ? (
              <div className="mt-3 flex flex-col items-center gap-2">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt="Фото"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted3)]">
                    <Camera size={22} />
                  </div>
                )}
                <p className="text-center text-[13px] text-[var(--color-muted3)]">
                  Селфі → Gemini / GPT намалює маскота
                </p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={16} /> {photoPreview ? "Інше фото" : "Додати фото"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  hidden
                  onChange={onPhoto}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="lbl">Стать</span>
            <div className="flex gap-2">
              <button type="button" className={segmentBtn(sex === "male")} onClick={() => setSex("male")}>
                Чоловік
              </button>
              <button type="button" className={segmentBtn(sex === "female")} onClick={() => setSex("female")}>
                Жінка
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Field label="Рік народження">
              <input className={inputClass} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Місяць">
              <select className={inputClass} value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>
                {MONTH_LABELS_UK.map((label, i) => (
                  <option key={label} value={i + 1}>{label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex gap-3">
            <Field label="Вага, кг">
              <input className={inputClass} value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Зріст, см">
              <input className={inputClass} value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" />
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="lbl">Мета</span>
            <div className="flex gap-2">
              {(["maintain", "deficit"] as Goal[]).map((g) => (
                <button key={g} type="button" className={segmentBtn(goal === g)} onClick={() => setGoal(g)}>
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
          </div>

          {preview ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent-800)] bg-[var(--color-tile)] px-4 py-3">
              <div className="text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent-300)]">
                Ваша норма
              </div>
              <div className="mt-1 text-[26px] font-semibold tabular-nums">
                {preview.targetCalories.toLocaleString("uk-UA")}{" "}
                <span className="text-[15px] font-medium text-[var(--color-muted3)]">ккал/день</span>
              </div>
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary btn-block mt-1" disabled={busy || !preview}>
            {busy ? (
              <>
                <Sparkles size={16} className="animate-pulse" /> Створюємо…
              </>
            ) : (
              "Зареєструватись"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
