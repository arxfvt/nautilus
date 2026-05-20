"use client";

import Link from "next/link";
import { isToday, isYesterday, format } from "date-fns";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import type { TransactionType } from "@/types";

export interface SerializedTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  note?: string | null;
  isPending: boolean;
  account: { id: string; name: string; color?: string | null };
  toAccount?: { id: string; name: string } | null;
  category?: { id: string; name: string; icon?: string | null; color?: string | null } | null;
  labels: { id: string; name: string; color?: string | null }[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM");
}

interface LastRecordsListProps {
  transactions: SerializedTransaction[];
}

export function LastRecordsList({ transactions }: LastRecordsListProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="font-mono text-4xl mb-2" style={{ color: "var(--color-muted)" }}>—</p>
        <p className="text-sm" style={{ color: "var(--color-secondary)" }}>No transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {transactions.map((t, i) => {
        const categoryColor = t.category?.color ?? "var(--color-border-strong)";
        const categoryIcon = t.category?.icon ?? "💼";
        const isTransfer = t.type === "transfer";
        const displayNote = t.note
          || (isTransfer ? `${t.account.name} → ${t.toAccount?.name ?? "?"}` : t.category?.name ?? "Transaction");

        return (
          <Link
            key={t.id}
            href={`/records/${t.id}`}
            className="flex items-center gap-3 px-4 py-3.5 relative active:opacity-70 transition-opacity"
            style={{
              background: "var(--color-surface)",
              borderBottom: i < transactions.length - 1 ? "1px solid var(--color-border)" : "none",
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
      })}
    </div>
  );
}
