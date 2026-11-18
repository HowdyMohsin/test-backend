import type { ReactNode } from "react";

export function Chip({ children, active, onClick, tone = "neutral" }: { children: ReactNode; active?: boolean; onClick?: () => void; tone?: "neutral" | "accent" }) {
  const base = "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors";
  const look = active
    ? "border-primary bg-primary text-primary-ink"
    : tone === "accent"
      ? "border-transparent bg-accent-soft text-primary"
      : "border-line bg-surface text-ink hover:border-accent";
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${base} ${look}`}>
      {children}
    </button>
  ) : (
    <span className={`${base} ${look}`}>{children}</span>
  );
}
