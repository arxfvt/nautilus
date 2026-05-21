import { formatAmount } from "@/lib/currency";
import type { AccountWithBalance } from "@/types";

const TYPE_ICONS: Record<string, string> = {
  cash: "💵",
  checking: "🏦",
  savings: "🏦",
  credit_card: "💳",
  investment: "📈",
  loan: "📋",
  other: "💼",
};

interface AccountCardProps {
  account: AccountWithBalance;
  onClick?: () => void;
}

export function AccountCard({ account, onClick }: AccountCardProps) {
  const balance = formatAmount(account.balance, account.currency);
  const icon = account.icon || TYPE_ICONS[account.type] || "💼";
  const color = account.color || "var(--color-accent)";

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-40 flex flex-col justify-between rounded-2xl p-4 transition-all duration-150 active:scale-95 text-left"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        minHeight: "104px",
      }}
    >
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span className="text-base leading-none">{icon}</span>
        </div>
        <p
          className="text-xs font-medium uppercase tracking-wider truncate"
          style={{ color: "var(--color-secondary)" }}
        >
          {account.name}
        </p>
      </div>

      <p
        className="font-mono text-sm font-semibold mt-2 leading-tight"
        style={{ color: "var(--color-primary)" }}
      >
        {balance}
      </p>
    </button>
  );
}

export function AddAccountCard({ onClick }: { onClick?: () => void }) {
  return (
    <a
      href="/settings/accounts/new"
      className="flex-shrink-0 w-40 flex flex-col items-center justify-center rounded-2xl transition-all duration-150 active:scale-95"
      style={{
        background: "var(--color-surface)",
        border: "1px dashed var(--color-border-strong)",
        minHeight: "96px",
      }}
    >
      <span
        className="text-2xl font-light leading-none mb-1"
        style={{ color: "var(--color-muted)" }}
      >
        +
      </span>
      <span className="text-xs" style={{ color: "var(--color-secondary)" }}>
        Add account
      </span>
    </a>
  );
}
