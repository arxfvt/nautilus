"use client";

import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
}

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full transition-all duration-150 ease-out active:scale-90 focus:outline-none"
      style={{
        background: "var(--color-accent)",
        border: "none",
      }}
      aria-label="Add transaction"
    >
      <Plus size={26} strokeWidth={2.5} color="#fff" />
    </button>
  );
}
