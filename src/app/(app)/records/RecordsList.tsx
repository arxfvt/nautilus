"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import type { SerializedTransaction } from "@/components/dashboard/LastRecordsList";

interface RecordsListProps {
  transactions: SerializedTransaction[];
  total: number;
  page: number;
  pages: number;
  query: string;
}

function groupByDate(transactions: SerializedTransaction[]): [string, SerializedTransaction[]][] {
  const map = new Map<string, SerializedTransaction[]>();
  for (const t of transactions) {
    const key = format(parseISO(t.date), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries());
}

function dateLabel(isoDate: string): string {
  return format(parseISO(isoDate), "EEEE, d MMMM yyyy");
}

export function RecordsList({ transactions, total, page, pages, query }: RecordsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(query);
  const [, startTransition] = useTransition();

  function handleSearch(value: string) {
    setSearchValue(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function goToPage(p: number) {
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("q", searchValue.trim());
    params.set("page", p.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  const grouped = groupByDate(transactions);

  return (
    <div className="px-4 pt-3 pb-32 space-y-4">
      {/* Search */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <Search size={16} style={{ color: "var(--color-secondary)" }} />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search transactions…"
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: "var(--color-primary)" }}
        />
      </div>

      {/* Count */}
      <p className="text-xs" style={{ color: "var(--color-secondary)" }}>
        {total} transaction{total !== 1 ? "s" : ""}
      </p>

      {transactions.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-mono text-5xl mb-3" style={{ color: "var(--color-muted)" }}>—</p>
          <p className="text-sm" style={{ color: "var(--color-secondary)" }}>
            {query ? "No matching transactions." : "No transactions yet."}
          </p>
        </div>
      ) : (
        grouped.map(([date, group]) => (
          <div key={date}>
            <p
              className="text-xs font-medium mb-2 uppercase tracking-wider"
              style={{ color: "var(--color-secondary)" }}
            >
              {dateLabel(date)}
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--color-border)" }}
            >
              {group.map((t, i) => (
                <TransactionRow key={t.id} transaction={t} isLast={i === group.length - 1} />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-30"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary)" }}
          >
            ← Prev
          </button>
          <span className="font-mono text-sm" style={{ color: "var(--color-secondary)" }}>
            {page} / {pages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= pages}
            className="px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-30"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-primary)" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
