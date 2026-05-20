"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
}

interface BudgetFormProps {
  initialData?: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    period: string;
    startDate: string;
    endDate?: string | null;
    categoryIds: string[];
  };
}

const PERIODS = ["weekly", "monthly", "quarterly", "yearly"] as const;
const CURRENCIES = ["UGX", "USD", "EUR", "GBP", "KES"];

export function BudgetForm({ initialData }: BudgetFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [amount, setAmount] = useState(initialData ? initialData.amount.toString() : "");
  const [currency, setCurrency] = useState(initialData?.currency ?? "UGX");
  const [period, setPeriod] = useState(initialData?.period ?? "monthly");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? initialData.startDate.slice(0, 10) : format(new Date(), "yyyy-MM-dd")
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialData?.categoryIds ?? []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setCategories(data.filter((c: Category) => c.type === "expense"));
    });
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name,
      amount: parseInt(amount || "0"),
      currency,
      period,
      startDate: new Date(startDate).toISOString(),
      categoryIds: selectedCategoryIds,
    };

    const url = isEdit ? `/api/budgets/${initialData.id}` : "/api/budgets";
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

    router.push("/planning");
    router.refresh();
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("Delete this budget?")) return;
    setLoading(true);
    const res = await fetch(`/api/budgets/${initialData.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      router.push("/planning");
      router.refresh();
    } else {
      setError("Could not delete budget.");
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-4 pb-10 space-y-5">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>
        {isEdit ? "Edit budget" : "New budget"}
      </h1>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Monthly food budget"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={inputStyle}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Limit amount</label>
        <div className="flex gap-2">
          <div className="relative flex-shrink-0 w-24">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-3 rounded-xl text-sm outline-none appearance-none pr-7"
              style={inputStyle}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-secondary)" }} />
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0"
            min="1"
            className="flex-1 px-4 py-3 rounded-xl text-sm font-mono outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Period</label>
        <div className="grid grid-cols-4 gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className="py-2.5 rounded-xl text-xs capitalize transition-all"
              style={{
                background: period === p ? "var(--color-elevated)" : "var(--color-surface)",
                border: `1px solid ${period === p ? "var(--color-accent)" : "var(--color-border)"}`,
                color: period === p ? "var(--color-accent)" : "var(--color-secondary)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
          style={inputStyle}
        />
      </div>

      {categories.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>
            Categories <span style={{ color: "var(--color-muted)" }}>(leave empty = all expenses)</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => {
              const selected = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition-all active:scale-95"
                  style={{
                    background: selected ? (cat.color ?? "var(--color-accent)") + "22" : "var(--color-surface)",
                    border: `1px solid ${selected ? (cat.color ?? "var(--color-accent)") + "88" : "var(--color-border)"}`,
                    color: selected ? (cat.color ?? "var(--color-accent)") : "var(--color-secondary)",
                  }}
                >
                  <span className="text-lg leading-none">{cat.icon ?? "📦"}</span>
                  <span className="truncate w-full text-center px-0.5">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs" style={{ color: "var(--color-expense)" }}>{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        {loading ? "Saving…" : isEdit ? "Save changes" : "Create budget"}
      </button>

      {isEdit && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--color-elevated)", color: "var(--color-expense)", border: "1px solid var(--color-border)" }}
        >
          Delete budget
        </button>
      )}
    </form>
  );
}
