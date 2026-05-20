import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="px-4 pt-4 pb-10 space-y-4">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>Notifications</h1>

      {notifications.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-mono text-5xl mb-3" style={{ color: "var(--color-muted)" }}>—</p>
          <p className="text-sm" style={{ color: "var(--color-secondary)" }}>No notifications.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {notifications.map((n, i) => (
            <div
              key={n.id}
              className="px-4 py-3.5"
              style={{
                background: n.isRead ? "var(--color-surface)" : "var(--color-elevated)",
                borderBottom: i < notifications.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{n.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-secondary)" }}>{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
