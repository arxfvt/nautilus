"use client";

import { useState } from "react";
import { formatAmount } from "@/lib/currency";

interface NetWorthDisplayProps {
  amount: number;
  currency: string;
  monthlyChange: number;
}

export function NetWorthDisplay({ amount, currency, monthlyChange }: NetWorthDisplayProps) {
  const [visible, setVisible] = useState(false);

  const changeAbs = Math.abs(monthlyChange);
  const isPositive = monthlyChange > 0;
  const isNeutral = monthlyChange === 0;

  const pillColor = isNeutral
    ? "var(--color-muted)"
    : isPositive
    ? "var(--color-income)"
    : "var(--color-expense)";

  const pillBg = isNeutral
    ? "var(--bg-subtle)"
    : isPositive
    ? "var(--income-subtle)"
    : "var(--expense-subtle)";

  const arrow = isPositive ? "↑" : isNeutral ? "—" : "↓";

  return (
    <div className="px-4 pt-3 pb-4">
      <p
        className="text-xs font-medium uppercase tracking-wider mb-1"
        style={{ color: "var(--color-secondary)" }}
      >
        Net Worth
      </p>

      <div className="flex items-end gap-3">
        <span
          className="font-mono text-3xl font-semibold transition-all duration-300"
          style={{
            color: "var(--color-primary)",
            filter: visible ? "none" : "blur(10px)",
            userSelect: visible ? "auto" : "none",
          }}
        >
          {formatAmount(amount, currency)}
        </span>

        <button
          onClick={() => setVisible((v) => !v)}
          className="mb-1 text-xs px-2 py-0.5 rounded transition-all duration-150 active:scale-95"
          style={{
            color: "var(--color-secondary)",
            border: "1px solid var(--color-border)",
            background: "var(--bg-surface)",
          }}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {!isNeutral && (
        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono"
            style={{ color: pillColor, background: pillBg }}
          >
            {arrow} {formatAmount(changeAbs, currency)} this month
          </span>
        </div>
      )}
    </div>
  );
}
