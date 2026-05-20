import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/layout/TopBar";
import { PlannedPaymentForm } from "@/components/planning/PlannedPaymentForm";

export default async function EditPlannedPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const rule = await prisma.recurringRule.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!rule) notFound();

  return (
    <>
      <TopBar showBack title="Edit planned payment" />
      <PlannedPaymentForm
        initialData={{
          id: rule.id,
          name: rule.name,
          type: rule.type as "income" | "expense" | "transfer",
          amount: rule.amount,
          currency: rule.currency,
          accountId: rule.accountId,
          toAccountId: rule.toAccountId,
          categoryId: rule.categoryId,
          note: rule.note,
          frequency: rule.frequency,
          startDate: rule.startDate.toISOString().slice(0, 10),
          endDate: rule.endDate ? rule.endDate.toISOString().slice(0, 10) : null,
          nextDueDate: rule.nextDueDate.toISOString().slice(0, 10),
          reminderDays: rule.reminderDays,
          autoConfirm: rule.autoConfirm,
          isActive: rule.isActive,
        }}
      />
    </>
  );
}
