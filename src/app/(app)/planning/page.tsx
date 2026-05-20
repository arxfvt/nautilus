import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, format, isPast, isToday } from "date-fns";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { formatAmount } from "@/lib/currency";

interface BudgetRow {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: string;
  spent: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
  categories: { id: string; name: string; icon: string | null; color: string | null }[];
}

const FREQ_LABELS: Record<string, string> = {
  once: "Once",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const TYPE_COLORS: Record<string, string> = {
  income: "var(--color-income)",
  expense: "var(--color-expense)",
  transfer: "var(--color-transfer)",
};

export default async function PlanningPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const [budgets, recurringRules] = await Promise.all([
    prisma.budget.findMany({
      where: { userId },
      include: {
        categories: { include: { category: { select: { id: true, name: true, icon: true, color: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.recurringRule.findMany({
      where: { userId },
      orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
    }),
  ]);

  const rows: BudgetRow[] = await Promise.all(
    budgets.map(async (budget) => {
      const catIds = budget.categories.map((bc) => bc.categoryId);
      const agg = await prisma.transaction.aggregate({
        where: {
          userId,
          type: "expense",
          date: { gte: start, lte: end },
          ...(catIds.length > 0 && { categoryId: { in: catIds } }),
          ...(budget.accountFilter.length > 0 && { accountId: { in: budget.accountFilter } }),
        },
        _sum: { amount: true },
      });

      const spentAmount = agg._sum.amount ?? 0;
      const pct = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
      const status: BudgetRow["status"] = pct >= 100 ? "exceeded" : pct >= 75 ? "warning" : "ok";

      return {
        id: budget.id,
        name: budget.name,
        amount: budget.amount,
        currency: budget.currency,
        period: budget.period,
        spent: spentAmount,
        percentage: Math.min(100, pct),
        status,
        categories: budget.categories.map((bc) => bc.category),
      };
    })
  );

  const statusColor = {
    ok: "var(--color-income)",
    warning: "var(--color-warning)",
    exceeded: "var(--color-expense)",
  };

  return (
    <>
      <TopBar title="Planning" />
      <div className="px-4 pt-4 pb-32 space-y-8">
        {/* Budgets section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
              Budgets — {now.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
            <Link
              href="/planning/budgets/new"
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              <Plus size={14} />
              New
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-mono text-4xl mb-2" style={{ color: "var(--color-muted)" }}>—</p>
              <p className="text-sm mb-2" style={{ color: "var(--color-secondary)" }}>No budgets yet.</p>
              <Link href="/planning/budgets/new" className="text-sm underline underline-offset-4" style={{ color: "var(--color-accent)" }}>
                Create your first budget ↗
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((budget) => (
                <Link
                  key={budget.id}
                  href={`/planning/budgets/${budget.id}/edit`}
                  className="block rounded-2xl px-4 py-4 transition-all active:scale-[0.99]"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{budget.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-secondary)" }}>
                        {budget.categories.map((c) => c.icon ?? "📦").slice(0, 4).join(" ")} {budget.period}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold" style={{ color: statusColor[budget.status] }}>
                        {formatAmount(budget.spent, budget.currency)}
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--color-secondary)" }}>
                        / {formatAmount(budget.amount, budget.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${budget.percentage}%`, background: statusColor[budget.status] }}
                    />
                  </div>
                  <p className="font-mono text-xs mt-1.5 text-right" style={{ color: statusColor[budget.status] }}>
                    {budget.percentage.toFixed(0)}%
                    {budget.status === "exceeded" ? " — Exceeded" : budget.status === "warning" ? " — Warning" : ""}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Planned payments section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
              Planned Payments
            </h2>
            <Link
              href="/planning/planned/new"
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{ background: "var(--color-surface)", color: "var(--color-primary)", border: "1px solid var(--color-border)" }}
            >
              <Plus size={14} />
              New
            </Link>
          </div>

          {recurringRules.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-mono text-4xl mb-2" style={{ color: "var(--color-muted)" }}>—</p>
              <p className="text-sm mb-2" style={{ color: "var(--color-secondary)" }}>No planned payments yet.</p>
              <Link href="/planning/planned/new" className="text-sm underline underline-offset-4" style={{ color: "var(--color-accent)" }}>
                Add a recurring payment ↗
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              {recurringRules.map((rule, i) => {
                const dueDate = new Date(rule.nextDueDate);
                const isOverdue = !isToday(dueDate) && isPast(dueDate) && rule.isActive;
                const isDueToday = isToday(dueDate) && rule.isActive;
                const typeColor = TYPE_COLORS[rule.type] ?? "var(--color-secondary)";

                return (
                  <Link
                    key={rule.id}
                    href={`/planning/planned/${rule.id}/edit`}
                    className="flex items-center gap-3 px-4 py-3.5 relative active:opacity-70 transition-opacity"
                    style={{
                      background: "var(--color-surface)",
                      borderBottom: i < recurringRules.length - 1 ? "1px solid var(--color-border)" : "none",
                      opacity: rule.isActive ? 1 : 0.5,
                    }}
                  >
                    <span
                      className="absolute left-0 top-0 bottom-0 w-0.5"
                      style={{ background: rule.isActive ? typeColor : "var(--color-border)" }}
                    />

                    <div className="flex-1 min-w-0 pl-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm truncate" style={{ color: "var(--color-primary)" }}>
                          {rule.name}
                        </p>
                        {!rule.isActive && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "var(--color-border)", color: "var(--color-muted)", flexShrink: 0 }}
                          >
                            Paused
                          </span>
                        )}
                        {rule.autoConfirm && rule.isActive && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "var(--color-accent)22", color: "var(--color-accent)", flexShrink: 0 }}
                          >
                            Auto
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-secondary)" }}>
                        {FREQ_LABELS[rule.frequency] ?? rule.frequency}
                        {rule.isActive && (
                          <span style={{ color: isOverdue ? "var(--color-expense)" : isDueToday ? "var(--color-warning)" : "var(--color-muted)" }}>
                            {" · "}
                            {isOverdue ? "Overdue" : isDueToday ? "Due today" : `Due ${format(dueDate, "d MMM")}`}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-sm font-medium" style={{ color: typeColor }}>
                        {rule.type === "expense" ? "−" : rule.type === "income" ? "+" : ""}
                        {formatAmount(rule.amount, rule.currency)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
