export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface-raised ${className}`} role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${clamped}%` }} />
    </div>
  );
}
