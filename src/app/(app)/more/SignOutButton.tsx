"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-150 active:scale-[0.98]"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
        style={{ background: "rgba(240, 96, 96, 0.10)" }}
      >
        <LogOut size={18} style={{ color: "var(--color-expense)" }} />
      </span>
      <span className="text-sm font-medium" style={{ color: "var(--color-expense)" }}>Sign out</span>
    </button>
  );
}
