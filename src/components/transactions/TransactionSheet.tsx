"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { TransactionForm } from "./TransactionForm";

interface TransactionSheetProps {
  open: boolean;
  onClose: () => void;
}

export function TransactionSheet({ open, onClose }: TransactionSheetProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(8, 11, 20, 0.8)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderBottom: "none",
          maxHeight: "92dvh",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 250ms ease-out",
        }}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
          <div
            className="w-10 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3"
            style={{ background: "var(--color-border-strong)" }}
          />
          <div className="w-8" />
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            Add Transaction
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{ background: "var(--color-elevated)" }}
            aria-label="Close"
          >
            <X size={16} style={{ color: "var(--color-secondary)" }} />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {open && <TransactionForm onSuccess={onClose} />}
        </div>
      </div>
    </>
  );
}
