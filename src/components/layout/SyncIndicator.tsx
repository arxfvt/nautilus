"use client";

import { useEffect, useState } from "react";
import { getPendingCount } from "@/lib/sync";

type SyncState = "idle" | "pending" | "synced";

export function SyncIndicator() {
  const [state, setState] = useState<SyncState>("idle");

  useEffect(() => {
    let synced: ReturnType<typeof setTimeout>;

    async function check() {
      const count = await getPendingCount();
      if (count > 0) {
        setState("pending");
      } else if (state === "pending") {
        setState("synced");
        synced = setTimeout(() => setState("idle"), 3000);
      }
    }

    check();
    const interval = setInterval(check, 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(synced);
    };
  }, [state]);

  if (state === "idle") return null;

  return (
    <span className="flex items-center justify-center w-8 h-8" aria-label={state === "pending" ? "Syncing" : "Synced"}>
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: state === "pending" ? "var(--color-warning)" : "var(--color-income)",
          animation: state === "pending" ? "pulse 1.4s ease-in-out infinite" : "none",
        }}
      />
    </span>
  );
}
