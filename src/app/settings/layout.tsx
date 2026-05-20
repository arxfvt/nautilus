import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-dvh" style={{ background: "var(--color-base)" }}>
      <TopBar showBack />
      <main className="pb-10">{children}</main>
    </div>
  );
}
