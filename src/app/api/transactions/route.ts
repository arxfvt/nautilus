import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validators/transaction";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type");
  const search = searchParams.get("q");

  const where = {
    userId: session.user.id,
    ...(accountId && { OR: [{ accountId }, { toAccountId: accountId }] }),
    ...(type && { type }),
    ...(search && {
      note: { contains: search, mode: "insensitive" as const },
    }),
  };

  const [transactions, total] = await Promise.all([
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

  return NextResponse.json({
    transactions: transactions.map((t) => ({ ...t, labels: t.labels.map((tl) => tl.label) })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { labelIds, ...data } = parsed.data;

  // Verify accounts belong to this user
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, userId: session.user.id },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (data.toAccountId) {
    const toAccount = await prisma.account.findFirst({
      where: { id: data.toAccountId, userId: session.user.id },
    });
    if (!toAccount) return NextResponse.json({ error: "Destination account not found" }, { status: 404 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      date: new Date(data.date),
      userId: session.user.id,
      ...(labelIds.length > 0 && {
        labels: {
          create: labelIds.map((labelId) => ({ label: { connect: { id: labelId } } })),
        },
      }),
    },
    include: {
      account: { select: { id: true, name: true, color: true } },
      toAccount: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
      labels: { include: { label: { select: { id: true, name: true, color: true } } } },
    },
  });

  return NextResponse.json(
    { ...transaction, labels: transaction.labels.map((tl) => tl.label) },
    { status: 201 }
  );
}
