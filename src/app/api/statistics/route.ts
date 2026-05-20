import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from "date-fns";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const refDate = searchParams.get("ref") ? new Date(searchParams.get("ref")!) : new Date();

  let start: Date;
  let end: Date;

  if (period === "week") {
    start = startOfWeek(refDate, { weekStartsOn: 1 });
    end = endOfWeek(refDate, { weekStartsOn: 1 });
  } else if (period === "year") {
    start = startOfYear(refDate);
    end = endOfYear(refDate);
  } else {
    start = startOfMonth(refDate);
    end = endOfMonth(refDate);
  }

  const userId = session.user.id;

  const [transactions, prevTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        account: { select: { currency: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: period === "month" ? startOfMonth(subMonths(refDate, 1)) : start,
          lte: period === "month" ? endOfMonth(subMonths(refDate, 1)) : end,
        },
      },
      select: { type: true, amount: true },
    }),
  ]);

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Category breakdown
  const expenseMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null; amount: number }>();
  for (const t of transactions.filter((t) => t.type === "expense")) {
    const key = t.categoryId ?? "__none__";
    const cat = t.category ?? { id: "__none__", name: "Uncategorized", icon: null, color: null };
    if (!expenseMap.has(key)) {
      expenseMap.set(key, { ...cat, amount: 0 });
    }
    expenseMap.get(key)!.amount += t.amount;
  }
  const categoryBreakdown = Array.from(expenseMap.values()).sort((a, b) => b.amount - a.amount);

  // Daily cash flow for bar chart (current period)
  const dailyMap = new Map<string, { income: number; expenses: number }>();
  for (const t of transactions) {
    const dayKey = t.date.toISOString().slice(0, 10);
    if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { income: 0, expenses: 0 });
    const day = dailyMap.get(dayKey)!;
    if (t.type === "income") day.income += t.amount;
    if (t.type === "expense") day.expenses += t.amount;
  }
  const cashFlow = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  return NextResponse.json({
    period,
    start: start.toISOString(),
    end: end.toISOString(),
    income,
    expenses,
    cashFlow: income - expenses,
    prevIncome,
    prevExpenses,
    categoryBreakdown,
    cashFlowChart: cashFlow,
  });
}
