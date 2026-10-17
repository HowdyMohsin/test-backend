import type { InputHTMLAttributes } from "react";

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/30" {...props} />;
}
