"use client";

import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, ResponsiveContainer,
} from "recharts";
import { format, parseISO, subMonths, addMonths, startOfMonth, isFuture } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatAmount } from "@/lib/currency";
import { AmountDisplay } from "@/components/shared/AmountDisplay";

interface CategoryEntry {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
}

interface CashFlowEntry {
  date: string;
  income: number;
  expenses: number;
}

interface StatisticsClientProps {
  currency: string;
  income: number;
  expenses: number;
  prevIncome: number;
  prevExpenses: number;
  cashFlow: number;
  categoryBreakdown: CategoryEntry[];
  cashFlowChart: CashFlowEntry[];
  currentMonth: string; // "YYYY-MM"
}

function pctChange(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? "+100%" : "—";
  const pct = ((current - prev) / prev) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(0) + "%";
}

export function StatisticsClient({
  currency,
  income,
  expenses,
  prevIncome,
  prevExpenses,
  cashFlow,
  categoryBreakdown,
  cashFlowChart,
  currentMonth,
}: StatisticsClientProps) {
  const router = useRouter();
  const totalExpense = categoryBreakdown.reduce((s, c) => s + c.amount, 0);

  const periodDate = parseISO(`${currentMonth}-01`);
  const isCurrentMonth = format(startOfMonth(new Date()), "yyyy-MM") === currentMonth;

  function navigate(delta: -1 | 1) {
    const next = delta === -1 ? subMonths(periodDate, 1) : addMonths(periodDate, 1);
    if (isFuture(startOfMonth(next))) return;
    router.push(`/statistics?month=${format(next, "yyyy-MM")}`);
  }

  return (
    <div className="px-4 pt-3 pb-32 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>

        <p className="font-mono text-sm font-medium" style={{ color: "var(--color-primary)" }}>
          {format(periodDate, "MMMM yyyy")}
        </p>

        <button
          onClick={() => navigate(1)}
          disabled={isCurrentMonth}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95 disabled:opacity-30"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-secondary)" }}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Income",   amount: income,    prev: prevIncome,                  type: "income"  as const, sign: false },
          { label: "Expenses", amount: expenses,  prev: prevExpenses,                type: "expense" as const, sign: false },
          { label: "Net",      amount: cashFlow,  prev: prevIncome - prevExpenses,   type: cashFlow >= 0 ? "income" as const : "expense" as const, sign: true },
        ].map(({ label, amount, prev, type, sign }) => (
          <div
            key={label}
            className="rounded-2xl px-3 py-3 space-y-1"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-xs" style={{ color: "var(--color-secondary)" }}>{label}</p>
            <AmountDisplay amount={Math.abs(amount)} currency={currency} type={type} size="sm" showSign={sign} />
            <p className="text-xs font-mono" style={{ color: amount >= prev ? "var(--color-income)" : "var(--color-expense)" }}>
              {pctChange(amount, prev)}
            </p>
          </div>
        ))}
      </div>

      {/* Cash flow bar chart */}
      {cashFlowChart.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
            Daily Cash Flow
          </h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={cashFlowChart} barSize={6} barGap={2}>
              <XAxis
                dataKey="date"
                tickFormatter={(v) => format(parseISO(v), "d")}
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="income" fill="var(--color-income)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expense)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
            Expense Breakdown
          </h2>
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 8).map((cat) => {
              const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{cat.icon ?? "📦"}</span>
                      <span className="text-sm" style={{ color: "var(--color-primary)" }}>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs" style={{ color: "var(--color-secondary)" }}>
                        {pct.toFixed(0)}%
                      </span>
                      <span className="font-mono text-sm font-medium" style={{ color: "var(--color-expense)" }}>
                        {formatAmount(cat.amount, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cat.color ?? "var(--color-expense)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {categoryBreakdown.length === 0 && cashFlowChart.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-mono text-5xl mb-3" style={{ color: "var(--color-muted)" }}>—</p>
          <p className="text-sm" style={{ color: "var(--color-secondary)" }}>No data for this period.</p>
        </div>
      )}
    </div>
  );
}
