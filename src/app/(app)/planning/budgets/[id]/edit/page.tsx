import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/layout/TopBar";
import { BudgetForm } from "@/components/planning/BudgetForm";

export default async function EditBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const budget = await prisma.budget.findFirst({
    where: { id, userId: session.user.id },
    include: { categories: true },
  });

  if (!budget) notFound();

  return (
    <>
      <TopBar showBack />
      <BudgetForm
        initialData={{
          id: budget.id,
          name: budget.name,
          amount: budget.amount,
          currency: budget.currency,
          period: budget.period,
          startDate: budget.startDate.toISOString(),
          endDate: budget.endDate?.toISOString(),
          categoryIds: budget.categories.map((bc) => bc.categoryId),
        }}
      />
    </>
  );
}
