"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AdminEditor } from "@/components/admin/AdminEditor";
import { PresetMascot } from "@/components/avatars/PresetMascot";
import { Field, inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AvatarPreset, Rarity, SkinArtKind, SkinTier } from "@/lib/avatar-presets";
import { RARITY } from "@/lib/avatar-presets";
import { cn } from "@/lib/cn";

type SkinRow = AvatarPreset & { enabled?: boolean };

function InlineSvgPreview({
  svg,
  size,
  bg,
  label,
}: {
  svg: string;
  size: number;
  bg?: string;
  label?: string;
}) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <div
      className="relative overflow-hidden rounded-full"
      style={{ width: size, height: size, background: bg ?? "transparent" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label ?? "svg"}
        width={size}
        height={size}
        draggable={false}
        className="h-full w-full rounded-full object-contain"
      />
    </div>
  );
}

function SkinAvatar({ s, size }: { s: SkinRow; size: number }) {
  if (s.artKind === "inline" && s.svg?.trim()) {
    return <InlineSvgPreview svg={s.svg} size={size} bg={s.bg} label={s.nameUk} />;
  }
  return (
    <PresetMascot
      id={s.id}
      size={size}
      animated={false}
      artKind={s.artKind}
      nameUk={s.nameUk}
      bg={s.bg}
    />
  );
}

