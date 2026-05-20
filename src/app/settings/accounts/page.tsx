import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/currency";
import { Plus } from "lucide-react";

const TYPE_ICONS: Record<string, string> = {
  cash: "💵", checking: "🏦", savings: "🏦",
  credit_card: "💳", investment: "📈", loan: "📋", other: "💼",
};

export default async function AccountsSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  // Compute real balance per account from transactions
  const balanceMap = new Map<string, number>();
  if (accounts.length > 0) {
    const ids = accounts.map((a) => a.id);

    const [incomeAgg, expenseAgg, transferInAgg, transferOutAgg] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["accountId"],
        where: { userId, accountId: { in: ids }, type: "income" },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["accountId"],
        where: { userId, accountId: { in: ids }, type: "expense" },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["toAccountId"],
        where: { userId, toAccountId: { in: ids }, type: "transfer" },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["accountId"],
        where: { userId, accountId: { in: ids }, type: "transfer" },
        _sum: { amount: true },
      }),
    ]);

    for (const acc of accounts) {
      const inc = incomeAgg.find((r) => r.accountId === acc.id)?._sum.amount ?? 0;
      const exp = expenseAgg.find((r) => r.accountId === acc.id)?._sum.amount ?? 0;
      const tIn = transferInAgg.find((r) => r.toAccountId === acc.id)?._sum.amount ?? 0;
      const tOut = transferOutAgg.find((r) => r.accountId === acc.id)?._sum.amount ?? 0;
      balanceMap.set(acc.id, acc.openingBalance + inc - exp + tIn - tOut);
    }
  }

  return (
    <div className="px-4 pt-4 pb-10">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>
          Accounts
        </h1>
        <Link
          href="/settings/accounts/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={15} />
          New
        </Link>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--color-secondary)" }}>
          No accounts yet.
        </p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {accounts.map((account, i) => {
            const color = account.color ?? "var(--color-accent)";
            const icon = account.icon || TYPE_ICONS[account.type] || "💼";
            const balance = balanceMap.get(account.id) ?? account.openingBalance;
            return (
              <Link
                key={account.id}
                href={`/settings/accounts/${account.id}/edit`}
                className="flex items-center gap-4 px-4 py-4 relative transition-all active:scale-[0.99]"
                style={{
                  background: "var(--color-surface)",
                  borderBottom: i < accounts.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
                <span className="text-xl pl-2">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-primary)" }}>
                    {account.name}
                  </p>
                  <p className="text-xs capitalize" style={{ color: "var(--color-secondary)" }}>
                    {account.type.replace("_", " ")}
                    {account.isArchived ? " · Archived" : ""}
                  </p>
                </div>
                <span className="font-mono text-sm font-medium shrink-0" style={{ color: balance < 0 ? "var(--color-expense)" : "var(--color-primary)" }}>
                  {formatAmount(balance, account.currency)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
