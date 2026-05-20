"use client";

import Link from "next/link";
import { isToday, isYesterday, format } from "date-fns";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import type { SerializedTransaction } from "@/components/dashboard/LastRecordsList";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM");
}

interface TransactionRowProps {
  transaction: SerializedTransaction;
  showDate?: boolean;
  isLast?: boolean;
}

export function TransactionRow({ transaction: t, isLast }: TransactionRowProps) {
  const categoryColor = t.category?.color ?? "var(--color-border-strong)";
  const categoryIcon = t.category?.icon ?? "💼";
  const isTransfer = t.type === "transfer";
  const displayNote = t.note
    || (isTransfer ? `${t.account.name} → ${t.toAccount?.name ?? "?"}` : t.category?.name ?? "Transaction");

  return (
    <Link
      href={`/records/${t.id}`}
      className="flex items-center gap-3 px-4 py-3.5 relative active:opacity-70 transition-opacity"
      style={{
        background: "var(--color-surface)",
        borderBottom: isLast ? "none" : "1px solid var(--color-border)",
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ background: categoryColor }}
      />

      <span className="text-base leading-none pl-1 flex-shrink-0">{categoryIcon}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--color-primary)" }}>
          {displayNote}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-secondary)" }}>
          {isTransfer ? "Transfer" : t.account.name}
          {t.isPending && " · Pending"}
        </p>
      </div>

      <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
        <AmountDisplay amount={t.amount} currency={t.currency} type={t.type} size="sm" />
        <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
          {formatDate(t.date)}
        </span>
      </div>
    </Link>
  );
}
