import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";
import { PlannedPaymentForm } from "@/components/planning/PlannedPaymentForm";

export default async function NewPlannedPaymentPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      <TopBar showBack title="New planned payment" />
      <PlannedPaymentForm />
    </>
  );
}
