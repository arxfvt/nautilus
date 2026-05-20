import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/layout/TopBar";
import { RecordsList } from "./RecordsList";
import type { SerializedTransaction } from "@/components/dashboard/LastRecordsList";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1"));
  const limit = 30;

  const where = {
    userId: session.user.id,
    ...(q && { note: { contains: q, mode: "insensitive" as const } }),
  };

  const [rawTransactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        account: { select: { id: true, name: true, color: true } },
        toAccount: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const transactions: SerializedTransaction[] = rawTransactions.map((t) => ({
    id: t.id,
    type: t.type as SerializedTransaction["type"],
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
      <TopBar title="Records" />
      <RecordsList
        transactions={transactions}
        total={total}
        page={page}
        pages={Math.ceil(total / limit)}
        query={q ?? ""}
      />
    </>
  );
}
