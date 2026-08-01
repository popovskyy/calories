"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type CartesianViewBox,
} from "recharts";
import { ChartFrame } from "@/components/ChartFrame";
import { fromYMD, humanDate, shortDate, todayYMD } from "@/lib/date";
import type { WeightPoint } from "@/lib/api";

interface WeightChartProps {
  /** Історія зважувань за зростанням дати. */
  points: WeightPoint[];
  startWeight: number;
  startWeightDate: string;
  targetWeight: number;
  /** Прогнозована дата досягнення цілі за поточним темпом (YYYY-MM-DD). */
  targetDate: string;
  /** Вага за калорійним треком від старту — маркер «журнал», не факт. */
  ledgerWeight?: number | null;
}

interface FactPoint {
  t: number;
  date: string;
  weight: number;
  /** Прогнозована вага на цю дату — для тултипа «на скільки випереджаю». */
  plan: number;
}

const DAY = 24 * 60 * 60 * 1000;
const ms = (ymd: string) => fromYMD(ymd).getTime();

/**
 * Графік ваги: факт від старту до сьогодні на тлі прогнозної прямої
 * старт → ціль. Вісь X — реальні дати (не індекс запису), вісь Y завжди
 * вміщує і старт, і ціль, тож напрямок кривої читається однозначно.
 */
export function WeightChart({
  points,
  startWeight,
  startWeightDate,
  targetWeight,
  targetDate,
  ledgerWeight,
}: WeightChartProps) {
  const t0 = ms(startWeightDate);
  const tToday = ms(todayYMD());

  const fact: FactPoint[] = points
    .filter((p) => p.date >= startWeightDate)
    .map((p) => ({ t: ms(p.date), date: p.date, weight: p.weight, plan: 0 }));

  // Крива завжди починається зі старту, навіть якщо запису на ту дату немає.
  if (fact[0]?.date !== startWeightDate) {
    fact.unshift({
      t: t0,
      date: startWeightDate,
      weight: startWeight,
      plan: startWeight,
    });
  }

  const last = fact[fact.length - 1]!;
  // Права межа: дата цілі, але не раніше за останнє зважування чи сьогодні.
  const tEnd = Math.max(ms(targetDate), last.t, tToday, t0 + DAY);
  const planAt = (t: number) =>
    startWeight + ((targetWeight - startWeight) * (t - t0)) / (tEnd - t0);
  for (const f of fact) f.plan = planAt(f.t);

  const weights = fact.map((f) => f.weight);
  if (ledgerWeight != null) weights.push(ledgerWeight);
  const lo = Math.min(targetWeight, startWeight, ...weights);
  const hi = Math.max(targetWeight, startWeight, ...weights);
  const padY = Math.max(0.5, (hi - lo) * 0.12);
  const yMin = Math.floor((lo - padY) * 2) / 2;
  const yMax = Math.ceil((hi + padY) * 2) / 2;
  const yTicks = [yMin, Math.round(((yMin + yMax) / 2) * 2) / 2, yMax];

  // Лише старт і кінець на осі X — «сьогодні» вже підписане прямо на кривій
  // («Зараз»), тож третій тік лише тіснив би два інших на вузькій картці.
  const span = tEnd - t0;
  const xTicks = [t0, tEnd];
  const nowOnRight = (last.t - t0) / span > 0.65;
  // Якщо зважувань ще нема, «Зараз» збігся б зі «Стартом» — не дублюємо.
  const showNow = fact.length > 1;
  // На старті шляху заливка стиснулась би в вузьку смужку і читалась як
  // стовпчик — тоді лишаємо тільки лінію.
  const showArea = (last.t - t0) / span > 0.12;
  const showLedger =
    ledgerWeight != null &&
    Math.abs(ledgerWeight - last.weight) >= 0.15;

  return (
    <figure className="m-0 min-w-0">
      <ChartFrame className="h-[198px] w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={fact}
            margin={{ top: 26, right: 14, bottom: 4, left: 0 }}
          >
            <defs>
              <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c4b5fd" stopOpacity={0.28} />
                <stop offset="1" stopColor="#c4b5fd" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />

            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[t0, tEnd]}
              ticks={xTicks}
              tickLine={false}
              axisLine={false}
              tick={<DateTick ticks={xTicks} />}
              height={26}
              interval={0}
            />
            <YAxis
              type="number"
              domain={[yMin, yMax]}
              ticks={yTicks}
              tickFormatter={fmtNum}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-muted3)", fontSize: 11 }}
              width={34}
            />

            <Tooltip
              cursor={{ stroke: "var(--color-muted3)", strokeWidth: 1 }}
              content={ChartTooltip}
            />

            {/* Планова траєкторія старт → ціль */}
            <ReferenceLine
              ifOverflow="visible"
              segment={[
                { x: t0, y: startWeight },
                { x: tEnd, y: targetWeight },
              ]}
              stroke="#9aa0b4"
              strokeWidth={2}
              strokeDasharray="5 5"
              strokeOpacity={0.95}
            />

            <Area
              type="linear"
              dataKey="weight"
              stroke="#c4b5fd"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={showArea ? "url(#weight-area)" : "none"}
              dot={
                fact.length <= 20
                  ? {
                      r: 4.5,
                      fill: "#c4b5fd",
                      stroke: "#1a1b22",
                      strokeWidth: 2,
                    }
                  : false
              }
              activeDot={{
                r: 6,
                fill: "#e9e0ff",
                stroke: "#1a1b22",
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            />

            {/* Старт */}
            <ReferenceDot
              ifOverflow="visible"
              x={t0}
              y={startWeight}
              r={5}
              fill="#9aa0b4"
              stroke="#1a1b22"
              strokeWidth={2}
              label={markerLabel({
                text: "Старт",
                dx: 2,
                dy: -10,
                anchor: "start",
                fill: "#c5c8d4",
              })}
            />

            {/* Де я зараз */}
            {showNow ? (
              <ReferenceDot
                ifOverflow="visible"
                x={last.t}
                y={last.weight}
                r={6}
                fill="#e9e0ff"
                stroke="#1a1b22"
                strokeWidth={2}
                label={markerLabel({
                  text: "Зараз",
                  // Біля правого краю підпис іде вліво, щоб не вилізти за полотно.
                  dx: nowOnRight ? -10 : 10,
                  dy: 5,
                  anchor: nowOnRight ? "end" : "start",
                  fill: "#f4f2ff",
                  size: 12,
                  bold: true,
                })}
              />
            ) : null}

            {/* Вага за калоріями — окремо від факту на вагах */}
            {showLedger && ledgerWeight != null ? (
              <ReferenceDot
                ifOverflow="visible"
                x={last.t}
                y={ledgerWeight}
                r={4.5}
                fill="#f0c674"
                stroke="#1a1b22"
                strokeWidth={2}
                label={markerLabel({
                  text: "Журнал",
                  dx: nowOnRight ? -10 : 10,
                  dy: ledgerWeight > last.weight ? -10 : 14,
                  anchor: nowOnRight ? "end" : "start",
                  fill: "#f0c674",
                  size: 11,
                  bold: true,
                })}
              />
            ) : null}

            {/* Ціль */}
            <ReferenceLine
              ifOverflow="visible"
              y={targetWeight}
              stroke="#6bbf8a"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.95}
            />
            <ReferenceDot
              ifOverflow="visible"
              x={tEnd}
              y={targetWeight}
              r={5}
              fill="#6bbf8a"
              stroke="#1a1b22"
              strokeWidth={2}
              label={markerLabel({
                text: "Ціль",
                dx: -8,
                dy: -9,
                anchor: "end",
                fill: "#8fd4a8",
              })}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <figcaption className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted3)]">
        <LegendKey color="#c4b5fd" label="Факт" />
        <LegendKey color="#9aa0b4" label="План до цілі" dashed />
        <LegendKey color="#6bbf8a" label="Ціль" dashed />
        {showLedger ? <LegendKey color="#f0c674" label="За калоріями" /> : null}
      </figcaption>
    </figure>
  );
}

