import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from "date-fns";
import { TopBar } from "@/components/layout/TopBar";
import { StatisticsClient } from "./StatisticsClient";

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { month } = await searchParams;

  // Parse the month param or default to current month
  let periodStart: Date;
  try {
    periodStart = month ? startOfMonth(parseISO(`${month}-01`)) : startOfMonth(new Date());
  } catch {
    periodStart = startOfMonth(new Date());
  }
  const periodEnd = endOfMonth(periodStart);
  const prevStart = startOfMonth(subMonths(periodStart, 1));
  const prevEnd = endOfMonth(subMonths(periodStart, 1));
  const currentMonth = format(periodStart, "yyyy-MM");

  const userId = session.user.id;

  const [user, transactions, prevTransactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { defaultCurrency: true } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: periodStart, lte: periodEnd } },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: prevStart, lte: prevEnd } },
      select: { type: true, amount: true },
    }),
  ]);

  const currency = user?.defaultCurrency ?? "UGX";
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const catMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null; amount: number }>();
  for (const t of transactions.filter((t) => t.type === "expense")) {
    const key = t.categoryId ?? "__none__";
    const cat = t.category ?? { id: "__none__", name: "Uncategorized", icon: null, color: null };
    if (!catMap.has(key)) catMap.set(key, { ...cat, amount: 0 });
    catMap.get(key)!.amount += t.amount;
  }
  const categoryBreakdown = Array.from(catMap.values()).sort((a, b) => b.amount - a.amount);

  const dailyMap = new Map<string, { income: number; expenses: number }>();
  for (const t of transactions) {
    const day = t.date.toISOString().slice(0, 10);
    if (!dailyMap.has(day)) dailyMap.set(day, { income: 0, expenses: 0 });
    if (t.type === "income") dailyMap.get(day)!.income += t.amount;
    if (t.type === "expense") dailyMap.get(day)!.expenses += t.amount;
  }
  const cashFlowChart = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return (
    <>
      <TopBar title="Statistics" />
      <StatisticsClient
        currency={currency}
        income={income}
        expenses={expenses}
        prevIncome={prevIncome}
        prevExpenses={prevExpenses}
        cashFlow={income - expenses}
        categoryBreakdown={categoryBreakdown}
        cashFlowChart={cashFlowChart}
        currentMonth={currentMonth}
      />
    </>
  );
}
