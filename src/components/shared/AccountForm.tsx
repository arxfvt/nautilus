"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACCOUNT_TYPES = [
  { value: "cash",        label: "Cash",        icon: "💵" },
  { value: "checking",    label: "Checking",    icon: "🏦" },
  { value: "savings",     label: "Savings",     icon: "🏦" },
  { value: "credit_card", label: "Credit Card", icon: "💳" },
  { value: "investment",  label: "Investment",  icon: "📈" },
  { value: "loan",        label: "Loan",        icon: "📋" },
  { value: "other",       label: "Other",       icon: "💼" },
];

const PRESET_COLORS = [
  "#4F8EF8", "#3DD68C", "#F06060", "#F0A030",
  "#9B8EF2", "#F06090", "#30C0F0", "#A0C840",
];

const CURRENCIES = ["UGX", "USD", "EUR", "GBP", "KES", "TZS"];

interface AccountFormProps {
  initialData?: {
    id: string;
    name: string;
    type: string;
    currency: string;
    openingBalance: number;
    color?: string | null;
    icon?: string | null;
    includeInTotal: boolean;
  };
}

export function AccountForm({ initialData }: AccountFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState(initialData?.type ?? "cash");
  const [currency, setCurrency] = useState(initialData?.currency ?? "UGX");
  const [openingBalance, setOpeningBalance] = useState(
    initialData ? (initialData.openingBalance / 1).toString() : "0"
  );
  const [color, setColor] = useState(initialData?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState(initialData?.icon ?? "");
  const [includeInTotal, setIncludeInTotal] = useState(initialData?.includeInTotal ?? true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const balanceInt = Math.round(parseFloat(openingBalance || "0"));

    const payload = { name, type, currency, openingBalance: balanceInt, color, icon: icon || null, includeInTotal };
    const url = isEdit ? `/api/accounts/${initialData.id}` : "/api/accounts";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.formErrors?.[0] ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push("/settings/accounts");
    router.refresh();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Archive or delete this account?")) return;
    setLoading(true);

    const res = await fetch(`/api/accounts/${initialData.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/settings/accounts");
      router.refresh();
    } else {
      setError("Could not delete account.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-4 pb-10 space-y-5">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>
        {isEdit ? "Edit account" : "New account"}
      </h1>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Cash wallet"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Type</label>
        <div className="grid grid-cols-4 gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition-all active:scale-95"
              style={{
                background: type === t.value ? "var(--color-elevated)" : "var(--color-surface)",
                border: `1px solid ${type === t.value ? "var(--color-accent)" : "var(--color-border)"}`,
                color: type === t.value ? "var(--color-accent)" : "var(--color-secondary)",
              }}
            >
              <span className="text-lg">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Currency</label>
        <div className="flex gap-2 flex-wrap">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className="px-3 py-2 rounded-lg text-sm font-mono transition-all active:scale-95"
              style={{
                background: currency === c ? "var(--color-elevated)" : "var(--color-surface)",
                border: `1px solid ${currency === c ? "var(--color-accent)" : "var(--color-border)"}`,
                color: currency === c ? "var(--color-accent)" : "var(--color-secondary)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Opening balance */}
      {!isEdit && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>
            Opening balance
          </label>
          <input
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
          />
        </div>
      )}

      {/* Color */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Color</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-all active:scale-90"
              style={{
                background: c,
                outline: color === c ? `3px solid ${c}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Icon (emoji) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>
          Icon (emoji, optional)
        </label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="e.g. 💵"
          maxLength={4}
          className="w-24 px-4 py-3 rounded-xl text-center text-xl outline-none"
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
        />
      </div>

      {/* Include in total */}
      <div
        className="flex items-center justify-between px-4 py-4 rounded-xl"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
            Include in net worth
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-secondary)" }}>
            Count this account in your total balance
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={includeInTotal}
          onClick={() => setIncludeInTotal(!includeInTotal)}
          className="relative w-12 h-6 rounded-full transition-all duration-200"
          style={{ background: includeInTotal ? "var(--color-accent)" : "var(--color-border-strong)" }}
        >
          <span
            className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200"
            style={{ left: includeInTotal ? "calc(100% - 20px)" : "4px" }}
          />
        </button>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--color-expense)" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        {loading ? "Saving…" : isEdit ? "Save changes" : "Create account"}
      </button>

      {isEdit && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--color-elevated)", color: "var(--color-expense)", border: "1px solid var(--color-border)" }}
        >
          Delete account
        </button>
      )}
    </form>
  );
}
