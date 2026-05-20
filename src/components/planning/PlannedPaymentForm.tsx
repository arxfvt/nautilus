"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, Trash2 } from "lucide-react";
import { fromMinorUnits, toMinorUnits, getCurrencyDecimals } from "@/lib/currency";

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  color?: string | null;
  icon?: string | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  color?: string | null;
}

interface InitialData {
  id: string;
  name: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  note?: string | null;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  nextDueDate: string;
  reminderDays: number;
  autoConfirm: boolean;
  isActive: boolean;
}

interface PlannedPaymentFormProps {
  initialData?: InitialData;
}

type TxType = "income" | "expense" | "transfer";

const TYPE_TABS: { value: TxType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

const TYPE_COLORS: Record<TxType, string> = {
  expense: "var(--color-expense)",
  income: "var(--color-income)",
  transfer: "var(--color-transfer)",
};

const FREQUENCIES = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const CURRENCIES = ["UGX", "USD", "EUR", "GBP", "KES"];

export function PlannedPaymentForm({ initialData }: PlannedPaymentFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [type, setType] = useState<TxType>(initialData?.type ?? "expense");
  const [accountId, setAccountId] = useState(initialData?.accountId ?? "");
  const [toAccountId, setToAccountId] = useState(initialData?.toAccountId ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [currency, setCurrency] = useState(initialData?.currency ?? "UGX");
  const [amountStr, setAmountStr] = useState(
    initialData ? String(fromMinorUnits(initialData.amount, initialData.currency)) : ""
  );
  const [note, setNote] = useState(initialData?.note ?? "");
  const [frequency, setFrequency] = useState(initialData?.frequency ?? "monthly");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ?? format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(initialData?.endDate ?? "");
  const [reminderDays, setReminderDays] = useState(initialData?.reminderDays ?? 0);
  const [autoConfirm, setAutoConfirm] = useState(initialData?.autoConfirm ?? false);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setAccounts(data);
        if (!initialData && data.length > 0) setAccountId(data[0].id);
      }
    });
    fetch("/api/categories").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setCategories(data);
    });
  }, []);

  // Sync currency when account changes
  useEffect(() => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) setCurrency(acc.currency);
  }, [accountId, accounts]);

  const filteredCategories = categories.filter(
    (c) => type === "transfer" ? false : c.type === type
  );

  const decimals = getCurrencyDecimals(currency);
  const accentForType = TYPE_COLORS[type];

  const inputStyle = {
    background: "var(--color-elevated)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const numericAmount = parseFloat(amountStr || "0");
    if (!name.trim()) { setError("Enter a name"); return; }
    if (!numericAmount || numericAmount <= 0) { setError("Enter an amount"); return; }
    if (!accountId) { setError("Select an account"); return; }
    if (type === "transfer" && !toAccountId) { setError("Select destination account"); return; }

    setSaving(true);

    const payload = {
      name: name.trim(),
      type,
      amount: toMinorUnits(numericAmount, currency),
      currency,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : null,
      categoryId: type === "transfer" ? null : (categoryId || null),
      note: note.trim() || null,
      frequency,
      startDate,
      endDate: endDate || null,
      reminderDays,
      autoConfirm,
      ...(isEdit && { isActive }),
    };

    const url = isEdit ? `/api/recurring-rules/${initialData!.id}` : "/api/recurring-rules";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    router.push("/planning");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);

    const res = await fetch(`/api/recurring-rules/${initialData!.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete.");
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }

    router.push("/planning");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100vh-56px)]">
      {/* Type tabs */}
      <div
        className="flex rounded-xl p-1 mx-4 mt-4 mb-4"
        style={{ background: "var(--color-elevated)" }}
      >
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setType(tab.value); setCategoryId(""); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              background: type === tab.value ? TYPE_COLORS[tab.value] + "22" : "transparent",
              color: type === tab.value ? TYPE_COLORS[tab.value] : "var(--color-secondary)",
              border: type === tab.value ? `1px solid ${TYPE_COLORS[tab.value]}44` : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 space-y-4 pb-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rent, Netflix, Salary…"
            required
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* Amount */}
        <div className="text-center py-2">
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-secondary)" }}>
            {currency}
          </p>
          <input
            type="number"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            className="w-full text-center text-5xl font-mono bg-transparent border-none outline-none"
            style={{ color: accentForType }}
            step={decimals === 0 ? "1" : "0.01"}
            min="0"
          />
          <div
            className="h-0.5 mx-auto mt-2 rounded-full transition-all"
            style={{ background: accentForType, width: amountStr ? "100%" : "40%" }}
          />
        </div>

        {/* Frequency */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>Frequency</label>
          <div className="relative">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none pr-10"
              style={inputStyle}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-secondary)" }} />
          </div>
        </div>

        {/* Categories */}
        {type !== "transfer" && filteredCategories.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
              Category
            </p>
            <div className="grid grid-cols-4 gap-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id === categoryId ? "" : cat.id)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition-all active:scale-95"
                  style={{
                    background: categoryId === cat.id ? (cat.color ?? "var(--color-accent)") + "22" : "var(--color-surface)",
                    border: `1px solid ${categoryId === cat.id ? (cat.color ?? "var(--color-accent)") + "88" : "var(--color-border)"}`,
                    color: categoryId === cat.id ? (cat.color ?? "var(--color-accent)") : "var(--color-secondary)",
                  }}
                >
                  <span className="text-lg leading-none">{cat.icon ?? "📦"}</span>
                  <span className="truncate w-full text-center leading-tight px-0.5">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Account */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
            {type === "transfer" ? "From" : "Account"}
          </label>
          <div className="relative">
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none pr-10"
              style={inputStyle}
            >
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.icon ?? ""} {a.name} ({a.currency})</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-secondary)" }} />
          </div>
        </div>

        {/* To Account (transfer only) */}
        {type === "transfer" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>To</label>
            <div className="relative">
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none pr-10"
                style={inputStyle}
              >
                <option value="">Select account…</option>
                {accounts.filter((a) => a.id !== accountId).map((a) => (
                  <option key={a.id} value={a.id}>{a.icon ?? ""} {a.name} ({a.currency})</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-secondary)" }} />
            </div>
          </div>
        )}

        {/* Start date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
            style={inputStyle}
          />
        </div>

        {/* End date (optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
            End date <span style={{ color: "var(--color-muted)" }}>(optional)</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
            style={inputStyle}
          />
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>Note</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note…"
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {/* Reminder days */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>Reminder (days before)</label>
          <div className="relative">
            <select
              value={reminderDays}
              onChange={(e) => setReminderDays(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none appearance-none pr-10"
              style={inputStyle}
            >
              <option value={0}>No reminder</option>
              <option value={1}>1 day before</option>
              <option value={3}>3 days before</option>
              <option value={7}>7 days before</option>
              <option value={14}>14 days before</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-secondary)" }} />
          </div>
        </div>

        {/* Auto-confirm toggle */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div>
            <p className="text-sm" style={{ color: "var(--color-primary)" }}>Auto-confirm</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-secondary)" }}>Create transaction automatically when due</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoConfirm}
            onClick={() => setAutoConfirm(!autoConfirm)}
            className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
            style={{ background: autoConfirm ? "var(--color-accent)" : "var(--color-border-strong)" }}
          >
            <span
              className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200"
              style={{ left: autoConfirm ? "calc(100% - 20px)" : "4px" }}
            />
          </button>
        </div>

        {/* Active toggle (edit only) */}
        {isEdit && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-primary)" }}>Active</p>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className="relative w-11 h-6 rounded-full transition-all duration-200"
              style={{ background: isActive ? "var(--color-income)" : "var(--color-border-strong)" }}
            >
              <span
                className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200"
                style={{ left: isActive ? "calc(100% - 20px)" : "4px" }}
              />
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-center" style={{ color: "var(--color-expense)" }}>{error}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-8 pt-2 space-y-3">
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: accentForType, color: "#fff" }}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </button>

        {isEdit && (
          <>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="w-full py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: confirmDelete ? "var(--color-expense)" : "var(--color-surface)",
                color: confirmDelete ? "#fff" : "var(--color-expense)",
                border: `1px solid ${confirmDelete ? "var(--color-expense)" : "var(--color-expense)44"}`,
              }}
            >
              <Trash2 size={15} />
              {deleting ? "Deleting…" : confirmDelete ? "Tap again to confirm" : "Delete rule"}
            </button>

            {confirmDelete && !deleting && (
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="w-full py-2 text-xs"
                style={{ color: "var(--color-secondary)" }}
              >
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </form>
  );
}
