"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
}

const PRESET_COLORS = [
  "#F06060", "#F0A030", "#3DD68C", "#4F8EF8",
  "#9B8EF2", "#F06090", "#7A84A0", "#30C0F0",
];

interface NewCategoryFormProps {
  onSave: (data: { name: string; type: string; icon: string; color: string }) => Promise<void>;
  onCancel: () => void;
}

function NewCategoryForm({ onSave, onCancel }: NewCategoryFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, type, icon, color });
    setSaving(false);
  }

  const inputStyle = {
    background: "var(--color-elevated)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-4 space-y-3" style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)" }}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("expense")}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
          style={{
            background: type === "expense" ? "rgba(240,96,96,0.15)" : "var(--color-surface)",
            color: type === "expense" ? "var(--color-expense)" : "var(--color-secondary)",
            border: `1px solid ${type === "expense" ? "rgba(240,96,96,0.4)" : "var(--color-border)"}`,
          }}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
          style={{
            background: type === "income" ? "rgba(61,214,140,0.15)" : "var(--color-surface)",
            color: type === "income" ? "var(--color-income)" : "var(--color-secondary)",
            border: `1px solid ${type === "income" ? "rgba(61,214,140,0.4)" : "var(--color-border)"}`,
          }}
        >
          Income
        </button>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Category name"
        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
        style={inputStyle}
      />

      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Emoji"
          maxLength={4}
          className="w-16 px-3 py-3 rounded-xl text-center text-xl outline-none"
          style={inputStyle}
        />
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-all active:scale-90"
              style={{
                background: c,
                outline: color === c ? `2px solid ${c}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm transition-all"
          style={{ background: "var(--color-surface)", color: "var(--color-secondary)", border: "1px solid var(--color-border)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          {saving ? "Saving…" : "Add"}
        </button>
      </div>
    </form>
  );
}

interface CategoriesClientProps {
  initialCategories: Category[];
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [showNew, setShowNew] = useState(false);

  const expenses = categories.filter((c) => c.type === "expense");
  const income = categories.filter((c) => c.type === "income");

  async function handleAdd(data: { name: string; type: string; icon: string; color: string }) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, icon: data.icon || null }),
    });
    if (res.ok) {
      const newCat = await res.json();
      setCategories((prev) => [...prev, newCat]);
      setShowNew(false);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    }
  }

  function renderList(cats: Category[], title: string) {
    return (
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-secondary)" }}>
          {title}
        </h2>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {cats.map((cat, i) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{
                background: "var(--color-surface)",
                borderBottom: i < cats.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: cat.color ?? "var(--color-accent)" }}
              />
              <span className="text-base leading-none">{cat.icon ?? "📦"}</span>
              <p className="flex-1 text-sm" style={{ color: "var(--color-primary)" }}>{cat.name}</p>
              {!cat.isDefault && (
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90"
                  style={{ color: "var(--color-expense)" }}
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {cats.length === 0 && (
            <p className="px-4 py-4 text-sm" style={{ color: "var(--color-secondary)" }}>No categories.</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="px-4 pt-4 pb-10 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>Categories</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={15} />
          New
        </button>
      </div>

      {showNew && (
        <NewCategoryForm onSave={handleAdd} onCancel={() => setShowNew(false)} />
      )}

      {renderList(expenses, "Expense")}
      {renderList(income, "Income")}
    </div>
  );
}
