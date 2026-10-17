import type { ReactNode } from "react";

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p className="font-medium text-text">{title}</p>
      {hint && <p className="mt-1 text-sm text-text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <p className="font-medium text-danger">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-semibold text-primary hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}
