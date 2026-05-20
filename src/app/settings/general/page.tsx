import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GeneralSettingsClient } from "./GeneralSettingsClient";

export default async function GeneralSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, defaultCurrency: true, dateFormat: true, weekStart: true, timezone: true },
  });

  if (!user) redirect("/login");

  return <GeneralSettingsClient user={user} />;
}
