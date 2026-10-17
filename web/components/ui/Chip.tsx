import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Chip({
  active,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-text-muted hover:border-accent hover:text-text"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
