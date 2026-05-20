import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}

export function EmptyState({ message, ctaLabel, ctaHref, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12 px-4 text-center", className)}>
      <span
        className="font-mono text-5xl font-medium leading-none select-none"
        style={{ color: "var(--color-muted)" }}
      >
        —
      </span>
      <p className="text-sm" style={{ color: "var(--color-secondary)" }}>
        {message}
      </p>
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          className="text-sm underline underline-offset-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--color-accent)" }}
        >
          {ctaLabel} ↗
        </a>
      )}
    </div>
  );
}
