import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/layout/TopBar";
import { TransactionEditClient } from "./TransactionEditClient";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;

  const [transaction, accounts, categories] = await Promise.all([
    prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
      include: {
        account: { select: { id: true, name: true, color: true } },
        toAccount: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id, isArchived: false },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id, isArchived: false },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  if (!transaction) notFound();

  return (
    <>
      <TopBar showBack />
      <TransactionEditClient
        transaction={{
          id: transaction.id,
          type: transaction.type as "income" | "expense" | "transfer",
          amount: transaction.amount,
          currency: transaction.currency,
          accountId: transaction.accountId,
          toAccountId: transaction.toAccountId,
          categoryId: transaction.categoryId,
          date: transaction.date.toISOString().slice(0, 10),
          note: transaction.note,
          isPending: transaction.isPending,
          labelIds: transaction.labels.map((tl) => tl.label.id),
        }}
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          currency: a.currency,
          color: a.color,
          icon: a.icon,
        }))}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
        }))}
      />
    </>
  );
}
