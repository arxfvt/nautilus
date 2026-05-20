"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";

export default function DataPage() {
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    const res = await fetch("/api/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nautilus-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAccount() {
    if (!confirm("This will permanently delete your account and all data. This cannot be undone. Are you sure?")) return;
    if (!confirm("Final confirmation: delete all your data?")) return;
    setDeleting(true);

    const res = await fetch("/api/settings/account", { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/login";
    } else {
      alert("Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 pt-4 pb-10 space-y-5">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>
        Personal data &amp; privacy
      </h1>

      <div className="space-y-3">
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-primary)" }}>
            Export data
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--color-secondary)" }}>
            Download all your transactions as a CSV file.
          </p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: "var(--color-elevated)", color: "var(--color-primary)", border: "1px solid var(--color-border)" }}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--color-surface)", border: "1px solid rgba(240,96,96,0.3)" }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-expense)" }}>
            Delete account
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--color-secondary)" }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(240,96,96,0.1)", color: "var(--color-expense)", border: "1px solid rgba(240,96,96,0.3)" }}
          >
            <Trash2 size={15} />
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}
