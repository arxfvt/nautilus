import { cn } from "@/lib/utils";

interface SkeletonBarProps {
  className?: string;
}

export function SkeletonBar({ className }: SkeletonBarProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md h-4", className)}
      style={{ background: "var(--color-subtle)" }}
    />
  );
}

export function SkeletonTransactionRow() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <div className="w-0.5 self-stretch rounded-full" style={{ background: "var(--color-subtle)" }} />
      <SkeletonBar className="w-5 h-5 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <SkeletonBar className="w-32 h-3.5" />
        <SkeletonBar className="w-16 h-2.5" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <SkeletonBar className="w-20 h-3.5" />
        <SkeletonBar className="w-10 h-2.5" />
      </div>
    </div>
  );
}
