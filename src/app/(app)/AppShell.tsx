"use client";

import { useEffect } from "react";
import { flushPendingMutations } from "@/lib/sync";

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Flush on mount and whenever we come back online or re-focus the tab
    flushPendingMutations();

    const handleOnline = () => flushPendingMutations();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") flushPendingMutations();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <>{children}</>;
}
