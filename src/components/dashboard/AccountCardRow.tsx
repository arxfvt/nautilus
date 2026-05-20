"use client";

import { AccountCard, AddAccountCard } from "./AccountCard";
import { SkeletonBar } from "@/components/shared/SkeletonBar";
import type { AccountWithBalance } from "@/types";

interface AccountCardRowProps {
  accounts: AccountWithBalance[];
  loading?: boolean;
}

export function AccountCardRow({ accounts, loading }: AccountCardRowProps) {
  if (loading) {
    return (
      <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-40 rounded-2xl p-4"
            style={{ background: "var(--color-surface)", minHeight: "96px", border: "1px solid var(--color-border)" }}
          >
            <SkeletonBar className="w-5 h-5 rounded-full mb-3" />
            <SkeletonBar className="w-16 h-2.5 mb-2" />
            <SkeletonBar className="w-24 h-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
      <AddAccountCard />
    </div>
  );
}
