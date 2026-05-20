import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "@/components/shared/AccountForm";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const account = await prisma.account.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!account) notFound();

  return (
    <AccountForm
      initialData={{
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        openingBalance: account.openingBalance,
        color: account.color,
        icon: account.icon,
        includeInTotal: account.includeInTotal,
      }}
    />
  );
}
