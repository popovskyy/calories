interface MacroTilesProps {
  protein: number;
  fats: number;
  carbs: number;
}

const MACROS = [
  { key: "protein", label: "Білки", color: "var(--color-macro-protein)" },
  { key: "fats", label: "Жири", color: "var(--color-macro-fats)" },
  { key: "carbs", label: "Вуглеводи", color: "var(--color-macro-carbs)" },
] as const;

export function MacroTiles({ protein, fats, carbs }: MacroTilesProps) {
  const values = { protein, fats, carbs };
  return (
    <div className="flex w-full gap-2.5">
      {MACROS.map((m) => (
        <div
          key={m.key}
          className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-tile)] py-2 text-center"
        >
          <div className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--color-muted3)]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: m.color }}
            />
            {m.label}
          </div>
          <div className="text-[18px] font-semibold text-[var(--color-text)]">
            {values[m.key]} г
          </div>
        </div>
      ))}
    </div>
  );
}