const emptyNew = (): Partial<SkinRow> & { id: string } => ({
  id: "",
  nameUk: "",
  tier: "premium",
  price: 400,
  rarity: "legendary",
  bg: "#333333",
  artKind: "inline",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <circle cx="128" cy="128" r="120" fill="#333"/>
  <circle cx="128" cy="120" r="48" fill="#f0c29a"/>
  <circle cx="110" cy="112" r="6" fill="#1a1a1a"/>
  <circle cx="146" cy="112" r="6" fill="#1a1a1a"/>
  <path d="M110 140 q18 14 36 0" fill="none" stroke="#8a4e32" stroke-width="3"/>
</svg>`,
  enabled: true,
  sortOrder: 500,
});

const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

export function AdminSkinsPanel() {
  const [skins, setSkins] = useState<SkinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SkinRow | null>(null);
  const [draft, setDraft] = useState<Partial<SkinRow>>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/skins");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setSkins(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (s: SkinRow) => {
    setCreating(false);
    setSelected(s);
    setDraft({ ...s });
  };

  const startCreate = () => {
    setCreating(true);
    setSelected(null);
    setDraft(emptyNew());
  };

  const closeForm = () => {
    setCreating(false);
    setSelected(null);
    setDraft({});
  };

  const onSvgFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    if (!text.includes("<svg")) {
      toast.error("Обери SVG-файл");
      return;
    }
    setDraft((d) => ({
      ...d,
      artKind: "inline",
      svg: text,
      id: d.id || file.name.replace(/\.svg$/i, "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32),
    }));
    toast.success("SVG завантажено");
  };

  const save = async () => {
    setSaving(true);
    try {
      const tier = (draft.tier as SkinTier) ?? "premium";
      const price = tier === "free" ? 0 : (draft.price ?? 0);
      if (creating) {
        if (!draft.id?.trim() || !draft.nameUk?.trim()) {
          throw new Error("Потрібні id і назва");
        }
        const res = await fetch("/api/admin/skins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: draft.id.trim(),
            nameUk: draft.nameUk.trim(),
            tier,
            price,
            rarity: draft.rarity ?? "epic",
            bg: draft.bg || "#333333",
            enabled: draft.enabled ?? true,
            sortOrder: draft.sortOrder ?? 500,
            artKind: draft.artKind ?? "inline",
            svg: (draft.artKind ?? "inline") === "inline" ? draft.svg : null,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Помилка");
        toast.success("Скін створено");
        setCreating(false);
        setSelected(body);
        setDraft(body);
      } else if (selected) {
        const res = await fetch(`/api/admin/skins/${encodeURIComponent(selected.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nameUk: draft.nameUk,
            tier,
            price,
            rarity: draft.rarity,
            bg: draft.bg,
            enabled: draft.enabled,
            sortOrder: draft.sortOrder,
            artKind: draft.artKind,
            svg: draft.svg,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Помилка");
        toast.success("Збережено");
        setSelected(body);
        setDraft(body);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Вимкнути скін у магазині?")) return;
    try {
      const res = await fetch(`/api/admin/skins/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Помилка");
      toast.success("Вимкнено");
      if (selected?.id === id) {
        setSelected(body);
        setDraft(body);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    }
  };

  const punishmentSkin = skins.find((s) => s.id === "pepa_pig") ?? null;
  const catalogSkins = skins.filter((s) => s.id !== "pepa_pig");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* ── Покарання: компактний банер ── */}
        <button
          type="button"
          onClick={() => punishmentSkin && open(punishmentSkin)}
          className={cn(
            "mcard flex items-center gap-4 p-4 text-left transition-colors",
            punishmentSkin && "hover:bg-[var(--color-tile)]",
            selected?.id === "pepa_pig" && "ring-2 ring-[var(--color-accent)]",
          )}
        >
          <div className="shrink-0">
            {loading ? (
              <Skeleton className="h-14 w-14 rounded-full" />
            ) : punishmentSkin ? (
              <SkinAvatar s={punishmentSkin} size={56} />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-tile)] text-[24px]">
                🐷
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-red)]">
                Скін покарання
              </span>
              {punishmentSkin?.enabled === false ? (
                <span className="rounded-[4px] bg-[color-mix(in_srgb,var(--color-red)_16%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-red)]">
                  прихований
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 truncate text-[15px] font-semibold">
              {punishmentSkin?.nameUk ?? "Свинка Пепа"}
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--color-muted3)]">
              Автоматично вдягається при переборі калорій. Не доступний у магазині.
            </div>
          </div>
          <span className="shrink-0 text-[12px] text-[var(--color-muted3)]">Редагувати →</span>
        </button>

        {/* ── Каталог скінів ── */}
        <div className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-divider)] px-4 py-3">
            <span className="text-[13px] text-[var(--color-muted3)]">
              {catalogSkins.length} скінів · обери для редагування
            </span>
            <button type="button" className="btn btn-primary btn-sm" onClick={startCreate}>
              <Plus size={15} /> Новий скін
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[14px]">
              <thead className="sticky top-0 bg-[var(--color-surface)] text-[11px] uppercase tracking-wider text-[var(--color-muted3)]">
                <tr>
                  <th className="px-4 py-2.5">Скін</th>
                  <th className="px-4 py-2.5 text-right">Ціна</th>
                  <th className="px-4 py-2.5">Рідкість</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-divider)]">
                {loading
                  ? [0, 1, 2].map((i) => (
                      <tr key={i}>
                        <td colSpan={4} className="p-3">
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  : catalogSkins.map((s) => {
                      const isSelected = selected?.id === s.id;
                      const disabled = s.enabled === false;
                      return (
                        <tr
                          key={s.id}
                          className={cn(
                            "transition-colors",
                            isSelected
                              ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                              : "hover:bg-[var(--color-tile)]",
                            disabled && "opacity-50",
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              className="flex items-center gap-3 text-left"
                              onClick={() => open(s)}
                            >
                              <SkinAvatar s={s} size={36} />
                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5">
                                  <span className="truncate font-semibold">{s.nameUk}</span>
                                  {disabled ? (
                                    <span className="shrink-0 rounded-[4px] bg-[color-mix(in_srgb,var(--color-red)_16%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-red)]">
                                      OFF
                                    </span>
                                  ) : null}
                                </span>
                                <span className="flex items-center gap-1 truncate text-[12px] text-[var(--color-muted3)]">
                                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--color-divider)]" style={{ background: s.bg }} />
                                  {s.id}{s.tier === "free" ? " · free" : ""}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                            {s.price > 0 ? s.price : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-block rounded-[4px] px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                color: RARITY[s.rarity].color,
                                background: `color-mix(in srgb, ${RARITY[s.rarity].color} 12%, transparent)`,
                              }}
                            >
                              {RARITY[s.rarity].label}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              className="icon-btn text-[var(--color-muted3)] hover:text-[var(--color-red)]"
                              onClick={() => void remove(s.id)}
                              aria-label={`Вимкнути ${s.nameUk}`}
                              title="Вимкнути"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Редактор збоку ── */}
      <AdminEditor
        open={creating || selected ? (selected?.id ?? "new") : null}
        title={creating ? "Новий скін" : selected ? "Редагування скіна" : undefined}
        onClose={creating || selected ? closeForm : undefined}
      >
        {!creating && !selected ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-[var(--color-muted3)]">
              Обери скін зі списку або створи новий.
            </p>
            <button type="button" className="btn btn-primary btn-block" onClick={startCreate}>
              <Plus size={16} /> Додати новий скін
            </button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {draft.id ? (
              <div className="flex justify-center">
                {draft.artKind === "inline" && draft.svg?.trim() ? (
                  <InlineSvgPreview
                    svg={draft.svg}
                    size={72}
                    bg={draft.bg}
                    label={draft.nameUk ?? draft.id}
                  />
                ) : (
                  <PresetMascot
                    id={draft.id}
                    size={72}
                    animated
                    artKind={(draft.artKind as SkinArtKind) ?? "inline"}
                    nameUk={draft.nameUk}
                    bg={draft.bg}
                  />
                )}
              </div>
            ) : null}

            <Field label="ID (slug, латиниця)">
              <input
                className={inputClass}
                value={draft.id ?? ""}
                disabled={!creating}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  }))
                }
                placeholder="my_skin"
                required={creating}
              />
            </Field>
            <Field label="Назва в магазині">
              <input
                className={inputClass}
                value={draft.nameUk ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, nameUk: e.target.value }))}
                required
              />
            </Field>

            <Field label="Ціна (монети)">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={draft.tier === "free" ? 0 : (draft.price ?? 0)}
                disabled={draft.tier === "free"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, price: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </Field>

            <div>
              <div className="mb-1.5 text-[13px] text-[var(--color-muted3)]">Рідкість</div>
              <div className="grid grid-cols-2 gap-1.5">
                {RARITY_ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={cn(
                      "rounded-[var(--radius-md)] border px-2 py-2 text-[13px] font-semibold",
                      draft.rarity === k
                        ? "border-transparent text-[var(--color-bg)]"
                        : "border-[var(--color-divider)] text-[var(--color-text)]",
                    )}
                    style={
                      draft.rarity === k
                        ? { background: RARITY[k].color, boxShadow: `0 0 12px ${RARITY[k].glow}` }
                        : undefined
                    }
                    onClick={() => setDraft((d) => ({ ...d, rarity: k }))}
                  >
                    {RARITY[k].label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Тир">
              <select
                className={inputClass}
                value={draft.tier ?? "premium"}
                onChange={(e) => {
                  const tier = e.target.value as SkinTier;
                  setDraft((d) => ({
                    ...d,
                    tier,
                    price: tier === "free" ? 0 : d.price || 300,
                  }));
                }}
              >
                <option value="premium">premium (купівля)</option>
                <option value="free">free (безкоштовно всім)</option>
              </select>
            </Field>

            <Field label="Порядок у списку">
              <input
                className={inputClass}
                type="number"
                value={draft.sortOrder ?? 0}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sortOrder: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </Field>

            <Field label="Колір фону">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.bg ?? "#333333"}
                  onChange={(e) => setDraft((d) => ({ ...d, bg: e.target.value }))}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-transparent p-0.5"
                />
                <input
                  className={`${inputClass} flex-1`}
                  value={draft.bg ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, bg: e.target.value }))}
                />
              </div>
            </Field>

            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={draft.enabled !== false}
                onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              />
              Увімкнено в магазині
            </label>

            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-divider)] p-3">
              <div className="text-[13px] font-semibold">Арт (SVG)</div>
              <p className="text-[12px] text-[var(--color-muted3)]">
                Нові скіни — через inline SVG (або завантаж файл). Для існуючих file-скінів лишай
                file, якщо є /mascots/id.svg.
              </p>
              <select
                className={inputClass}
                value={draft.artKind ?? "inline"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, artKind: e.target.value as SkinArtKind }))
                }
              >
                <option value="inline">inline (SVG у БД)</option>
                <option value="file">file (/mascots/id.svg)</option>
                <option value="builtin">builtin (код у апці)</option>
              </select>
              <label className="btn btn-ghost cursor-pointer justify-center gap-1 py-2 text-[13px]">
                <Upload size={14} /> Завантажити .svg
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => void onSvgFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {draft.artKind === "inline" ? (
                <textarea
                  className={`${inputClass} min-h-[120px] font-mono text-[11px]`}
                  value={draft.svg ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, svg: e.target.value }))}
                  placeholder="<svg>...</svg>"
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <SubmitButton
                loading={saving}
                loadingText={creating ? "Створення…" : "Збереження…"}
                icon={<Save size={16} />}
              >
                {creating ? "Створити скін" : "Зберегти ціну / рідкість"}
              </SubmitButton>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                disabled={saving}
                onClick={closeForm}
              >
                Скасувати
              </button>
            </div>
          </form>
        )}
      </AdminEditor>
    </div>
  );
}
