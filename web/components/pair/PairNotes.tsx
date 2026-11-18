import { Info } from "lucide-react";

export function PairNotes({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <section aria-labelledby="notes" className="rounded-[var(--radius-card)] border border-line bg-surface-2/60 p-5">
      <h2 id="notes" className="text-lg font-bold">Good to know</h2>
      <ul className="mt-3 space-y-2.5">
        {notes.map((n) => (
          <li key={n} className="flex gap-2.5 text-sm text-muted"><Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{n}</li>
        ))}
      </ul>
    </section>
  );
}
