import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validators/transaction";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
    include: {
      account: { select: { id: true, name: true, color: true } },
      toAccount: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
      labels: { include: { label: { select: { id: true, name: true, color: true } } } },
    },
  });

  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...transaction, labels: transaction.labels.map((tl) => tl.label) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = transactionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { labelIds, ...data } = parsed.data;

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...data,
      ...(data.date && { date: new Date(data.date) }),
      ...(labelIds !== undefined && {
        labels: {
          deleteMany: {},
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

  return NextResponse.json({ ...updated, labels: updated.labels.map((tl) => tl.label) });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.transaction.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
