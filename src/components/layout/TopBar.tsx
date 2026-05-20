"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Settings } from "lucide-react";
import { SyncIndicator } from "./SyncIndicator";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  showActions?: boolean; // bell + gear, for dashboard
}

export function TopBar({ title, showBack = false, showActions = false }: TopBarProps) {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 h-14"
      style={{
        background: "rgba(8, 11, 20, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-2 min-w-[40px]">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 active:scale-95"
            style={{ color: "var(--color-secondary)" }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </div>

      {/* Centre */}
      {title && (
        <span
          className="absolute left-1/2 -translate-x-1/2 text-sm font-medium tracking-wide"
          style={{ color: "var(--color-primary)" }}
        >
          {title}
        </span>
      )}

      {/* Right */}
      <div className="flex items-center gap-1">
        <SyncIndicator />
        {showActions && (
          <>
            <Link
              href="/settings/notifications"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 active:scale-95"
              style={{ color: "var(--color-secondary)" }}
              aria-label="Notifications"
            >
              <Bell size={18} />
            </Link>
            <Link
              href="/settings"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 active:scale-95"
              style={{ color: "var(--color-secondary)" }}
              aria-label="Settings"
            >
              <Settings size={18} />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
