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

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-divider)] px-3 py-2.5">
          <span className="text-[13px] text-[var(--color-muted3)]">
            {skins.length} скінів · ціна і рідкість редагуються в редакторі
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={startCreate}>
            <Plus size={15} /> Новий скін
          </button>
        </div>
        {/*
          Було max-h-[70vh] + overflow-y-auto — вкладена скрол-пастка:
          список мав власний скрол усередині сторінки, яка сама не скролилась,
          тож нижні скіни було не дістати. Тепер скролить сторінка.
        */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[14px]">
            <thead className="sticky top-0 bg-[var(--color-surface)] text-[12px] uppercase text-[var(--color-muted3)]">
              <tr>
                <th className="px-3 py-2">Скін</th>
                <th className="px-3 py-2">Ціна</th>
                <th className="px-3 py-2">Рідкість</th>
                <th className="px-3 py-2" />
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
                : skins.map((s) => (
                    <tr
                      key={s.id}
                      className={
                        selected?.id === s.id
                          ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                          : "hover:bg-[var(--color-tile)]"
                      }
                    >
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left"
                          onClick={() => open(s)}
                        >
                          <PresetMascot
                            id={s.id}
                            size={36}
                            animated={false}
                            artKind={s.artKind}
                            nameUk={s.nameUk}
                            bg={s.bg}
                          />
                          <span>
                            <span className="block font-semibold">{s.nameUk}</span>
                            <span className="text-[12px] text-[var(--color-muted3)]">
                              {s.id}
                            {s.enabled === false ? (
                              <span className="ml-2 inline-flex items-center rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-red)_18%,transparent)] px-2 py-0.5 text-[11px] text-[var(--color-red)]">
                                вимкнено
                              </span>
                            ) : null}
                              {s.tier === "free" ? " · free" : ""}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2 tabular-nums font-semibold">{s.price}</td>
                      <td className="px-3 py-2" style={{ color: RARITY[s.rarity].color }}>
                        {RARITY[s.rarity].label}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="icon-btn hover:text-[var(--color-red)]"
                          onClick={() => void remove(s.id)}
                          aria-label={`Вимкнути скін ${s.nameUk}`}
                          title="Вимкнути в магазині"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminEditor
        open={creating || selected ? (selected?.id ?? "new") : null}
        title={creating ? "Новий скін" : selected ? "Редагування скіна" : undefined}
        onClose={creating || selected ? closeForm : undefined}
      >
        {!creating && !selected ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-[var(--color-muted3)]">
              Обери скін, щоб змінити ціну / рідкість, або створи новий з SVG.
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
                <PresetMascot
                  id={draft.id}
                  size={72}
                  animated
                  artKind={(draft.artKind as SkinArtKind) ?? "inline"}
                  nameUk={draft.nameUk}
                  bg={draft.bg}
                />
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
              <input
                className={inputClass}
                value={draft.bg ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, bg: e.target.value }))}
              />
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
