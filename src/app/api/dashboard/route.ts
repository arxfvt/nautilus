import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AccountWithBalance } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Fetch accounts + transaction aggregates in one query
  const accounts = await prisma.account.findMany({
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
  });

  const accountsWithBalance: AccountWithBalance[] = accounts.map((account) => {
    const income = account.transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = account.transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const transfersOut = account.transactions
      .filter((t) => t.type === "transfer" && t.toAccountId !== null)
      .reduce((s, t) => s + t.amount, 0);
    const transfersIn = account.toTransactions
      .filter((t) => t.type === "transfer")
      .reduce((s, t) => s + t.amount, 0);

    const balance = account.openingBalance + income - expenses - transfersOut + transfersIn;

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
      balance,
    };
  });

  // Recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
    include: {
      account: { select: { id: true, name: true, color: true } },
      toAccount: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
      labels: { include: { label: { select: { id: true, name: true, color: true } } } },
    },
  });

  const transactions = recentTransactions.map((t) => ({
    ...t,
    labels: t.labels.map((tl) => tl.label),
  }));

  return NextResponse.json({ accounts: accountsWithBalance, recentTransactions: transactions });
}
