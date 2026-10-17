"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/types";
import { IconAlert, IconSpinner } from "./icons";

/* ---------- layout primitives ---------- */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-panel ${className}`}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h2 className="font-display text-sm font-semibold tracking-wide text-paper">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-mist">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-paper">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mist">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/* ---------- form controls ---------- */

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "subtle";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-acid text-ink hover:bg-aciddim font-semibold"
      : variant === "danger"
        ? "bg-ember/15 text-ember border border-ember/40 hover:bg-ember/25"
        : variant === "subtle"
          ? "bg-panel2 text-paper border border-line hover:border-mist/40"
          : "text-mist hover:text-paper hover:bg-white/5";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-mist/50 outline-none focus:border-acid/60 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-paper placeholder:text-mist/50 outline-none focus:border-acid/60 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-acid/60 ${props.className ?? ""}`}
    >
      {props.children}
    </select>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-mist">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
        checked ? "bg-acid" : "bg-white/15"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-ink transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ---------- data display ---------- */

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/8 text-mist border-white/10",
    good: "bg-acid/12 text-acid border-acid/30",
    warn: "bg-amber-400/12 text-amber-300 border-amber-400/30",
    bad: "bg-ember/12 text-ember border-ember/30",
    info: "bg-cyanx/12 text-cyanx border-cyanx/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-mist">
      <IconSpinner className="spin h-5 w-5 text-acid" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-sm font-medium text-paper">{title}</p>
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  const api = error instanceof ApiError ? error : null;
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ember/12">
        <IconAlert className="h-5 w-5 text-ember" />
      </div>
      <p className="text-sm font-semibold text-paper">Something went wrong</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-mist">{error.message}</p>
      {api && api.code === "forbidden" && (
        <p className="mt-1 text-xs text-mist">
          Your admin account does not have access to this section.
        </p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button variant="subtle" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------- modal ---------- */

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className={`relative max-h-[85vh] w-full overflow-y-auto scroll-thin rounded-xl border border-line bg-panel shadow-deck ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-display text-sm font-semibold text-paper">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-lg leading-none text-mist hover:bg-white/5 hover:text-paper"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------- data-fetch hook ---------- */

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => setData(d))
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

export function LoadGate<T>({
  state,
  children,
  loadingLabel,
}: {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
  loadingLabel?: string;
}) {
  if (state.loading) return <Spinner label={loadingLabel} />;
  if (state.error)
    return (
      <Card>
        <ErrorState error={state.error} onRetry={state.reload} />
      </Card>
    );
  if (state.data === null)
    return (
      <Card>
        <EmptyState title="No data" />
      </Card>
    );
  return <>{children(state.data)}</>;
}
