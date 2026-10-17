import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border px-5 py-4">
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
    </div>
  );
}
