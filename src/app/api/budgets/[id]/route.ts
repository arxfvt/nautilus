import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const budgetSchema = z.object({
  name: z.string().min(1).max(80),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  period: z.enum(["weekly", "monthly", "quarterly", "yearly", "custom"]),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  accountFilter: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budget.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = budgetSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { categoryIds, ...data } = parsed.data;

  const updated = await prisma.budget.update({
    where: { id },
    data: {
      ...data,
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
      ...(categoryIds !== undefined && {
        categories: {
          deleteMany: {},
          create: categoryIds.map((cId) => ({ category: { connect: { id: cId } } })),
        },
      }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.budget.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.budget.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
