import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/layout/TopBar";
import { AccountCardRow } from "@/components/dashboard/AccountCardRow";
import { LastRecordsList } from "@/components/dashboard/LastRecordsList";
import { BalanceTrendChart } from "@/components/dashboard/BalanceTrendChart";
import { ExpensesDonutChart } from "@/components/dashboard/ExpensesDonutChart";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import type { AccountWithBalance } from "@/types";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [accounts, user, recentRaw, monthTransactions] = await Promise.all([
    prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { sortOrder: "asc" },
      include: {
        transactions: {
          select: { type: true, amount: true, accountId: true, toAccountId: true },
        },
        toTransactions: {
          select: { type: true, amount: true, accountId: true, toAccountId: true },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { defaultCurrency: true, name: true } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        account: { select: { id: true, name: true, color: true } },
        toAccount: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const defaultCurrency = user?.defaultCurrency ?? "UGX";

  // Time-based greeting in Africa/Kampala timezone
  const hour = parseInt(
    new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Africa/Kampala" })
  );
  const greeting = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name ?? session.user.name ?? "there").split(" ")[0];

  const accountsWithBalance: AccountWithBalance[] = accounts.map((account) => {
    const income = account.transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = account.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const transfersOut = account.transactions.filter((t) => t.type === "transfer" && t.toAccountId !== null).reduce((s, t) => s + t.amount, 0);
    const transfersIn = account.toTransactions.filter((t) => t.type === "transfer").reduce((s, t) => s + t.amount, 0);

    return {
      id: account.id,
      name: account.name,
      type: account.type as AccountWithBalance["type"],
      currency: account.currency,
      color: account.color,
      icon: account.icon,
      includeInTotal: account.includeInTotal,
      isArchived: account.isArchived,
      sortOrder: account.sortOrder,
      balance: account.openingBalance + income - expenses - transfersOut + transfersIn,
    };
  });

  const netWorth = accountsWithBalance
    .filter((a) => a.includeInTotal && a.currency === defaultCurrency)
    .reduce((s, a) => s + a.balance, 0);

  // Balance trend: daily cumulative net change this month
  const days = eachDayOfInterval({ start: monthStart, end: now });
  const openingNetWorth = accountsWithBalance
    .filter((a) => a.includeInTotal && a.currency === defaultCurrency)
    .reduce((s, a) => {
      // Subtract this month's transactions to get opening balance
      const monthIncome = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const monthExpenses = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      return s + a.balance - monthIncome + monthExpenses;
    }, 0) / Math.max(accountsWithBalance.filter((a) => a.includeInTotal && a.currency === defaultCurrency).length, 1);

  // Simplified: build running balance from opening + daily net changes
  const dailyNet = new Map<string, number>();
  for (const t of monthTransactions) {
    const day = format(t.date, "yyyy-MM-dd");
    const delta = t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0;
    dailyNet.set(day, (dailyNet.get(day) ?? 0) + delta);
  }

  let running = netWorth;
  // Work backwards from today to get daily balances
  const reversedDays = [...days].reverse();
  const balanceByDay = new Map<string, number>();
  balanceByDay.set(format(now, "yyyy-MM-dd"), netWorth);
  for (let i = 1; i < reversedDays.length; i++) {
    const dayKey = format(reversedDays[i], "yyyy-MM-dd");
    const nextDayKey = format(reversedDays[i - 1], "yyyy-MM-dd");
    const nextDayDelta = dailyNet.get(nextDayKey) ?? 0;
    balanceByDay.set(dayKey, (balanceByDay.get(nextDayKey) ?? running) - nextDayDelta);
  }

  const trendData = days.map((d) => ({
    date: format(d, "yyyy-MM-dd"),
    balance: balanceByDay.get(format(d, "yyyy-MM-dd")) ?? netWorth,
  }));

  // Expense breakdown this month
  const catMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null; amount: number }>();
  for (const t of monthTransactions) {
    if (t.type !== "expense") continue;
    const key = t.categoryId ?? "__none__";
    const cat = t.category ?? { id: "__none__", name: "Uncategorized", icon: null, color: null };
    if (!catMap.has(key)) catMap.set(key, { ...cat, amount: 0 });
    catMap.get(key)!.amount += t.amount;
  }
  const expenseBreakdown = Array.from(catMap.values()).sort((a, b) => b.amount - a.amount);
  const totalExpenses = expenseBreakdown.reduce((s, c) => s + c.amount, 0);

  const recentTransactions = recentRaw.map((t) => ({
    id: t.id,
    type: t.type as "income" | "expense" | "transfer",
    amount: t.amount,
    currency: t.currency,
    date: t.date.toISOString(),
    note: t.note,
    isPending: t.isPending,
    account: t.account,
    toAccount: t.toAccount,
    category: t.category,
    labels: t.labels.map((tl) => tl.label),
  }));

  return (
    <>
      <TopBar showActions />
      <div className="pb-32">
        {/* Greeting */}
        <div className="px-4 pt-5 pb-2">
          <p className="text-xl font-semibold" style={{ color: "var(--color-primary)" }}>
            {greeting}, {firstName} 👋
          </p>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-secondary)" }}>
            Here&apos;s your financial snapshot
          </p>
        </div>

        {/* Net worth */}
        <div className="px-4 pt-3 pb-4">
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--color-secondary)" }}>
            Net Worth
          </p>
          <AmountDisplay amount={netWorth} currency={defaultCurrency} type="neutral" size="xl" />
        </div>

        {/* Account cards */}
        <AccountCardRow accounts={accountsWithBalance} />

        {/* Balance trend */}
        {trendData.length > 1 && (
          <section className="px-4 mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-secondary)" }}>
              Balance Trend
            </h2>
            <BalanceTrendChart data={trendData} currency={defaultCurrency} />
          </section>
        )}

        {/* Expense breakdown donut */}
        {expenseBreakdown.length > 0 && (
          <section className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
                Expenses This Month
              </h2>
              <AmountDisplay amount={totalExpenses} currency={defaultCurrency} type="expense" size="sm" showSign={false} />
            </div>
            <ExpensesDonutChart data={expenseBreakdown} currency={defaultCurrency} total={totalExpenses} />
          </section>
        )}

        {/* Recent transactions */}
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
              Recent
            </h2>
            <Link href="/records" className="text-xs" style={{ color: "var(--color-accent)" }}>
              See all →
            </Link>
          </div>
          <LastRecordsList transactions={recentTransactions} />
        </section>
      </div>
    </>
  );
}
