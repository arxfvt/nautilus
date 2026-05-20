"use client";

import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatAmount } from "@/lib/currency";

interface DataPoint {
  date: string;
  balance: number;
}

interface BalanceTrendChartProps {
  data: DataPoint[];
  currency: string;
}

export function BalanceTrendChart({ data, currency }: BalanceTrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>Not enough data</p>
      </div>
    );
  }

  const latest = data[data.length - 1]?.balance ?? 0;
  const earliest = data[0]?.balance ?? 0;
  const trend = latest - earliest;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
          {formatAmount(latest, currency)}
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: trend >= 0 ? "var(--color-income)" : "var(--color-expense)" }}
        >
          {trend >= 0 ? "↑" : "↓"} {formatAmount(Math.abs(trend), currency)} MTD
        </span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F8EF8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#4F8EF8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["auto", "auto"]} hide />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => format(parseISO(v), "d")}
            tick={{ fill: "var(--color-muted)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              return (
                <div
                  className="px-2 py-1.5 rounded-lg text-xs font-mono"
                  style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)", color: "var(--color-primary)" }}
                >
                  {formatAmount(payload[0].value as number, currency)}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="url(#balanceGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "var(--color-accent)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
