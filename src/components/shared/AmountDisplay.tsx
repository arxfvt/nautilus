import { formatAmount } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface AmountDisplayProps {
  amount: number;       // minor units
  currency: string;
  type?: "income" | "expense" | "transfer" | "neutral";
  size?: "sm" | "md" | "lg" | "xl";
  showSign?: boolean;
  className?: string;
}

const sizeClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

export function AmountDisplay({
  amount,
  currency,
  type = "neutral",
  size = "md",
  showSign = true,
  className,
}: AmountDisplayProps) {
  const formatted = formatAmount(Math.abs(amount), currency);
  const sign = showSign && type !== "neutral" && type !== "transfer"
    ? type === "income" ? "+" : "-"
    : "";

  const colorStyle =
    type === "income"
      ? { color: "var(--color-income)" }
      : type === "expense"
      ? { color: "var(--color-expense)" }
      : type === "transfer"
      ? { color: "var(--color-transfer)" }
      : { color: "var(--color-primary)" };

  return (
    <span
      className={cn("font-mono font-medium", sizeClass[size], className)}
      style={colorStyle}
    >
      {sign}{formatted}
    </span>
  );
}
