import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CurrencyPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { defaultCurrency: true },
  });

  const rates = await prisma.exchangeRate.findMany({
    where: { base: user?.defaultCurrency ?? "UGX" },
    orderBy: { target: "asc" },
  });

  return (
    <div className="px-4 pt-4 pb-10 space-y-5">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>Currency</h1>

      <p className="text-sm" style={{ color: "var(--color-secondary)" }}>
        Default currency: <span className="font-mono font-semibold" style={{ color: "var(--color-primary)" }}>{user?.defaultCurrency ?? "UGX"}</span>
      </p>

      {rates.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-secondary)" }}>
            Exchange rates
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
            {rates.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: "var(--color-surface)",
                  borderBottom: i < rates.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <span className="font-mono text-sm" style={{ color: "var(--color-primary)" }}>{r.base} → {r.target}</span>
                <span className="font-mono text-sm" style={{ color: "var(--color-secondary)" }}>{r.rate.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-center py-8" style={{ color: "var(--color-secondary)" }}>
          Exchange rates will appear here once fetched by the daily cron job.
        </p>
      )}
    </div>
  );
}
