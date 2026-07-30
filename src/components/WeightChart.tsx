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
                <stop
                  offset="0"
                  stopColor="var(--color-accent)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="1"
                  stopColor="var(--color-accent)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="var(--color-divider)"
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
              stroke="var(--color-muted3)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              strokeOpacity={0.75}
            />

            <Area
              type="linear"
              dataKey="weight"
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={showArea ? "url(#weight-area)" : "none"}
              dot={
                fact.length <= 14
                  ? { r: 3, fill: "var(--color-accent)", strokeWidth: 0 }
                  : false
              }
              activeDot={{
                r: 5,
                fill: "var(--color-accent)",
                stroke: "var(--color-surface)",
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
              r={4}
              fill="var(--color-muted3)"
              stroke="var(--color-surface)"
              strokeWidth={2}
              label={markerLabel({
                text: "Старт",
                dx: 2,
                dy: -9,
                anchor: "start",
                fill: "var(--color-muted2)",
              })}
            />

            {/* Де я зараз */}
            {showNow ? (
              <ReferenceDot
                ifOverflow="visible"
                x={last.t}
                y={last.weight}
                r={5}
                fill="var(--color-accent)"
                stroke="var(--color-surface)"
                strokeWidth={2}
                label={markerLabel({
                  text: "Зараз",
                  // Біля правого краю підпис іде вліво, щоб не вилізти за полотно.
                  dx: nowOnRight ? -10 : 10,
                  dy: 4,
                  anchor: nowOnRight ? "end" : "start",
                  fill: "var(--color-text)",
                  size: 12,
                  bold: true,
                })}
              />
            ) : null}

            {/* Ціль */}
            <ReferenceLine
              ifOverflow="visible"
              y={targetWeight}
              stroke="var(--color-green)"
              strokeWidth={1}
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />
            <ReferenceDot
              ifOverflow="visible"
              x={tEnd}
              y={targetWeight}
              r={4}
              fill="var(--color-green)"
              stroke="var(--color-surface)"
              strokeWidth={2}
              label={markerLabel({
                text: "Ціль",
                dx: -8,
                dy: -8,
                anchor: "end",
                fill: "var(--color-muted2)",
              })}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <figcaption className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted3)]">
        <LegendKey color="var(--color-accent)" label="Факт" />
        <LegendKey color="var(--color-muted3)" label="Прогноз" dashed />
        <LegendKey color="var(--color-green)" label="Ціль" dashed />
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
          {fmtNum(Math.abs(vsPlan))} кг {ahead ? "від прогнозу" : "до прогнозу"}
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
