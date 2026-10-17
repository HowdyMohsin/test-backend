"use client";
import type { ReactNode } from "react";

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-text/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-72 overflow-y-auto border-l border-border bg-surface p-4 shadow-xl">
        {children}
      </div>
    </div>
  );
}
