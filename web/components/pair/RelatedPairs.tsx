import Link from "next/link";
import type { PairInfo } from "@/lib/types";

export function RelatedPairs({ pairs, from }: { pairs: PairInfo[]; from: string }) {
  return (
    <section aria-labelledby="related">
      <h2 id="related" className="text-xl font-bold tracking-tight">Related converters</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map((p) => (
          <li key={p.slug}><Link href={`/convert/${p.slug}`} className="block rounded-xl border border-line bg-surface px-4 py-3 font-semibold hover:border-accent">{p.from.toUpperCase()} <span className="text-muted">to</span> {p.to.toUpperCase()}</Link></li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">More from {from.toUpperCase()}: see the full list in the footer.</p>
    </section>
  );
}
