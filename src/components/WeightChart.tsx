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
  /**
   * Плановий темп із КАЛОРІЙНОГО плану: (підтримка − денна ціль) / 7700,
   * у кг/день зі знаком (<0 — план на схуднення).
   *
   * Раніше сюди приходила прогнозована дата з фактичних зважувань, і лінія
   * плану будувалась «старт → ціль за цю дату». Оскільки дата виводилась із
   * тих самих двох точок, план математично проходив рівно через поточну вагу:
   * тултип «від плану» завжди показував нуль. Тепер план — незалежна величина,
   * і розбіжність між ним і вагами щось означає.
   */
  planRateKgPerDay: number | null;
}

interface FactPoint {
  t: number;
  date: string;
  weight: number;
  /** Планова вага на цю дату; null — калорійного плану немає. */
  plan: number | null;
  /** |факт − план| у кг. */
  planGap: number | null;
  /** Факт попереду плану в бік цілі. */
  aheadOfPlan: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const ms = (ymd: string) => fromYMD(ymd).getTime();

/**
 * Графік ваги: факт від старту до сьогодні на тлі планової прямої з
 * калорійного дефіциту. Вісь X — реальні дати (не індекс запису), вісь Y
 * завжди вміщує і старт, і ціль, тож напрямок кривої читається однозначно.
 */
export function WeightChart({
  points,
  startWeight,
  startWeightDate,
  targetWeight,
  planRateKgPerDay,
}: WeightChartProps) {
  const t0 = ms(startWeightDate);
  const tToday = ms(todayYMD());

  /** −1 — ціль нижча за старт (схуднення), +1 — набір. */
  const dir = Math.sign(targetWeight - startWeight);
  const planRate = planRateKgPerDay;
  // План має вести САМЕ до цілі: дефіцит при цілі набрати вагу — не план.
  const hasPlan =
    dir !== 0 && planRate != null && planRate !== 0 && Math.sign(planRate) === dir;
  const planDays = hasPlan
    ? Math.abs((targetWeight - startWeight) / planRate!)
    : null;
  const tPlanTarget = planDays != null ? t0 + planDays * DAY : null;

  const planAt = (t: number): number | null => {
    if (!hasPlan) return null;
    const w = startWeight + planRate! * ((t - t0) / DAY);
    // Після дати плану лінія лягає на ціль, а не проскакує її.
    return dir < 0 ? Math.max(targetWeight, w) : Math.min(targetWeight, w);
  };

  const toFact = (t: number, date: string, weight: number): FactPoint => {
    const plan = planAt(t);
    return {
      t,
      date,
      weight,
      plan,
      planGap: plan == null ? null : Math.abs(weight - plan),
      aheadOfPlan: plan == null ? false : (weight - plan) * dir > 0,
    };
  };

  const fact: FactPoint[] = points
    .filter((p) => p.date >= startWeightDate)
    .map((p) => toFact(ms(p.date), p.date, p.weight));

  // Крива завжди починається зі старту, навіть якщо запису на ту дату немає.
  if (fact[0]?.date !== startWeightDate) {
    fact.unshift(toFact(t0, startWeightDate, startWeight));
  }

  const last = fact[fact.length - 1]!;
  // Права межа: дата плану, але не раніше за останнє зважування чи сьогодні.
  const tEnd = Math.max(tPlanTarget ?? 0, last.t, tToday, t0 + DAY);

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

            {/* Планова траєкторія за калорійним дефіцитом: старт → ціль */}
            {tPlanTarget != null ? (
              <ReferenceLine
                ifOverflow="visible"
                segment={[
                  { x: t0, y: startWeight },
                  { x: tPlanTarget, y: targetWeight },
                ]}
                stroke="#9aa0b4"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.95}
              />
            ) : null}

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
              x={tPlanTarget ?? tEnd}
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
        {tPlanTarget != null ? (
          <LegendKey color="#9aa0b4" label="План за калоріями" dashed />
        ) : null}
        <LegendKey color="#6bbf8a" label="Ціль" dashed />
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

  const gap = point.planGap == null ? null : Math.round(point.planGap * 10) / 10;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] shadow-lg">
      <div className="text-[var(--color-muted3)]">{humanDate(point.date)}</div>
      <div className="font-semibold tabular-nums text-[var(--color-text)]">
        {fmtNum(point.weight)} кг
      </div>
      {gap == null ? null : gap >= 0.05 ? (
        <div
          className="tabular-nums"
          style={{
            color: point.aheadOfPlan ? "var(--color-green)" : "var(--color-red)",
          }}
        >
          {fmtNum(gap)} кг {point.aheadOfPlan ? "попереду плану" : "позаду плану"}
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
