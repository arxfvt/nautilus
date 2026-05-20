"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface User {
  name: string | null;
  email: string;
  defaultCurrency: string;
  dateFormat: string;
  weekStart: string;
  timezone: string;
}

const CURRENCIES = ["UGX", "USD", "EUR", "GBP", "KES", "TZS"];
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const WEEK_STARTS = [{ value: "monday", label: "Monday" }, { value: "sunday", label: "Sunday" }];

interface GeneralSettingsClientProps {
  user: User;
}

export function GeneralSettingsClient({ user }: GeneralSettingsClientProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [defaultCurrency, setDefaultCurrency] = useState(user.defaultCurrency);
  const [dateFormat, setDateFormat] = useState(user.dateFormat);
  const [weekStart, setWeekStart] = useState(user.weekStart);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/settings/general", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || null, defaultCurrency, dateFormat, weekStart }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } else {
      setError("Failed to save settings.");
    }
    setSaving(false);
  }

  const inputStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  const selectStyle = { ...inputStyle, appearance: "none" as const, paddingRight: "2.5rem" };

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-4 pb-10 space-y-5">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>General</h1>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Display name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={inputStyle}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Email</label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full px-4 py-3 rounded-xl text-sm outline-none opacity-50"
          style={inputStyle}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Default currency</label>
        <div className="flex gap-2 flex-wrap">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDefaultCurrency(c)}
              className="px-3 py-2 rounded-lg text-sm font-mono transition-all active:scale-95"
              style={{
                background: defaultCurrency === c ? "var(--color-elevated)" : "var(--color-surface)",
                border: `1px solid ${defaultCurrency === c ? "var(--color-accent)" : "var(--color-border)"}`,
                color: defaultCurrency === c ? "var(--color-accent)" : "var(--color-secondary)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Date format</label>
        <div className="relative">
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
            style={selectStyle}
          >
            {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-secondary)" }} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Week starts on</label>
        <div className="flex gap-2">
          {WEEK_STARTS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setWeekStart(value)}
              className="flex-1 py-2.5 rounded-xl text-sm transition-all"
              style={{
                background: weekStart === value ? "var(--color-elevated)" : "var(--color-surface)",
                border: `1px solid ${weekStart === value ? "var(--color-accent)" : "var(--color-border)"}`,
                color: weekStart === value ? "var(--color-accent)" : "var(--color-secondary)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: "var(--color-expense)" }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: saved ? "var(--color-income)" : "var(--color-accent)", color: "#fff" }}
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </form>
  );
}
