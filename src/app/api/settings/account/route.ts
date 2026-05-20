import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Delete in dependency order
  await prisma.transactionLabel.deleteMany({ where: { transaction: { userId } } });
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.budgetCategory.deleteMany({ where: { budget: { userId } } });
  await prisma.budget.deleteMany({ where: { userId } });
  await prisma.recurringRule.deleteMany({ where: { userId } });
  await prisma.autoRule.deleteMany({ where: { userId } });
  await prisma.template.deleteMany({ where: { userId } });
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.label.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  return new NextResponse(null, { status: 204 });
}
