import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const recurringRuleSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().int().positive(),
  currency: z.string().length(3).default("UGX"),
  accountId: z.string().min(1),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  note: z.string().max(200).optional().nullable(),
  frequency: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  reminderDays: z.number().int().min(0).max(30).default(0),
  autoConfirm: z.boolean().default(false),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.recurringRule.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
  });

  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = recurringRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // Verify account ownership
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

  const startDate = new Date(data.startDate);

  const rule = await prisma.recurringRule.create({
    data: {
      userId: session.user.id,
      name: data.name,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      accountId: data.accountId,
      toAccountId: data.toAccountId ?? null,
      categoryId: data.categoryId ?? null,
      note: data.note ?? null,
      frequency: data.frequency,
      startDate,
      endDate: data.endDate ? new Date(data.endDate) : null,
      nextDueDate: startDate,
      reminderDays: data.reminderDays,
      autoConfirm: data.autoConfirm,
      isActive: true,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
