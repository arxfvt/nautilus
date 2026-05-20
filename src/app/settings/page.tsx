import Link from "next/link";
import {
  SlidersHorizontal, Wallet, Coins, Tag, FolderOpen,
  FileText, Bell, ShieldCheck, Lock, Download
} from "lucide-react";

const sections = [
  { href: "/settings/general",       icon: SlidersHorizontal, label: "General" },
  { href: "/settings/accounts",      icon: Wallet,            label: "Accounts" },
  { href: "/settings/currency",      icon: Coins,             label: "Currency" },
  { href: "/settings/categories",    icon: FolderOpen,        label: "Categories" },
  { href: "/settings/labels",        icon: Tag,               label: "Labels" },
  { href: "/settings/templates",     icon: FileText,          label: "Templates" },
  { href: "/settings/notifications", icon: Bell,              label: "Notifications" },
  { href: "/settings/security",      icon: Lock,              label: "Security" },
  { href: "/settings/data",          icon: Download,          label: "Personal data & privacy" },
];

export default function SettingsPage() {
  return (
    <div className="px-4 pt-4 pb-10">
      <h1 className="text-2xl font-semibold mb-5" style={{ color: "var(--color-primary)" }}>
        Settings
      </h1>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--color-border)" }}
      >
        {sections.map(({ href, icon: Icon, label }, i) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-4 py-4 transition-all duration-150 active:scale-[0.99]"
            style={{
              background: "var(--color-surface)",
              borderBottom: i < sections.length - 1 ? "1px solid var(--color-border)" : "none",
            }}
          >
            <Icon size={18} style={{ color: "var(--color-accent)" }} />
            <span className="flex-1 text-sm" style={{ color: "var(--color-primary)" }}>
              {label}
            </span>
            <span style={{ color: "var(--color-muted)" }}>›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
