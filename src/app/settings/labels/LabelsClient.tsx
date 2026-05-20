"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

interface Label {
  id: string;
  name: string;
  color: string | null;
}

const PRESET_COLORS = [
  "#F06060", "#F0A030", "#3DD68C", "#4F8EF8",
  "#9B8EF2", "#F06090", "#7A84A0", "#30C0F0",
];

interface LabelsClientProps {
  initialLabels: Label[];
}

export function LabelsClient({ initialLabels }: LabelsClientProps) {
  const router = useRouter();
  const [labels, setLabels] = useState(initialLabels);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[3]);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);

    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });

    if (res.ok) {
      const label = await res.json();
      setLabels((prev) => [...prev, label].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setShowNew(false);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this label?")) return;
    const res = await fetch(`/api/labels/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setLabels((prev) => prev.filter((l) => l.id !== id));
      router.refresh();
    }
  }

  const inputStyle = {
    background: "var(--color-elevated)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  return (
    <div className="px-4 pt-4 pb-10 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>Labels</h1>
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
        <form
          onSubmit={handleAdd}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)" }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Label name"
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="w-7 h-7 rounded-full transition-all active:scale-90"
                style={{
                  background: c,
                  outline: newColor === c ? `2px solid ${c}` : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="flex-1 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: "var(--color-surface)", color: "var(--color-secondary)", border: "1px solid var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      )}

      {labels.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--color-secondary)" }}>
          No labels yet.
        </p>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {labels.map((label, i) => (
            <div
              key={label.id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{
                background: "var(--color-surface)",
                borderBottom: i < labels.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: label.color ?? "var(--color-accent)" }}
              />
              <p className="flex-1 text-sm" style={{ color: "var(--color-primary)" }}>{label.name}</p>
              <button
                onClick={() => handleDelete(label.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90"
                style={{ color: "var(--color-expense)" }}
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