/**
 * Підпис маркера відносно самої точки. Вбудований `position` у recharts
 * центрує текст над точкою — на краях полотна це або обрізає підпис,
 * або накладає його на тік осі, тому позиціонуємо вручну.
 */
function markerLabel({
  text,
  dx,
  dy,
  anchor,
  fill,
  size = 11,
  bold = false,
}: {
  text: string;
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
  fill: string;
  size?: number;
  bold?: boolean;
}) {
  function MarkerLabel({ viewBox }: { viewBox?: CartesianViewBox }) {
    const box = viewBox as { x?: number; y?: number; width?: number; height?: number } | undefined;
    if (box?.x == null || box.y == null) return <g />;
    const cx = box.x + (box.width ?? 0) / 2;
    const cy = box.y + (box.height ?? 0) / 2;
    return (
      <text
        x={cx + dx}
        y={cy + dy}
        textAnchor={anchor}
        fill={fill}
        fontSize={size}
        fontWeight={bold ? 600 : 400}
        // Обводка кольором картки — підпис лишається читабельним там,
        // де перетинає лінію плану чи сітку.
        stroke="var(--color-surface)"
        strokeWidth={3}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {text}
      </text>
    );
  }
  return MarkerLabel;
}

/** Тік осі дат: крайні підписи притискаємо до країв, щоб не обрізались. */
function DateTick(props: {
  ticks?: number[];
  x?: number;
  y?: number;
  payload?: { value?: number };
}) {
  const { ticks = [], x = 0, y = 0, payload } = props;
  const value = payload?.value;
  if (value == null) return <g />;
  const isFirst = value === ticks[0];
  const isLast = value === ticks[ticks.length - 1];
  return (
    <text
      x={x}
      y={y + 10}
      textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
      fill="var(--color-muted2)"
      fontSize={11}
    >
      {shortDate(ymdFromMs(value))}
    </text>
  );
}

function LegendKey({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="8" aria-hidden viewBox="0 0 14 8">
        <line
          x1="0"
          y1="4"
          x2="14"
          y2="4"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "3 3" : undefined}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as FactPoint | undefined;
  if (!active || !point) return null;

  const vsPlan = Math.round((point.weight - point.plan) * 10) / 10;
  const ahead = point.plan >= point.weight;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] shadow-lg">
      <div className="text-[var(--color-muted3)]">{humanDate(point.date)}</div>
      <div className="font-semibold tabular-nums text-[var(--color-text)]">
        {fmtNum(point.weight)} кг
      </div>
      {Math.abs(vsPlan) >= 0.05 ? (
        <div
          className="tabular-nums"
          style={{ color: ahead ? "var(--color-green)" : "var(--color-red)" }}
        >
          {ahead ? "−" : "+"}
          {fmtNum(Math.abs(vsPlan))} кг {ahead ? "від плану" : "до плану"}
        </div>
      ) : (
        <div className="text-[var(--color-muted3)]">рівно за планом</div>
      )}
    </div>
  );
}

function fmtNum(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

/** Зворотне до `ms`: timestamp → YYYY-MM-DD (тіки осі приходять числами). */
function ymdFromMs(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}
