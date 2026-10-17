/** Human-readable byte sizes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** "5/25 used today, resets in 7h" helper. */
export function hoursUntilReset(resetsAtIso: string): number {
  const ms = new Date(resetsAtIso).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 3_600_000));
}

/** Percent saved, e.g. 62 for a 62% smaller file. Null when not comparable. */
export function savingsPercent(before: number, after: number): number | null {
  if (!before || !after || after >= before) return null;
  return Math.round((1 - after / before) * 100);
}
