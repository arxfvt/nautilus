import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LabelsClient } from "./LabelsClient";

export default async function LabelsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const labels = await prisma.label.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  return <LabelsClient initialLabels={labels} />;
}
