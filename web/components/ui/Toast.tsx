"use client";
import { useEffect } from "react";

export interface ToastData {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2" role="status">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-lg">
        <span className="text-sm text-text">{toast.message}</span>
        {toast.actionLabel && toast.onAction && (
          <button onClick={() => { toast.onAction?.(); onDismiss(); }} className="text-sm font-semibold text-primary hover:underline">
            {toast.actionLabel}
          </button>
        )}
        <button onClick={onDismiss} className="text-text-muted hover:text-text" aria-label="Dismiss">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
        </button>
      </div>
    </div>
  );
}
