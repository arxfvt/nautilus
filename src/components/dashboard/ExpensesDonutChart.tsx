"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatAmount } from "@/lib/currency";

interface CategorySlice {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
}

interface ExpensesDonutChartProps {
  data: CategorySlice[];
  currency: string;
  total: number;
}

const FALLBACK_COLORS = [
  "var(--color-expense)", "var(--color-warning)", "var(--color-transfer)",
  "var(--color-accent)", "var(--color-income)",
];

export function ExpensesDonutChart({ data, currency, total }: ExpensesDonutChartProps) {
  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>No expenses this month</p>
      </div>
    );
  }

  const top5 = data.slice(0, 5);
  const rest = data.slice(5);
  const restTotal = rest.reduce((s, c) => s + c.amount, 0);

  const chartData = [
    ...top5,
    ...(restTotal > 0 ? [{ id: "__rest__", name: "Other", icon: null, color: "var(--color-muted)", amount: restTotal }] : []),
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0 w-24 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="amount"
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={44}
              strokeWidth={0}
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={entry.id}
                  fill={entry.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {chartData.slice(0, 4).map((cat, i) => {
          const pct = ((cat.amount / total) * 100).toFixed(0);
          const color = cat.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
          return (
            <div key={cat.id} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs truncate flex-1" style={{ color: "var(--color-secondary)" }}>
                {cat.icon} {cat.name}
              </span>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: "var(--color-primary)" }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
