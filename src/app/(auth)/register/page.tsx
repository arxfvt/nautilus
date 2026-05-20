"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email.toLowerCase(), password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push("/login?registered=1");
  }

  const inputStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-primary)",
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5"
      style={{ background: "var(--color-base)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--color-primary)" }}>
            Nautilus
          </h1>
          <p className="text-sm" style={{ color: "var(--color-secondary)" }}>
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: "Name", value: name, setter: setName, type: "text", placeholder: "Your name", auto: "name" },
            { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "you@example.com", auto: "email" },
            { label: "Password", value: password, setter: setPassword, type: "password", placeholder: "Min. 8 characters", auto: "new-password" },
          ].map(({ label, value, setter, type, placeholder, auto }) => (
            <div key={label} className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>
                {label}
              </label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
                autoComplete={auto}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
              />
            </div>
          ))}

          {error && (
            <p className="text-xs px-1" style={{ color: "var(--color-expense)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--color-secondary)" }}>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium underline underline-offset-4"
            style={{ color: "var(--color-accent)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
