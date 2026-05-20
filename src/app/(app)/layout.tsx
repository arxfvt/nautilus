import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppShell } from "./AppShell";
import { TransactionSheetWrapper } from "./TransactionSheetWrapper";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <AppShell>
      <main className="flex-1">{children}</main>
      <BottomNav />
      <TransactionSheetWrapper />
    </AppShell>
  );
}
