"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { todayYMD, weekdayShort } from "@/lib/date";
import type { DashboardDay } from "@/lib/types";

interface WeeklyChartProps {
  days: DashboardDay[];
  target: number;
}

function fillFor(status: string, isToday: boolean) {
  if (isToday) return "url(#bar-accent)";
  return status === "red" ? "url(#bar-red)" : "url(#bar-green)";
}

type Tick = { x?: number; y?: number; payload?: { value?: string } };

export function WeeklyChart({ days, target }: WeeklyChartProps) {
  const today = todayYMD();
  const todayLabel = weekdayShort(today);

  const data = days.map((d) => ({
    label: weekdayShort(d.date),
    value: d.totalCalories,
    status: d.status,
    isToday: d.date === today,
  }));

  const maxVal = Math.max(target, ...data.map((d) => d.value), 1);
  const yMax = Math.ceil((maxVal * 1.14) / 100) * 100;

  const DayTick = ({ x = 0, y = 0, payload }: Tick) => {
    const isToday = payload?.value === todayLabel;
    return (
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        fontSize={13}
        fontWeight={isToday ? 600 : 400}
        fill={isToday ? "var(--color-text)" : "var(--color-muted3)"}
      >
        {payload?.value}
      </text>
    );
  };

  return (
    <div className="h-[150px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: 4 }} barCategoryGap="26%">
          <defs>
            <linearGradient id="bar-green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6bbf8a" />
              <stop offset="1" stopColor="#4f9d6e" />
            </linearGradient>
            <linearGradient id="bar-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e0808c" />
              <stop offset="1" stopColor="#c05f6c" />
            </linearGradient>
            <linearGradient id="bar-accent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b5abfc" />
              <stop offset="1" stopColor="#796cbf" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={<DayTick />}
            height={22}
          />
          <YAxis hide domain={[0, yMax]} />
          <ReferenceLine
            y={target}
            stroke="#595d6c"
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{
              value: String(target),
              position: "right",
              fill: "#75798c",
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="value"
            radius={[5, 5, 3, 3]}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={fillFor(d.status, d.isToday)}
                stroke={d.isToday ? "#b5abfc" : "none"}
                strokeWidth={d.isToday ? 2 : 0}
              />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v) => (Number(v) > 0 ? String(v) : "")}
              fontSize={11}
              fill="#75798c"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
