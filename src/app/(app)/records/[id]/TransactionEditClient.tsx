"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDown, Trash2 } from "lucide-react";
import { fromMinorUnits, toMinorUnits, getCurrencyDecimals } from "@/lib/currency";

interface Label {
  id: string;
  name: string;
  color?: string | null;
}

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

interface TransactionData {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  date: string;
  note?: string | null;
  isPending: boolean;
  labelIds: string[];
}

interface Props {
  transaction: TransactionData;
  accounts: Account[];
  categories: Category[];
}

type TxType = "expense" | "income" | "transfer";

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

export function TransactionEditClient({ transaction, accounts, categories }: Props) {
  const router = useRouter();

  const [type, setType] = useState<TxType>(transaction.type);
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [toAccountId, setToAccountId] = useState(transaction.toAccountId ?? "");
  const [categoryId, setCategoryId] = useState(transaction.categoryId ?? "");
  const [date, setDate] = useState(transaction.date);
  const [note, setNote] = useState(transaction.note ?? "");
  const [isPending, setIsPending] = useState(transaction.isPending);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const currency = selectedAccount?.currency ?? transaction.currency;
  const decimals = getCurrencyDecimals(currency);
  const [amountStr, setAmountStr] = useState(
    String(fromMinorUnits(transaction.amount, transaction.currency))
  );

  const [labelIds, setLabelIds] = useState<string[]>(transaction.labelIds);
  const [allLabels, setAllLabels] = useState<Label[]>([]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/labels").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setAllLabels(data);
    });
  }, []);

  function toggleLabel(id: string) {
    setLabelIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const filteredCategories = categories.filter(
    (c) => type === "transfer" ? false : c.type === type
  );

  const accentForType = TYPE_COLORS[type];

  const inputStyle = {
    background: "var(--color-elevated)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const numericAmount = parseFloat(amountStr || "0");
    if (!numericAmount || numericAmount <= 0) { setError("Enter an amount"); return; }
    if (!accountId) { setError("Select an account"); return; }
    if (type === "transfer" && !toAccountId) { setError("Select destination account"); return; }

    setSaving(true);

    const payload = {
      type,
      amount: toMinorUnits(numericAmount, currency),
      currency,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : null,
      categoryId: type === "transfer" ? null : (categoryId || null),
      date: new Date(date).toISOString(),
      note: note.trim() || null,
      isPending,
      labelIds,
    };

    const res = await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    router.push("/records");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);

    const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });

    if (!res.ok) {
      setError("Failed to delete.");
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }

    router.push("/records");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col min-h-[calc(100vh-56px)]">
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
        {/* Amount */}
        <div className="text-center py-4">
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
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
              To
            </label>
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

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
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

        {/* Labels */}
        {allLabels.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>Labels</p>
            <div className="flex flex-wrap gap-2">
              {allLabels.map((label) => {
                const selected = labelIds.includes(label.id);
                const color = label.color ?? "var(--color-accent)";
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                    style={{
                      background: selected ? color + "22" : "var(--color-surface)",
                      color: selected ? color : "var(--color-secondary)",
                      border: `1px solid ${selected ? color + "88" : "var(--color-border)"}`,
                    }}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending toggle */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <span className="text-sm" style={{ color: "var(--color-primary)" }}>Mark as pending</span>
          <button
            type="button"
            role="switch"
            aria-checked={isPending}
            onClick={() => setIsPending(!isPending)}
            className="relative w-11 h-6 rounded-full transition-all duration-200"
            style={{ background: isPending ? "var(--color-warning)" : "var(--color-border-strong)" }}
          >
            <span
              className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200"
              style={{ left: isPending ? "calc(100% - 20px)" : "4px" }}
            />
          </button>
        </div>

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
          {saving ? "Saving…" : "Save changes"}
        </button>

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
          {deleting ? "Deleting…" : confirmDelete ? "Tap again to confirm" : "Delete transaction"}
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
      </div>
    </form>
  );
}
