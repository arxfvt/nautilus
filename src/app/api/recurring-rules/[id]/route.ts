import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  accountId: z.string().min(1).optional(),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  note: z.string().max(200).optional().nullable(),
  frequency: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  nextDueDate: z.string().optional(),
  reminderDays: z.number().int().min(0).max(30).optional(),
  autoConfirm: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rule = await prisma.recurringRule.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(rule);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rule = await prisma.recurringRule.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const updated = await prisma.recurringRule.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rule = await prisma.recurringRule.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
