import type { ReactNode } from "react";

export function Tooltip({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-48 -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text shadow-lg group-hover:block">
        {tip}
      </span>
    </span>
  );
}
