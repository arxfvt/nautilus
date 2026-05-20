import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";
import { SignOutButton } from "./SignOutButton";
import {
  List, Settings, BarChart2, CalendarRange, User,
} from "lucide-react";

const navItems = [
  { href: "/records",    icon: List,          label: "Records",    sub: "Full transaction history" },
  { href: "/statistics", icon: BarChart2,     label: "Statistics", sub: "Income, expenses, trends" },
  { href: "/planning",   icon: CalendarRange, label: "Planning",   sub: "Budgets & planned payments" },
  { href: "/settings",   icon: Settings,      label: "Settings",   sub: "Accounts, categories, labels" },
];

export default async function MorePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const name = session.user.name ?? null;
  const email = session.user.email ?? "";
  // Initials for the avatar
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : email[0]?.toUpperCase() ?? "?";

  return (
    <>
      <TopBar title="More" />
      <div className="px-4 pt-6 pb-32 space-y-6">
        {/* Profile card */}
        <div
          className="flex items-center gap-4 px-4 py-4 rounded-2xl"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full text-base font-semibold flex-shrink-0"
            style={{ background: "var(--color-accent)22", color: "var(--color-accent)" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            {name && (
              <p className="text-sm font-semibold truncate" style={{ color: "var(--color-primary)" }}>{name}</p>
            )}
            <p className="text-xs truncate" style={{ color: "var(--color-secondary)" }}>{email}</p>
          </div>
          <Link
            href="/settings/general"
            className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all active:scale-95"
            style={{ background: "var(--color-elevated)", color: "var(--color-secondary)" }}
            aria-label="Edit profile"
          >
            <User size={15} />
          </Link>
        </div>

        {/* Navigation links */}
        <div className="space-y-1">
          {navItems.map(({ href, icon: Icon, label, sub }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 px-3 py-4 rounded-xl transition-all duration-150 active:scale-[0.98]"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <span
                className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{ background: "var(--color-elevated)" }}
              >
                <Icon size={18} style={{ color: "var(--color-accent)" }} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{label}</p>
                <p className="text-xs truncate" style={{ color: "var(--color-secondary)" }}>{sub}</p>
              </div>
              <span className="ml-auto text-lg" style={{ color: "var(--color-muted)" }}>›</span>
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <SignOutButton />
      </div>
    </>
  );
}
