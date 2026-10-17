import { errorMessage } from "@/lib/api/client";

/** Friendly error box. Backend message text is shown as-is (per error code). */
export function ErrorBox({
  error,
  onRetry,
  onDismiss,
  title,
}: {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  title?: string;
}) {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-danger/40 bg-danger/5 p-4" role="alert">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-danger">{title ?? "Something went wrong"}</p>
          <p className="mt-1 text-sm text-text">{errorMessage(error)}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-raised"
            aria-label="Dismiss error"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-danger px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Retry
        </button>
      )}
    </div>
  );
}
