"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarClock, BarChart2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/planning", icon: CalendarClock, label: "Planning" },
  { href: "/statistics", icon: BarChart2, label: "Statistics" },
  { href: "/more", icon: MoreHorizontal, label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className="flex items-center gap-1 px-5 py-3 rounded-full pointer-events-auto"
        style={{
          background: "rgba(15, 19, 32, 0.88)",
          border: "1px solid var(--color-border-strong)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "relative flex flex-col items-center justify-center w-12 h-10 rounded-xl transition-all duration-150 ease-out active:scale-95",
                active ? "opacity-100" : "opacity-40 hover:opacity-60"
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.8}
                style={{ color: active ? "var(--color-accent)" : "var(--color-muted)" }}
              />
              {active && (
                <span
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
