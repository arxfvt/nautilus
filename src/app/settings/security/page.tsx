"use client";

import { useState } from "react";

export default function SecurityPage() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPass !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (newPass.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/settings/security", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
    });

    if (res.ok) {
      setMessage("Password changed successfully.");
      setCurrent("");
      setNewPass("");
      setConfirm("");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to change password.");
    }
    setSaving(false);
  }

  const inputStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-4 pb-10 space-y-5">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>Security</h1>

      {[
        { label: "Current password", value: current, setter: setCurrent },
        { label: "New password", value: newPass, setter: setNewPass },
        { label: "Confirm new password", value: confirm, setter: setConfirm },
      ].map(({ label, value, setter }) => (
        <div key={label} className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>{label}</label>
          <input
            type="password"
            value={value}
            onChange={(e) => setter(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>
      ))}

      {error && <p className="text-xs" style={{ color: "var(--color-expense)" }}>{error}</p>}
      {message && <p className="text-xs" style={{ color: "var(--color-income)" }}>{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        {saving ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
