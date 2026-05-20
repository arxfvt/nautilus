import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfMonth, endOfMonth } from "date-fns";

const budgetSchema = z.object({
  name: z.string().min(1).max(80),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("UGX"),
  period: z.enum(["weekly", "monthly", "quarterly", "yearly", "custom"]).default("monthly"),
  startDate: z.string().datetime({ offset: true }).or(z.string().date()),
  endDate: z.string().datetime({ offset: true }).or(z.string().date()).optional().nullable(),
  accountFilter: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: {
      categories: { include: { category: { select: { id: true, name: true, icon: true, color: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Compute spent for each budget
  const result = await Promise.all(
    budgets.map(async (budget) => {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const catIds = budget.categories.map((bc) => bc.categoryId);

      const spent = await prisma.transaction.aggregate({
        where: {
          userId,
          type: "expense",
          date: { gte: start, lte: end },
          ...(catIds.length > 0 && { categoryId: { in: catIds } }),
          ...(budget.accountFilter.length > 0 && { accountId: { in: budget.accountFilter } }),
        },
        _sum: { amount: true },
      });

      const spentAmount = spent._sum.amount ?? 0;
      const percentage = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
      const status = percentage >= 100 ? "exceeded" : percentage >= 75 ? "warning" : "ok";

      return {
        id: budget.id,
        name: budget.name,
        amount: budget.amount,
        currency: budget.currency,
        period: budget.period,
        spent: spentAmount,
        percentage,
        status,
        categories: budget.categories.map((bc) => bc.category),
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { categoryIds, ...data } = parsed.data;

  const budget = await prisma.budget.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      userId: session.user.id,
      ...(categoryIds.length > 0 && {
        categories: {
          create: categoryIds.map((id) => ({ category: { connect: { id } } })),
        },
      }),
    },
  });

  return NextResponse.json(budget, { status: 201 });
}
