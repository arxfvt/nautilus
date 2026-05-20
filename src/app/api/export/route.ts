import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/currency";
import { format } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    include: {
      account: { select: { name: true } },
      toAccount: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const headers = ["Date", "Type", "Amount", "Currency", "Account", "To Account", "Category", "Note", "Pending"];
  const rows = transactions.map((t) => [
    format(t.date, "yyyy-MM-dd"),
    t.type,
    formatAmount(t.amount, t.currency),
    t.currency,
    t.account.name,
    t.toAccount?.name ?? "",
    t.category?.name ?? "",
    t.note?.replace(/,/g, ";") ?? "",
    t.isPending ? "yes" : "no",
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="nautilus-export.csv"`,
    },
  });
}
