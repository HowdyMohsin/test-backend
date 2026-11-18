import type { Faq } from "@/content/types";

export function PairFaq({ items, title }: { items: Faq[]; title: string }) {
  return (
    <section aria-labelledby="pairfaq">
      <h2 id="pairfaq" className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {items.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {f.q}<span className="text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-2 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
